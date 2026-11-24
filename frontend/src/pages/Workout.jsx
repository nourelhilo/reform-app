import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Mic, MicOff, Pause, Play, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useVoiceCommands, voiceCommandsSupported } from '../hooks/useVoiceCommands';
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
const AUTO_ADVANCE_SECONDS = 5;
const MIC_KEY = 'reform.voiceCommands';
const readMic = () => { try { return localStorage.getItem(MIC_KEY) === 'on'; } catch { return false; } };

// Everything after "Start" is hands-free: each set starts by itself once you're
// in position, rest counts down, and the next exercise (or the summary) follows
// automatically. Voice commands cover pause/resume/skip/next/end.
// stage: countdown → active → (rest → countdown → active)… → done → next
function WorkoutSet({ id, index, list, plan, onAdvance, onFinish, voice, setVoice, mic, setMic, showSkeleton, saving }) {
  const movement = exercises[id];
  const [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState('requesting');
  const [stage, setStage] = useState('countdown');
  const [count, setCount] = useState(3);
  const [restLeft, setRestLeft] = useState(plan.restSeconds);
  const [nextIn, setNextIn] = useState(AUTO_ADVANCE_SECONDS);
  const [setStarts, setSetStarts] = useState([0]);
  const [seconds, setSeconds] = useState(0);
  const elapsed = useRef(0);
  const started = useRef(null);
  const dialog = useRef(null);
  const done = stage === 'done';
  const tracking = useWorkoutSocket(id, { paused: paused || saving || done, voice, ignoreReps: stage !== 'active' });
  const ready = tracking.visibility.is_valid && camera === 'ready';
  const timerOn = !paused && !saving && ready && stage === 'active';
  const setIndex = setStarts.length - 1;
  const setReps = tracking.reps.length - setStarts[setIndex];
  const lastRep = tracking.reps[tracking.reps.length - 1];
  const isLast = index + 1 >= list.length;

  const record = useCallback(() => {
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
  }, [id, plan, setStarts, tracking.reps, tracking.formScore]);
  const advance = useCallback(() => (isLast ? onFinish : onAdvance)(record()), [isLast, onFinish, onAdvance, record]);

  const commands = useVoiceCommands(mic && !saving, {
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    skip: () => { if (stage === 'rest') setRestLeft(0); },
    next: () => { if (!saving) advance(); },
    end: () => { if (!saving) onFinish(record()); },
  });

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

  // 3-2-1 runs only while you're in view; stepping out restarts it.
  useEffect(() => {
    if (stage !== 'countdown' || paused) return;
    if (!ready) { setCount(3); return; }
    say(voice, count ? String(count) : 'Go');
    const timer = setTimeout(() => {
      if (count > 0) setCount(count - 1);
      else {
        tracking.interrupt();
        setStage('active');
      }
    }, count ? 1000 : 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, count, paused, ready, voice]);

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
      setNextIn(AUTO_ADVANCE_SECONDS);
      setStage('done');
    }
  }, [stage, setReps, setIndex, plan, tracking.reps.length]);

  // Move on by itself after the last set.
  useEffect(() => {
    if (!done || paused || saving) return;
    if (nextIn <= 0) { advance(); return; }
    const timer = setTimeout(() => setNextIn(left => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, nextIn, paused, saving, advance]);

  // Announce after the tracking hook's pause effect, which cancels queued speech.
  useEffect(() => {
    if (stage === 'rest') say(voice, `Set ${setIndex} complete. Rest.`);
    if (stage === 'done') say(voice, isLast ? 'Workout complete.' : `${movement.name} complete. Next, ${exercises[list[index + 1]].name}.`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const angle = tracking.exerciseMetrics[movement.key];
  const status = paused ? 'Paused' : stage === 'rest' ? 'Resting' : done ? 'Complete' :
    stage === 'countdown' ? (ready ? 'Get ready' : 'Step into view') :
    tracking.connection === 'offline' ? 'Offline' : ready ? 'Tracking' : 'Waiting for position';
  const message = paused ? (mic ? 'Say “resume” when you’re ready.' : 'Resume when you’re ready.') :
    stage === 'rest' ? 'Shake it out and breathe.' : done ? 'Nice work.' :
    stage === 'countdown' ? movement.guide :
    tracking.connection === 'offline' ? 'Tracking connection lost. Reconnecting…' :
    camera !== 'ready' ? 'Connect your camera to begin tracking.' : ready ? tracking.feedback : movement.guide;

  return <div className="fs-stage">
    <CameraView onStatus={setCamera} onFrameCapture={paused || saving || done ? undefined : tracking.sendFrame}
      landmarks={showSkeleton ? tracking.landmarks : null} activeJoints={tracking.activeJoints}
      faultJoints={stage === 'active' ? tracking.faultJoints : []} />

    {paused ? <div className="camera-pause"><Pause size={27}/> Paused</div>
      : stage === 'countdown' && camera === 'ready' ? <div className="camera-overlay soft" role="timer" aria-live="assertive">
        {ready ? <strong>{count || 'Go'}</strong> : <b>Step into view</b>}
        <span>Set {setIndex + 1} of {plan.sets} · {ready ? 'hold the start position' : movement.view.toLowerCase()}</span></div>
      : stage === 'rest' ? <div className="camera-overlay" role="timer">
        <span>Rest</span><strong>{displayTime(restLeft)}</strong>
        <span>Next: set {setIndex + 1} of {plan.sets}. It starts when you’re back in position.</span>
        <button className="studio-button subtle compact" onClick={() => setRestLeft(0)}><SkipForward size={15}/> Skip rest</button></div>
      : done ? <div className="camera-overlay"><Check size={44}/>
        <span>{movement.name}: {tracking.reps.length} reps in {setStarts.length} {setStarts.length === 1 ? 'set' : 'sets'}</span>
        <strong className="small">{nextIn}</strong>
        <span>{isLast ? 'Showing your summary' : `Next: ${exercises[list[index + 1]].name}`}</span>
        <button className="studio-button compact" onClick={advance} disabled={saving}>{isLast ? 'Finish now' : 'Start now'} <ArrowRight size={16}/></button></div>
      : null}

    <header className="hud-top">
      <div><div className="hud-kicker">{String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}</div><h1>{movement.name}</h1></div>
      <div className="training-controls">
        <span className="training-time">{displayTime(seconds)}</span>
        {voiceCommandsSupported && <button className="hud-button" aria-pressed={mic}
          aria-label={mic ? 'Turn off voice commands' : 'Turn on voice commands'} title="Voice commands: pause, resume, skip, next, stop"
          onClick={() => setMic(!mic)}>{mic ? <Mic size={18}/> : <MicOff size={18}/>}</button>}
        <button className="hud-button" aria-label={voice ? 'Mute voice coaching' : 'Enable voice coaching'} aria-pressed={voice} onClick={() => setVoice(!voice)}>
          {voice ? <Volume2 size={18}/> : <VolumeX size={18}/>}
        </button>
        <button className="hud-button" onClick={() => setPaused(!paused)} disabled={saving || done} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? <Play size={18}/> : <Pause size={18}/>}
        </button>
        <button className="hud-button" onClick={() => dialog.current.showModal()} disabled={saving} aria-label="End workout"><Square size={16}/></button>
      </div>
    </header>

    <aside className="hud-panel">
      <div className="hud-row">
        <div className="live-status" data-live={ready && !paused && stage === 'active'}><i/>{status}</div>
        <div className="set-progress">SET {setIndex + 1}/{plan.sets}</div>
      </div>
      <div className="live-count"><strong>{String(Math.min(setReps, plan.repsPerSet)).padStart(2, '0')}</strong><span>/ {plan.repsPerSet} REPS</span></div>
      <dl className="live-metrics">
        <div><dt>{movement.angle}</dt><dd>{angle == null || paused || stage !== 'active' ? '—' : Math.round(angle) + '°'}</dd></div>
        <div><dt>Form estimate</dt><dd>{tracking.formScore == null ? '—' : tracking.formScore + '%'}</dd></div>
      </dl>
      {lastRep?.grade && <div className="rep-grade" aria-live="polite">
        <b data-grade={lastRep.grade}>{lastRep.grade}</b>
        <p><strong>Rep {tracking.reps.length} · {lastRep.formScore}%</strong><br/>{repTip(lastRep)}</p>
      </div>}
      <p className="hud-cue" role="status">{message}</p>
      {mic && <p className="hud-mic">{commands.listening ? 'Listening' : 'Starting mic…'} · say pause, resume, skip, next or stop
        {commands.heard ? ` · heard “${commands.heard}”` : ''}</p>}
    </aside>

    <dialog ref={dialog} className="finish-dialog" aria-labelledby="finish-heading">
      <h2 id="finish-heading">End Workout?</h2>
      <p>You’ll see a summary of the reps tracked so far.</p>
      <div><button className="studio-button subtle" onClick={() => dialog.current.close()}>Continue</button>
        <button className="studio-button" onClick={() => { dialog.current.close(); onFinish(record()); }}>End session</button></div>
    </dialog>
  </div>;
}

export function Workout() {
  const { user, mongoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const list = getExerciseList(location.state?.exercises);
  const plan = getPlan(location.state?.plan);
  const [records, setRecords] = useState([]);
  const [voiceOverride, setVoice] = useState(null);
  const [mic, setMicState] = useState(readMic);
  const setMic = on => { setMicState(on); try { localStorage.setItem(MIC_KEY, on ? 'on' : 'off'); } catch { /* ignore */ } };
  const voice = voiceOverride ?? Boolean(mongoUser?.preferences?.voiceCoaching);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const savingRef = useRef(false);
  const finish = useCallback(async record => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const completed = [...records, record];
    const allReps = completed.flatMap(ex => ex.reps);
    const workoutData = {
      title: completed.map(ex => exercises[ex.exerciseName].name).join(' + '),
      durationSeconds: completed.reduce((total, ex) => total + ex.durationSeconds, 0),
      totalReps: allReps.length, overallFormScore: average(allReps),
      meta: { poseRuleVersion: 4, plan }, exercises: completed, startedAt: startedAt.current, endedAt: new Date().toISOString(),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, user]);
  const onAdvance = useCallback(record => setRecords(current => [...current, record]), []);

  return <WorkoutSet key={records.length} id={list[records.length]} index={records.length} list={list} plan={plan}
    onAdvance={onAdvance} onFinish={finish} voice={voice}
    setVoice={setVoice} mic={mic} setMic={setMic}
    showSkeleton={mongoUser?.preferences?.showSkeletonOverlay !== false} saving={saving} />;
}
