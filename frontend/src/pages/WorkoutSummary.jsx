import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { exerciseName, gradeFor, isHold } from '../services/exercises';
import { api } from '../services/api';
import { guestWorkouts } from '../services/guestWorkouts';
import { useAuth } from '../hooks/useAuth';

const formatDuration = seconds => [Math.floor(seconds / 60), seconds % 60]
  .map(i => String(i).padStart(2, '0')).join(':');

// Every fault seen, most frequent first. For reps: how many reps showed it.
export function faultCounts(ex) {
  if (!ex.reps?.length) return (ex.keyFeedback || []).map(cue => [cue, null]);
  const counts = new Map();
  for (const rep of ex.reps) {
    const cues = new Set([...(rep.faults || []).map(fault => fault.cue), ...(rep.feedbackGiven || [])]);
    for (const cue of cues) counts.set(cue, (counts.get(cue) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

export function WorkoutSummary() {
  const { state } = useLocation();
  const { user } = useAuth();
  const data = state?.workoutData;
  const [saveStatus, setSaveStatus] = useState(state?.saveStatus);
  const [retrying, setRetrying] = useState(false);
  // A failed account save used to lose the session. Offer a retry, or keep it on this device.
  const retry = async () => {
    setRetrying(true);
    try {
      await api.saveWorkout(data, user);
      setSaveStatus(user ? 'saved' : 'local');
    } catch {
      setSaveStatus('failed');
    } finally {
      setRetrying(false);
    }
  };
  const keepLocal = () => {
    try { guestWorkouts.save(data); setSaveStatus('device'); } catch { setSaveStatus('failed'); }
  };
  if (!data) return <div className="studio-wrap summary-wrap"><div className="studio-heading"><h1>No workout data found.</h1></div>
    <Link className="studio-button" to="/workout/setup">Choose a workout <ArrowRight size={17}/></Link></div>;
  const note = {
    saved: 'Saved to your workout history.',
    local: 'Saved to workout history on this device.',
    failed: 'Your session couldn’t be saved to history. You can still review it here.',
    empty: 'No reps were counted, so this session wasn’t added to your history.',
    device: 'Kept on this device. Sign out to see it in guest history, or retry later.',
  }[saveStatus];

  return <div className="studio-wrap summary-wrap">
    <div className="studio-heading"><h1>Session Completed</h1><p>{data.title}</p></div>
    <dl className="summary-stats">
      <div className="studio-panel"><dt>Duration</dt><dd>{formatDuration(data.durationSeconds)}</dd></div>
      <div className="studio-panel"><dt>Total Reps</dt><dd>{data.totalReps}</dd></div>
      <div className="studio-panel"><dt>Form estimate</dt><dd>{data.totalReps ? data.overallFormScore + '%' : '—'}</dd></div>
    </dl>
    <section className="studio-panel">
      <h2>Movement Quality</h2>
      <ul className="summary-list">{data.exercises.map(ex => {
        const hold = ex.holdSeconds > 0 || isHold(ex.exerciseName);
        const counted = hold ? ex.holdSeconds > 0 : ex.totalReps > 0;
        const faults = faultCounts(ex);
        return <li key={ex.exerciseName}>
          <div className="rep-grade">
            {counted && <b data-grade={gradeFor(ex.averageFormScore)}>{gradeFor(ex.averageFormScore)}</b>}
            <p><strong>{exerciseName(ex.exerciseName)}</strong>{ex.weightKg ? ` · ${ex.weightKg} kg` : ''}<br/>
              {hold ? `${ex.holdSeconds || 0} s held in good form` : `${ex.totalReps} ${ex.totalReps === 1 ? 'rep' : 'reps'}`}
              {' · '}{counted ? ex.averageFormScore + '% estimate' : 'No estimate'}
              {ex.sets?.length > 0 && <> · sets {ex.sets.map(set => hold ? `${set.seconds}s` : set.reps).join(' / ')}</>}</p>
          </div>
          {faults.length > 0 && <ul className="fault-list">{faults.map(([cue, count]) =>
            <li key={cue}>{cue}{count != null && <span> {count} of {ex.totalReps} reps</span>}</li>)}</ul>}
        </li>;
      })}</ul>
      <p className="studio-caption" role="status">{note}</p>
      {saveStatus === 'failed' && <div className="summary-actions">
        <button className="studio-button compact" onClick={retry} disabled={retrying}>
          {retrying ? 'Saving…' : 'Retry save'}</button>
        {user && <button className="studio-button subtle compact" onClick={keepLocal} disabled={retrying}>
          Keep on this device</button>}
      </div>}
    </section>
    <div className="summary-actions">
      <Link className="studio-button" to="/workout/setup"><RotateCcw size={17}/> Train Again</Link>
      <Link className="studio-button subtle" to="/history">
        Workout History <ArrowRight size={17}/>
      </Link>
    </div>
  </div>;
}
