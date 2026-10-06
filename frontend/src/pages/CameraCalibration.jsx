import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Camera, ArrowRight, User } from 'lucide-react';

const CHECK_INTERVAL_MS = 800;

export const CameraCalibration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const exercises = location.state?.exercises || ['squat'];

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('requesting');
  const [checks, setChecks] = useState({
    cameraConnected: { status: 'pending', label: 'Camera connected' },
    personDetected: { status: 'pending', label: 'Person detected' },
    fullBodyVisible: { status: 'pending', label: 'Full body visible' },
    trackingReady: { status: 'pending', label: 'Tracking stable' },
  });
  const [allPassed, setAllPassed] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const wsRef = useRef(null);
  const frameTimerRef = useRef(null);

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraStatus('ready');
            setChecks(prev => ({
              ...prev,
              cameraConnected: { ...prev.cameraConnected, status: 'pass' }
            }));
          };
        }
      } catch (err) {
        setCameraStatus('denied');
        setChecks(prev => ({
          ...prev,
          cameraConnected: { ...prev.cameraConnected, status: 'fail' }
        }));
      }
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Connect to AI engine for calibration checks
  useEffect(() => {
    if (cameraStatus !== 'ready') return;

    const aiUrl = (import.meta.env.VITE_AI_ENGINE_WS_URL || 'ws://localhost:8000/ws/workout') + '?exercise=squat&auto_detect=false';

    try {
      const ws = new WebSocket(aiUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('connected');
      ws.onerror = () => setWsStatus('error');
      ws.onclose = () => setWsStatus('closed');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const vis = data.visibility;
        if (!vis) return;

        setChecks(prev => ({
          ...prev,
          personDetected: {
            ...prev.personDetected,
            status: vis.status !== 'no_person' ? 'pass' : 'fail'
          },
          fullBodyVisible: {
            ...prev.fullBodyVisible,
            status: vis.is_valid ? 'pass' : vis.status === 'partial_body' ? 'fail' : 'checking'
          },
          trackingReady: {
            ...prev.trackingReady,
            status: vis.is_valid && vis.overall_confidence >= 0.7 ? 'pass' : 'checking'
          },
        }));
      };
    } catch (e) {
      setWsStatus('error');
    }
  }, [cameraStatus]);

  // Frame capture loop
  useEffect(() => {
    if (cameraStatus !== 'ready' || wsStatus !== 'connected') return;

    frameTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 240);
      canvas.toBlob(blob => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob);
        }
      }, 'image/jpeg', 0.6);
    }, CHECK_INTERVAL_MS);

    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, [cameraStatus, wsStatus]);

  // Check if all passed
  useEffect(() => {
    const allPass = Object.values(checks).every(c => c.status === 'pass');
    setAllPassed(allPass);
  }, [checks]);

  const handleStart = () => {
    if (wsRef.current) wsRef.current.close();
    navigate('/workout/active', { state: { exercises } });
  };

  const statusIcon = (status) => {
    if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (status === 'fail') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <Loader2 className="w-5 h-5 text-text-muted animate-spin" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 pb-6 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Setup</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">Camera Check</h1>
        <p className="text-xs text-text-muted mt-1.5">Stand where your whole body is visible. Once your position is steady, you can begin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <div className="relative rounded-2xl overflow-hidden border border-border-subtle bg-surface aspect-video flex items-center justify-center">
          <canvas ref={canvasRef} className="hidden" />
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover -scale-x-100 ${cameraStatus === 'ready' ? 'block' : 'hidden'}`}
          />
          {cameraStatus !== 'ready' && (
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <Camera className="w-12 h-12 animate-pulse text-accent" />
              <p className="text-xs">
                {cameraStatus === 'requesting' ? 'Requesting camera access...' : 'Camera access denied.'}
              </p>
            </div>
          )}
          {/* Live indicator */}
          {cameraStatus === 'ready' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-full text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white">CALIBRATING</span>
            </div>
          )}
        </div>

        {/* Checks Panel */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="space-y-4 mb-8">
              {Object.entries(checks).map(([key, check]) => (
                <div key={key} className="flex items-center gap-4 bg-surface border border-border-subtle rounded-xl p-4">
                  {statusIcon(check.status)}
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{check.label}</p>
                    <p className="text-xs text-text-muted">
                      {check.status === 'pass' ? 'Verified' :
                       check.status === 'fail' ? 'Not satisfied — adjust position' :
                       'Checking...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {wsStatus === 'error' && (
              <div className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                AI Engine unavailable at port 8000. Tracking cannot be verified — you may still proceed manually.
              </div>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={!allPassed && wsStatus !== 'error'}
            className="inline-flex items-center justify-center gap-3 w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs px-8 py-4 rounded-xl transition-all shadow-lg shadow-accent/20 tracking-wider uppercase font-mono"
          >
            {allPassed ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
            {allPassed ? 'Start Workout' : wsStatus === 'error' ? 'Start Anyway (AI Offline)' : 'Waiting for detection...'}
          </button>
        </div>
      </div>
    </div>
  );
};
