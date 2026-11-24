import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Pause, Play, ScanLine, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useAuth } from '../hooks/useAuth';
import { exercises, getExerciseList, getPlan } from '../services/exercises';
import { api } from '../services/api';

const displayTime = seconds => [Math.floor(seconds / 60), seconds % 60].map(i => String(i).padStart(2, '0')).join(':');
const average = reps => reps.length ? Math.round(reps.reduce((sum, rep) => sum + rep.formScore, 0) / reps.length) : 0;
const say = (enabled, text) => {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
};
const repTip = rep => rep?.faults?.[0]?.cue || rep?.feedbackGiven?.[0] || 'Clean rep. Keep it up.';

// stage: countdown → active → (rest → countdown → active)… → done
function WorkoutSet({ id, index, list, plan, onAdvance, onFinish, voice, setVoice, showSkeleton, saving }) {
  const movement = exercises[id];
  const [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState('requesting');
  const [stage, setStage] = useState('countdown');
  const [count, setCount] = useState(3);
  const [restLeft, setRestLeft] = useState(plan.restSeconds);
  const [setStarts, setSetStarts] = useState([0]);
  const [seconds, setSeconds] = useState(0);
  const elapsed = useRef(0);
  const started = useRef(null);
  const dialog = useRef(null);
  const holding = stage !== 'active';
  const tracking = useWorkoutSocket(id, { paused: paused || saving || holding, voice });
  const ready = tracking.visibility.is_valid && camera === 'ready';
  const timerOn = !paused && !saving && ready && stage === 'active';
  const setIndex = setStarts.length - 1;
  const setReps = tracking.reps.length - setStarts[setIndex];
  const lastRep = tracking.reps[tracking.reps.length - 1];

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

  // 3-2-1 before each set, once the camera is live.
  useEffect(() => {
    if (stage !== 'countdown' || paused || camera !== 'ready') return;
    say(voice, count ? String(count) : 'Go');
    const timer = setTimeout(() => {
      if (count > 0) setCount(count - 1);
      else setStage('active');
    }, count ? 1000 : 500);
    return () => clearTimeout(timer);
  }, [stage, count, paused, camera, voice]);

  // Rest timer between sets.
  useEffect(() => {
    if (stage !== 'rest' || paused) return;
    if (restLeft <= 0) {
      setCount(3);
      setStage('countdown');
      return;
    }
    const timer = setTimeout(() => setRestLeft(left => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, restLeft, paused]);

  // Finish the set when the target reps are reached.
  useEffect(() => {
    if (stage !== 'active' || setReps < plan.repsPerSet) return;
    if (setIndex + 1 < plan.sets) {
      setSetStarts(starts => [...starts, tracking.reps.length]);
      setRestLeft(plan.restSeconds);
      setStage('rest');
    } else {
      setStage('done');
    }
  }, [stage, setReps, setIndex, plan, tracking.reps.length]);

  // Announce after the tracking hook's pause effect, which cancels queued speech.
  useEffect(() => {
    if (stage === 'rest') say(voice, `Set ${setIndex} done. Rest.`);
    if (stage === 'done') say(voice, `${movement.name} complete.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const record = () => {
    const sets = setStarts.map((start, i) => {
      const reps = tracking.reps.slice(start, setStarts[i + 1] ?? tracking.reps.length);
      return { setNumber: i + 1, reps: reps.length, averageFormScore: average(reps) };
    }).filter(set => set.reps > 0);
    return {
      exerciseName: id, totalReps: tracking.reps.length, validReps: tracking.reps.length,
      averageFormScore: tracking.formScore ?? 0, plannedSets: plan.sets, repsPerSet: plan.repsPerSet, sets,
      durationSeconds: Math.round((elapsed.current + (started.current === null ? 0 : performance.now() - started.current)) / 1000),
      reps: tracking.reps, keyFeedback: [...new Set(tracking.reps.flatMap(rep => rep.feedbackGiven || []))],
    };
  };
  const angle = tracking.exerciseMetrics[movement.key];
  const status = paused ? 'Paused' : stage === 'rest' ? 'Resting' : stage === 'done' ? 'Complete' :
    stage === 'countdown' ? 'Get ready' : tracking.connection === 'offline' ? 'Offline' : ready ? 'Tracking' : 'Waiting for position';
  const message = paused ? 'Resume when you’re ready.' : stage === 'rest' ? 'Shake it out and breathe.' :
    stage === 'done' ? 'All sets done. Move on when you’re ready.' : stage === 'countdown' ? movement.guide :
    tracking.connection === 'offline' ? 'Tracking connection lost. Reconnecting…' :
    camera !== 'ready' ? 'Connect your camera to begin tracking.' : ready ? tracking.feedback : movement.guide;
  const isLast = index + 1 >= list.length;

  return <>
    <div className="training-heading">
      <div><div className="studio-kicker">Current Exercise</div><h1>{movement.name}</h1></div>
      <div className="training-controls">
        <span className="training-time">{displayTime(seconds)}</span>
        <button className="studio-button subtle compact" aria-label={voice ? 'Mute voice coaching' : 'Enable voice coaching'} aria-pressed={voice} onClick={() => setVoice(!voice)}>
          {voice ? <Volume2 size={18}/> : <VolumeX size={18}/>}
        </button>
        <button className="studio-button subtle compact" onClick={() => setPaused(!paused)} disabled={saving || stage === 'done'}>
          {paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="studio-button subtle compact" onClick={() => dialog.current.showModal()} disabled={saving}><Square size={15}/> End</button>
      </div>
    </div>
    <div className="studio-layout camera-layout">
      <div>
        <div className="relative">
          <CameraView onStatus={setCamera} onFrameCapture={paused || saving || holding ? undefined : tracking.sendFrame}
            landmarks={showSkeleton ? tracking.landmarks : null} activeJoints={tracking.activeJoints}
            faultJoints={tracking.faultJoints} />
          {paused ? <div className="camera-pause"><Pause size={27}/> Paused</div>
            : stage === 'countdown' && camera === 'ready' ? <div className="camera-overlay" role="timer" aria-live="assertive">
              <strong>{count || 'Go'}</strong><span>Set {setIndex + 1} of {plan.sets} · get into the start position</span></div>
            : stage === 'rest' ? <div className="camera-overlay" role="timer">
              <span>Rest</span><strong>{displayTime(restLeft)}</strong>
              <span>Next: set {setIndex + 1} of {plan.sets}</span>
              <button className="studio-button subtle compact" onClick={() => setRestLeft(0)}><SkipForward size={15}/> Skip rest</button></div>
            : stage === 'done' ? <div className="camera-overlay"><Check size={44}/><span>{movement.name}: {tracking.reps.length} reps in {setStarts.length} sets</span></div>
            : null}
        </div>
        <ol className="set-steps" aria-label="Workout sequence">{list.map((key, i) =>
          <li key={key} aria-current={i === index ? 'step' : undefined}>{i < index ? <Check size={15}/> : <span>{String(i+1).padStart(2,'0')}</span>}{exercises[key].name}</li>)}</ol>
      </div>
      <aside className="studio-panel live-panel">
        <div className="live-status" data-live={ready && !paused && stage === 'active'}><i/>{status}</div>
        <div className="set-progress">SET {setIndex + 1} / {plan.sets}</div>
        <div className="live-count"><strong>{String(Math.min(setReps, plan.repsPerSet)).padStart(2, '0')}</strong><span>/ {plan.repsPerSet} REPS</span></div>
        <dl className="live-metrics">
          <div><dt>{movement.angle}</dt><dd>{angle == null || paused || holding ? '—' : Math.round(angle) + '°'}</dd></div>
          <div><dt>Form estimate</dt><dd>{tracking.formScore == null ? '—' : tracking.formScore + '%'}</dd></div>
        </dl>
        {lastRep?.grade && <div className="rep-grade" aria-live="polite">
          <b data-grade={lastRep.grade}>{lastRep.grade}</b>
          <p><strong>Rep {tracking.reps.length} · {lastRep.formScore}%</strong><br/>{repTip(lastRep)}</p>
        </div>}
        <div className="camera-hint"><ScanLine size={17}/><div><strong>Coach cue</strong><p>{message}</p></div></div>
        <p className="studio-caption">Rep target: {movement.target}, then return to start. Camera angles are estimates.</p>
        <button className="studio-button w-full" disabled={saving} onClick={() =>
          !isLast ? onAdvance(record()) : dialog.current.showModal()}>
          {saving ? 'Saving Workout…' : !isLast ? `Next: ${exercises[list[index + 1]].name}` : 'End Workout'} <ArrowRight size={18}/>
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
  const plan = getPlan(location.state?.plan);
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
      totalReps: allReps.length, overallFormScore: average(allReps),
      meta: { poseRuleVersion: 3, plan }, exercises: completed, startedAt: startedAt.current, endedAt: new Date().toISOString(),
    };
    let saveStatus = 'empty';
    if (allReps.length) {
      try {
        await api.saveWorkout(workoutData, user);
        saveStatus = user ? 'saved' : 'local';
      }
      catch { saveStatus = 'failed'; }
    }
    navigate('/workout/summary', { state: { workoutData, saveStatus }, replace: true });
  };

  return <div className="studio-wrap workout-wrap">
    <Link to="/workout/setup" className="studio-back sr-only focus:not-sr-only">Start a new session</Link>
    <WorkoutSet key={records.length} id={list[records.length]} index={records.length} list={list} plan={plan}
      onAdvance={record => setRecords(current => [...current, record])} onFinish={finish} voice={voice}
      setVoice={setVoice} showSkeleton={mongoUser?.preferences?.showSkeletonOverlay !== false} saving={saving} />
  </div>;
}
