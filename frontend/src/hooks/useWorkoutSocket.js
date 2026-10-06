import { useState, useEffect, useRef, useCallback } from 'react';

const AI_WS_URL = import.meta.env.VITE_AI_ENGINE_WS_URL || 'ws://localhost:8000/ws/workout';

export const useWorkoutSocket = (initialExercise = 'squat', autoDetect = false, enableVoice = true) => {
  const [exercise, setExerciseState] = useState(initialExercise);
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [formScore, setFormScore] = useState(100);
  const [instantScore, setInstantScore] = useState(100);
  const [confidence, setConfidence] = useState(1.0);
  const [feedback, setFeedback] = useState('Position yourself in view of the camera.');
  const [visibility, setVisibility] = useState({ status: 'connecting', is_valid: false, message: 'Connecting to AI Engine...' });
  const [landmarks, setLandmarks] = useState(null);
  const [activeJoints, setActiveJoints] = useState([]);
  const [exerciseMetrics, setExerciseMetrics] = useState({});
  const [devMetrics, setDevMetrics] = useState({ fps: 0, poseLatencyMs: 0, inferenceLatencyMs: 0, totalLatencyMs: 0, wsLatencyMs: 0 });
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [repAnimation, setRepAnimation] = useState(false);
  const [completedRepsHistory, setCompletedRepsHistory] = useState([]);

  const socketRef = useRef(null);
  const sendPingTimeRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Spoken feedback helper
  const speakCue = useCallback((text) => {
    if (!enableVoice || !text || !('speechSynthesis' in window)) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [enableVoice]);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `${AI_WS_URL}?exercise=${exercise}&auto_detect=${autoDetect}`;
    console.log(`[WebSocket] Connecting to AI Engine at ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('[WebSocket] Connected to AI Engine.');
      };

      ws.onmessage = (event) => {
        const tReceive = performance.now();
        const wsLatency = sendPingTimeRef.current > 0 ? Math.round(tReceive - sendPingTimeRef.current) : 5;

        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            console.warn('[AI Engine Message]', data.error);
            return;
          }

          if (data.exercise) setExerciseState(data.exercise);
          if (data.rep !== undefined) {
            if (data.repCompleted) {
              setRepAnimation(true);
              setTimeout(() => setRepAnimation(false), 900);
              if (data.lastRepDetail) {
                setCompletedRepsHistory(prev => [...prev, data.lastRepDetail]);
              }
            }
            setRepCount(data.rep);
          }
          if (data.phase) setPhase(data.phase);
          if (data.formScore !== undefined) setFormScore(data.formScore);
          if (data.instantScore !== undefined) setInstantScore(data.instantScore);
          if (data.confidence !== undefined) setConfidence(data.confidence);
          if (data.feedback) setFeedback(data.feedback);
          if (data.visibility) setVisibility(data.visibility);
          if (data.landmarks !== undefined) setLandmarks(data.landmarks);
          if (data.activeJoints) setActiveJoints(data.activeJoints);
          if (data.exerciseMetrics) setExerciseMetrics(data.exerciseMetrics);

          // Audio coaching trigger
          if (data.speechCue) {
            speakCue(data.speechCue);
          }

          if (data.metrics) {
            setDevMetrics({
              ...data.metrics,
              wsLatencyMs: wsLatency,
            });
          }
        } catch (err) {
          console.error('[WebSocket Parse Error]', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[WebSocket Error]', err);
        setIsConnected(false);
        setConnectionError('AI Vision Engine is unreachable. Make sure ai-engine is running on port 8000.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[WebSocket] Connection closed. Attempting reconnect in 3s...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    } catch (e) {
      setConnectionError(e.message);
      setIsConnected(false);
    }
  }, [exercise, autoDetect, speakCue]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Send binary image frame from Canvas/Webcam to AI Engine
  const sendFrame = useCallback((blobOrBase64) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    sendPingTimeRef.current = performance.now();

    if (typeof blobOrBase64 === 'string') {
      socketRef.current.send(JSON.stringify({ type: 'frame', frame: blobOrBase64 }));
    } else {
      socketRef.current.send(blobOrBase64);
    }
  }, []);

  const changeExercise = useCallback((newEx) => {
    setExerciseState(newEx);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'set_exercise', exercise: newEx, auto_detect: autoDetect }));
    }
  }, [autoDetect]);

  const resetSession = useCallback(() => {
    setRepCount(0);
    setCompletedRepsHistory([]);
    setFormScore(100);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'reset' }));
    }
  }, []);

  return {
    exercise,
    repCount,
    phase,
    formScore,
    instantScore,
    confidence,
    feedback,
    visibility,
    landmarks,
    activeJoints,
    exerciseMetrics,
    devMetrics,
    isConnected,
    connectionError,
    repAnimation,
    completedRepsHistory,
    sendFrame,
    changeExercise,
    resetSession,
  };
};
