import { useState, useEffect, useRef, useCallback } from 'react';

const defaultSocket = window.location.protocol === 'https:'
  ? `wss://${window.location.host}/ws/workout`
  : 'ws://localhost:8000/ws/workout';
const AI_WS_URL = import.meta.env.VITE_AI_ENGINE_WS_URL || defaultSocket;
const waiting = {
  phase: 'idle', confidence: 0, activeJoints: [], landmarks: null, exerciseMetrics: {},
  visibility: { status: 'waiting', is_valid: false, message: 'Waiting for the camera.' },
};

export function useWorkoutSocket(exercise, { paused = false, voice = false, voiceCooldown = 3 } = {}) {
  const [frame, setFrame] = useState(waiting);
  const [connection, setConnection] = useState('connecting');
  const [reps, setReps] = useState([]);
  const [readyFrames, setReadyFrames] = useState(0);
  const socket = useRef(null);
  const inFlight = useRef(false);
  const armDeadline = useRef(null);
  const mode = useRef({ paused, voice, voiceCooldown });
  const lastSpoken = useRef(-Infinity);
  mode.current = { paused, voice, voiceCooldown };

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
        inFlight.current = false;
        let result;
        try { result = JSON.parse(data); } catch { return; }
        if (result.exercise !== exercise || !result.visibility) return;
        if (result.repCompleted && result.lastRepDetail) {
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
        if (mode.current.voice && result.speechCue && window.speechSynthesis &&
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
        inFlight.current = false;
        setConnection('offline');
        setFrame(waiting);
        setReadyFrames(0);
        retry = setTimeout(open, 2500);
      };
      armDeadline.current = () => {
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
      inFlight.current = false;
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

  // Allow one frame in flight; discard obsolete frames rather than queue them.
  const sendFrame = useCallback((blob) => {
    if (mode.current.paused || socket.current?.readyState !== WebSocket.OPEN) return;
    if (inFlight.current || !armDeadline.current) return;
    socket.current.send(blob);
    armDeadline.current();
    inFlight.current = true;
  }, []);

  const formScore = reps.length ? Math.round(reps.reduce((sum, rep) => sum + rep.formScore, 0) / reps.length) : null;
  return { ...frame, connection, readyFrames, sendFrame, reps, formScore };
}
