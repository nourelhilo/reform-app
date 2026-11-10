import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, Camera, Check, Dumbbell, MoveVertical, PersonStanding, Zap } from 'lucide-react';
import { exercises, getExerciseList } from '../services/exercises';

const icons = { squat: MoveVertical, pushup: Activity, curl: Dumbbell, lunge: PersonStanding, jumping_jack: Zap };

export function WorkoutSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => getExerciseList(location.state?.exercises));

  return <div className="studio-wrap">
    <Link to="/" className="studio-back"><ArrowLeft size={16} /> Home</Link>
    <div className="studio-heading">
      <div className="studio-kicker"><span /> 01 / BUILD YOUR SESSION</div>
      <h1>Choose your moves.</h1>
      <p>Pick one or more exercises. Reform tracks them in the order you select.</p>
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
        <div className="studio-kicker">YOUR SESSION</div>
        <h2>{selected.length} {selected.length === 1 ? 'movement' : 'movements'}</h2>
        {selected.length ? <ol>{selected.map((id, i) => <li key={id}><span>{String(i+1).padStart(2, '0')}</span>{exercises[id].name}</li>)}</ol>
          : <p className="text-text-muted text-sm">Select a movement to continue.</p>}
        <button className="studio-button w-full" disabled={!selected.length}
          onClick={() => navigate('/workout/calibration', { state: { exercises: selected } })}>
          Check my camera <ArrowRight size={18} />
        </button>
        <p className="studio-caption"><Camera size={15} /> Camera access starts on the next screen.</p>
      </aside>
    </div>
  </div>;
}
