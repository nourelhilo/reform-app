import { useState, useEffect, useRef, useCallback } from 'react';

const defaultSocket = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws/workout`
  : 'ws://localhost:8000/ws/workout';
const AI_WS_URL = import.meta.env.VITE_AI_ENGINE_WS_URL || defaultSocket;
const MAX_IN_FLIGHT = 2;
const waiting = {
  phase: 'idle', confidence: 0, activeJoints: [], faultJoints: [], landmarks: null, exerciseMetrics: {},
  visibility: { status: 'waiting', is_valid: false, message: 'Waiting for the camera.' },
};

export function useWorkoutSocket(exercise, { paused = false, voice = false, voiceCooldown = 3, ignoreReps = false } = {}) {
  const [frame, setFrame] = useState(waiting);
  const [connection, setConnection] = useState('connecting');
  const [reps, setReps] = useState([]);
  const [readyFrames, setReadyFrames] = useState(0);
  const socket = useRef(null);
  const inFlight = useRef(0);
  const armDeadline = useRef(null);
  const mode = useRef({ paused, voice, voiceCooldown, ignoreReps });
  const lastSpoken = useRef(-Infinity);
  mode.current = { paused, voice, voiceCooldown, ignoreReps };

  useEffect(() => {
    let stopped = false;
    let retry;
    let timeout;
    let stale;
    let ws;
    setReps([]);
    setReadyFrames(0);
    setFrame(waiting);
    setConnection('connecting');

    const open = () => {
      const url = new URL(AI_WS_URL);
      url.searchParams.set('exercise', exercise);
      ws = new WebSocket(url);
      socket.current = ws;
      ws.onopen = () => { if (!stopped) setConnection('connected'); };
      ws.onmessage = ({ data }) => {
        if (stopped) return;
        clearTimeout(timeout);
        inFlight.current = Math.max(0, inFlight.current - 1);
        if (inFlight.current) armDeadline.current?.();
        let result;
        try { result = JSON.parse(data); } catch { return; }
        if (result.exercise !== exercise || !result.visibility) return;
        // During a countdown or rest the camera keeps tracking position, but reps don't count.
        if (result.repCompleted && result.lastRepDetail && !mode.current.ignoreReps) {
          setReps(history => [...history, { ...result.lastRepDetail, repNumber: history.length + 1 }]);
        }
        if (mode.current.paused) return;
        setFrame(result);
        setReadyFrames(count => result.visibility.is_valid ? Math.min(count + 1, 3) : 0);
        clearTimeout(stale);
        stale = setTimeout(() => {
          setReadyFrames(0);
          setFrame(waiting);
        }, 1100);
        const now = performance.now();
        if (mode.current.voice && !mode.current.ignoreReps && result.speechCue && window.speechSynthesis &&
            now - lastSpoken.current >= mode.current.voiceCooldown * 1000) {
          lastSpoken.current = now;
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.speechCue));
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (stopped) return;
        clearTimeout(timeout);
        clearTimeout(stale);
        inFlight.current = 0;
        setConnection('offline');
        setFrame(waiting);
        setReadyFrames(0);
        retry = setTimeout(open, 2500);
      };
      armDeadline.current = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => ws.close(), 5000);
      };
    };
    // The first Strict Mode setup is disposed before opening a camera socket.
    retry = setTimeout(() => {
      try { open(); } catch { setConnection('offline'); }
    }, 0);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(timeout);
      clearTimeout(stale);
      inFlight.current = 0;
      armDeadline.current = null;
      socket.current = null;
      ws?.close();
      if (mode.current.voice) window.speechSynthesis?.cancel();
    };
  }, [exercise]);

  useEffect(() => {
    if (!voice || paused) window.speechSynthesis?.cancel();
    if (paused) {
      setFrame(waiting);
      setReadyFrames(0);
      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: 'pause' }));
      }
    }
  }, [paused, voice]);

  // Keep two frames in flight so the server is never idle waiting for the
  // network (~4 → ~7 frames a second on the live service). Extra frames are
  // dropped rather than queued, so feedback never lags behind the camera.
  const sendFrame = useCallback((blob) => {
    if (mode.current.paused || socket.current?.readyState !== WebSocket.OPEN) return;
    if (inFlight.current >= MAX_IN_FLIGHT || !armDeadline.current) return;
    socket.current.send(blob);
    armDeadline.current();
    inFlight.current += 1;
  }, []);

  // Drop any rep the server has half-tracked, e.g. when a set starts after a countdown.
  const interrupt = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'pause' }));
  }, []);

  const formScore = reps.length ? Math.round(reps.reduce((sum, rep) => sum + rep.formScore, 0) / reps.length) : null;
  // formScore here averages counted reps; holds report their own score from the server.
  return { ...frame, serverFormScore: frame.formScore ?? null, connection, readyFrames, sendFrame, interrupt, reps, formScore };
}
