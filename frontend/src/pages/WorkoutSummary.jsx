import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { exercises } from '../services/exercises';

const formatDuration = seconds => [Math.floor(seconds / 60), seconds % 60]
  .map(i => String(i).padStart(2, '0')).join(':');

export function WorkoutSummary() {
  const { state } = useLocation();
  const data = state?.workoutData;
  if (!data) return <div className="studio-wrap summary-wrap"><div className="studio-heading"><h1>No workout data found.</h1></div>
    <Link className="studio-button" to="/workout/setup">Choose a workout <ArrowRight size={17}/></Link></div>;
  const note = {
    saved: 'Saved to your workout history.',
    local: 'Saved to workout history on this device.',
    failed: 'Your session couldn’t be saved to history. You can still review it here.',
    empty: 'No reps were counted, so this session wasn’t added to your history.',
  }[state.saveStatus];

  return <div className="studio-wrap summary-wrap">
    <div className="studio-heading"><h1>Session Completed</h1><p>{data.title}</p></div>
    <dl className="summary-stats">
      <div className="studio-panel"><dt>Duration</dt><dd>{formatDuration(data.durationSeconds)}</dd></div>
      <div className="studio-panel"><dt>Total Reps</dt><dd>{data.totalReps}</dd></div>
      <div className="studio-panel"><dt>Form estimate</dt><dd>{data.totalReps ? data.overallFormScore + '%' : '—'}</dd></div>
    </dl>
    <section className="studio-panel">
      <h2>Movement Quality</h2>
      <ul className="summary-list">{data.exercises.map(ex => <li key={ex.exerciseName}>
        <strong>{exercises[ex.exerciseName]?.name || ex.exerciseName}</strong>
        <span>{ex.totalReps} {ex.totalReps === 1 ? 'rep' : 'reps'} · {ex.totalReps ? ex.averageFormScore + '% estimate' : 'No estimate'}</span>
      </li>)}</ul>
      <p className="studio-caption" role="status">{note}</p>
    </section>
    <div className="summary-actions">
      <Link className="studio-button" to="/workout/setup"><RotateCcw size={17}/> Train Again</Link>
      <Link className="studio-button subtle" to="/history">
        Workout History <ArrowRight size={17}/>
      </Link>
    </div>
  </div>;
}
