import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, Check, Minus, MoveVertical, PersonStanding } from 'lucide-react';
import { exercises, getExerciseList, getPlan, weighted } from '../services/exercises';

const icons = { squat: MoveVertical, pushup: Activity, lunge: PersonStanding, plank: Minus };

// [key, label, min, max, step, shown when]
const planFields = [
  ['sets', 'Sets per exercise', 1, 6, 1, () => true],
  ['repsPerSet', 'Reps per set', 3, 30, 1, list => list.some(id => !exercises[id].hold)],
  ['holdSeconds', 'Hold per set (s)', 10, 300, 5, list => list.some(id => exercises[id].hold)],
  ['restSeconds', 'Rest between sets (s)', 10, 180, 5, () => true],
];

export function WorkoutSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => getExerciseList(location.state?.exercises));
  const [plan, setPlan] = useState(() => getPlan(location.state?.plan));

  return <div className="studio-wrap">
    <Link to="/" className="studio-back"><ArrowLeft size={16} /> Home</Link>
    <div className="studio-heading">
      <div className="studio-kicker">New Session</div>
      <h1>Choose Exercises</h1>
      <p>Select the movements you would like to include in this session.</p>
    </div>
    <div className="studio-layout">
      <div className="move-grid">{Object.entries(exercises).map(([id, exercise]) => {
        const index = selected.indexOf(id);
        const Icon = icons[id];
        return <button type="button" key={id} className={'move-card' + (index >= 0 ? ' selected' : '')}
          aria-pressed={index >= 0} onClick={() => setSelected(current =>
            current.includes(id) ? current.filter(value => value !== id) : [...current, id])}>
          <span className="move-card-top"><Icon size={23} /><span className="move-check">{index >= 0 && <Check size={15}/>}</span></span>
          <span className="move-name">{exercise.name}</span>
          <span className="move-meta">{exercise.area} <span>·</span> {exercise.view}</span>
        </button>;
      })}</div>
      <aside className="studio-panel setup-plan">
        <h2>{selected.length} {selected.length === 1 ? 'exercise' : 'exercises'} selected</h2>
        {selected.length ? <ol>{selected.map((id, i) => <li key={id}><span>{String(i+1).padStart(2, '0')}</span>{exercises[id].name}</li>)}</ol>
          : <p className="text-text-muted text-sm">Select an exercise to continue.</p>}
        <div className="plan-fields">{planFields.filter(field => field[5](selected)).map(([key, label, min, max, step]) =>
          <label key={key}><span>{label}</span>
            <input type="number" inputMode="numeric" min={min} max={max} step={step} value={plan[key]}
              onChange={event => setPlan(current => ({ ...current, [key]: event.target.value }))}
              onBlur={() => setPlan(current => getPlan(current))} />
          </label>)}
          {selected.filter(id => weighted.has(id)).map(id =>
            <label key={`kg-${id}`}><span>{exercises[id].name} weight (kg, optional)</span>
              <input type="number" inputMode="decimal" min="0" max="500" step="0.5" placeholder="—"
                value={plan.weights?.[id] ?? ''}
                onChange={event => setPlan(current => ({ ...current, weights: { ...current.weights, [id]: event.target.value } }))}
                onBlur={() => setPlan(current => getPlan(current))} />
            </label>)}
        </div>
        <button className="studio-button w-full" disabled={!selected.length}
          onClick={() => navigate('/workout/calibration', { state: { exercises: selected, plan: getPlan(plan) } })}>
          Continue to Camera Check <ArrowRight size={18} />
        </button>
      </aside>
    </div>
  </div>;
}
