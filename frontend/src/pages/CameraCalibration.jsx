import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Circle, ScanLine, WifiOff } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useAuth } from '../hooks/useAuth';
import { exercises, getExerciseList } from '../services/exercises';

const HOLD_SECONDS = 2;

// Hands-free: once the required joints stay in view, the workout starts by
// itself after a short countdown. Stepping out of view cancels it.
export function CameraCalibration() {
  const { mongoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const list = getExerciseList(location.state?.exercises);
  const plan = location.state?.plan;
  const [camera, setCamera] = useState('requesting');
  const { readyFrames, connection, visibility, landmarks, activeJoints, sendFrame } = useWorkoutSocket(list[0]);
  const exercise = exercises[list[0]];
  const ready = camera === 'ready' && connection === 'connected' && readyFrames >= 3;
  const [hold, setHold] = useState(HOLD_SECONDS);
  const start = () => navigate('/workout/active', { state: { exercises: list, plan } });

  useEffect(() => {
    if (!ready) { setHold(HOLD_SECONDS); return; }
    if (hold <= 0) { start(); return; }
    const timer = setTimeout(() => setHold(left => left - 1), 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hold]);

  const hint = connection === 'offline' ? 'Tracking is offline. Reconnecting…'
    : ready ? `In position. Starting in ${hold}…`
    : camera === 'ready' && connection === 'connected' ? visibility.message : 'Waiting for detection…';

  return <div className="fs-stage">
    <CameraView onStatus={setCamera} onFrameCapture={sendFrame} targetFps={8}
      landmarks={mongoUser?.preferences?.showSkeletonOverlay !== false ? landmarks : null} activeJoints={activeJoints} />
    {ready && <div className="camera-overlay soft" role="timer" aria-live="assertive">
      <strong>{hold || 'Go'}</strong><span>Hold still. Your workout starts automatically.</span></div>}

    <header className="hud-top">
      <Link to="/workout/setup" state={{ exercises: list, plan }} className="hud-back"><ArrowLeft size={16}/> Change exercises</Link>
      <div className="hud-kicker">Camera check</div>
    </header>

    <aside className="hud-panel">
      <div className="studio-kicker">{exercise.view.toUpperCase()}</div>
      <h2>{exercise.name}</h2>
      <p className="hud-cue">{exercise.guide} Then stand in the start position. You don’t need to come back to the screen.</p>
      <div className="camera-checks">
        {[[camera === 'ready', 'Camera connected'], [connection === 'connected', 'Tracking service connected'], [ready, 'Required joints in view']].map(([pass, label]) =>
          <div key={label}>{pass ? <Check size={16} className="text-accent"/> : <Circle size={13}/>} {label}</div>)}
      </div>
      <div className="camera-hint" role="status">
        {connection === 'offline' ? <WifiOff size={16}/> : <ScanLine size={16}/>}{hint}
      </div>
      <button className="studio-button subtle w-full" disabled={camera !== 'ready' || connection !== 'connected'} onClick={start}>
        Start now <ArrowRight size={18}/>
      </button>
      <p className="studio-caption"><Camera size={15}/> Camera frames are sent to the pose tracking service during setup and training.</p>
    </aside>
  </div>;
}
