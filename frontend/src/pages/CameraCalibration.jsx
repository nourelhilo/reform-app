import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Circle, ScanLine, WifiOff } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useAuth } from '../hooks/useAuth';
import { exercises, getExerciseList } from '../services/exercises';

export function CameraCalibration() {
  const { mongoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const list = getExerciseList(location.state?.exercises);
  const [camera, setCamera] = useState('requesting');
  const { readyFrames, connection, visibility, landmarks, activeJoints, sendFrame } = useWorkoutSocket(list[0]);
  const exercise = exercises[list[0]];
  const ready = camera === 'ready' && connection === 'connected' && readyFrames >= 3;

  return <div className="studio-wrap">
    <Link to="/workout/setup" state={{ exercises: list }} className="studio-back"><ArrowLeft size={16}/> Change exercises</Link>
    <div className="studio-heading">
      <div className="studio-kicker">Setup</div>
      <h1>Camera Check</h1>
    </div>
    <div className="studio-layout camera-layout">
      <div><CameraView onStatus={setCamera} onFrameCapture={sendFrame} targetFps={6}
        landmarks={mongoUser?.preferences?.showSkeletonOverlay !== false ? landmarks : null} activeJoints={activeJoints}/></div>
      <aside className="studio-panel camera-instructions">
        <div className="studio-kicker">{exercise.view.toUpperCase()}</div>
        <h2>{exercise.name}</h2>
        <p>{exercise.guide}</p>
        <div className="camera-checks">
          {[[camera === 'ready', 'Camera connected'], [connection === 'connected', 'Tracking service connected'], [ready, 'Required joints in view']].map(([pass, label]) =>
            <div key={label}>{pass ? <Check size={16} className="text-accent"/> : <Circle size={13}/>} {label}</div>)}
        </div>
        <div className="camera-hint" role="status">
          {connection === 'offline' ? <WifiOff size={16}/> : <ScanLine size={16}/>}
          {connection === 'offline' ? 'Tracking is offline. Reconnecting…' : ready ? 'Tracking stable' : camera === 'ready' && connection === 'connected' ? visibility.message : 'Waiting for detection…'}
        </div>
        <button className="studio-button start-workout w-full" disabled={!ready} onClick={() => navigate('/workout/active', { state: { exercises: list } })}>
          Start Workout <ArrowRight size={18}/>
        </button>
        <p className="studio-caption"><Camera size={15}/> Camera frames are sent to the pose tracking service during setup and training.</p>
      </aside>
    </div>
  </div>;
}
