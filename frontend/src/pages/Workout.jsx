import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Pause, Play, ScanLine, Square, Volume2, VolumeX } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useAuth } from '../hooks/useAuth';
import { exercises, getExerciseList } from '../services/exercises';
import { api } from '../services/api';

const displayTime = seconds => [Math.floor(seconds / 60), seconds % 60].map(i => String(i).padStart(2, '0')).join(':');

function WorkoutSet({ id, index, list, onAdvance, onFinish, voice, setVoice, showSkeleton, saving }) {
  const movement = exercises[id];
  const [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState('requesting');
  const [seconds, setSeconds] = useState(0);
  const elapsed = useRef(0);
  const started = useRef(null);
  const dialog = useRef(null);
  const tracking = useWorkoutSocket(id, { paused: paused || saving, voice });
  const ready = tracking.visibility.is_valid && camera === 'ready';
  const timerOn = !paused && !saving && ready;

  useEffect(() => {
    if (!timerOn) return;
    started.current = performance.now();
    const timer = setInterval(() => setSeconds(Math.floor((elapsed.current + performance.now() - started.current) / 1000)), 200);
    return () => {
      clearInterval(timer);
      elapsed.current += performance.now() - started.current;
      started.current = null;
    };
  }, [timerOn]);

  const record = () => ({
    exerciseName: id, totalReps: tracking.reps.length, validReps: tracking.reps.length,
    averageFormScore: tracking.formScore ?? 0,
    durationSeconds: Math.round((elapsed.current + (started.current === null ? 0 : performance.now() - started.current)) / 1000),
    reps: tracking.reps, keyFeedback: [...new Set(tracking.reps.flatMap(rep => rep.feedbackGiven || []))],
  });
  const angle = tracking.exerciseMetrics[movement.key];
  const status = paused ? 'Paused' : tracking.connection === 'offline' ? 'Offline' : ready ? 'Tracking' : 'Waiting for position';
  const message = paused ? 'Resume when you’re ready.' : tracking.connection === 'offline' ?
    'Tracking connection lost. Reconnecting…' : camera !== 'ready' ? 'Connect your camera to begin tracking.' :
    ready ? tracking.feedback : movement.guide;

  return <>
    <div className="training-heading">
      <div><div className="studio-kicker">Current Exercise</div><h1>{movement.name}</h1></div>
      <div className="training-controls">
        <span className="training-time">{displayTime(seconds)}</span>
        <button className="studio-button subtle compact" aria-label={voice ? 'Mute voice coaching' : 'Enable voice coaching'} aria-pressed={voice} onClick={() => setVoice(!voice)}>
          {voice ? <Volume2 size={18}/> : <VolumeX size={18}/>}
        </button>
        <button className="studio-button subtle compact" onClick={() => setPaused(!paused)} disabled={saving}>
          {paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="studio-button subtle compact" onClick={() => dialog.current.showModal()} disabled={saving}><Square size={15}/> End</button>
      </div>
    </div>
    <div className="studio-layout camera-layout">
      <div>
        <div className="relative">
          <CameraView onStatus={setCamera} onFrameCapture={paused || saving ? undefined : tracking.sendFrame}
            landmarks={showSkeleton ? tracking.landmarks : null} activeJoints={tracking.activeJoints} />
          {paused && <div className="camera-pause"><Pause size={27}/> Paused</div>}
        </div>
        <ol className="set-steps" aria-label="Workout sequence">{list.map((key, i) =>
          <li key={key} aria-current={i === index ? 'step' : undefined}>{i < index ? <Check size={15}/> : <span>{String(i+1).padStart(2,'0')}</span>}{exercises[key].name}</li>)}</ol>
      </div>
      <aside className="studio-panel live-panel">
        <div className="live-status" data-live={ready && !paused}><i/>{status}</div>
        <div className="live-count"><strong>{String(tracking.reps.length).padStart(2, '0')}</strong><span>REPS COUNTED</span></div>
        <dl className="live-metrics">
          <div><dt>{movement.angle}</dt><dd>{angle == null || paused ? '—' : Math.round(angle) + '°'}</dd></div>
          <div><dt>Form estimate</dt><dd>{tracking.formScore == null ? '—' : tracking.formScore + '%'}</dd></div>
        </dl>
        <div className="camera-hint"><ScanLine size={17}/><div><strong>Coach cue</strong><p>{message}</p></div></div>
        <p className="studio-caption">Rep target: {movement.target}, then return to start. Camera angles are estimates.</p>
        <button className="studio-button w-full" disabled={saving} onClick={() =>
          index + 1 < list.length ? onAdvance(record()) : dialog.current.showModal()}>
          {saving ? 'Saving Workout…' : index + 1 < list.length ? `Next: ${exercises[list[index + 1]].name}` : 'End Workout'} <ArrowRight size={18}/>
        </button>
      </aside>
    </div>
    <dialog ref={dialog} className="finish-dialog" aria-labelledby="finish-heading">
      <h2 id="finish-heading">End Workout?</h2>
      <p>You’ll see a summary of the reps tracked so far.</p>
      <div><button className="studio-button subtle" onClick={() => dialog.current.close()}>Continue</button>
        <button className="studio-button" onClick={() => { dialog.current.close(); onFinish(record()); }}>End session</button></div>
    </dialog>
  </>;
}

export function Workout() {
  const { user, mongoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const list = getExerciseList(location.state?.exercises);
  const [records, setRecords] = useState([]);
  const [voiceOverride, setVoice] = useState(null);
  const voice = voiceOverride ?? Boolean(mongoUser?.preferences?.voiceCoaching);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const savingRef = useRef(false);
  const finish = async record => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const completed = [...records, record];
    const allReps = completed.flatMap(ex => ex.reps);
    const workoutData = {
      title: completed.map(ex => exercises[ex.exerciseName].name).join(' + '),
      durationSeconds: completed.reduce((total, ex) => total + ex.durationSeconds, 0),
      totalReps: allReps.length, overallFormScore: allReps.length ?
        Math.round(allReps.reduce((total, rep) => total + rep.formScore, 0) / allReps.length) : 0,
      meta: { poseRuleVersion: 2 }, exercises: completed, startedAt: startedAt.current, endedAt: new Date().toISOString(),
    };
    let saveStatus = 'guest';
    if (user && allReps.length) {
      try { await api.saveWorkout(workoutData, user); saveStatus = 'saved'; }
      catch { saveStatus = 'failed'; }
    } else if (user) saveStatus = 'empty';
    navigate('/workout/summary', { state: { workoutData, saveStatus }, replace: true });
  };

  return <div className="studio-wrap workout-wrap">
    <Link to="/workout/setup" className="studio-back sr-only focus:not-sr-only">Start a new session</Link>
    <WorkoutSet key={records.length} id={list[records.length]} index={records.length} list={list}
      onAdvance={record => setRecords(current => [...current, record])} onFinish={finish} voice={voice}
      setVoice={setVoice} showSkeleton={mongoUser?.preferences?.showSkeletonOverlay !== false} saving={saving} />
  </div>;
}
