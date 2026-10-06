import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExerciseCard } from '../components/ExerciseCard';
import { Play, Settings } from 'lucide-react';

const EXERCISES = ['squat', 'pushup', 'curl', 'lunge', 'jumping_jack'];

export const WorkoutSetup = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(['squat']);

  const toggleExercise = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selected.length === 0) return;
    navigate('/workout/calibration', { state: { exercises: selected } });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 pb-6 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">New Session</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">Choose Exercises</h1>
        <p className="text-xs text-text-muted mt-1.5">Select the movements you would like to include in this session.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {EXERCISES.map(ex => (
          <ExerciseCard
            key={ex}
            id={ex}
            selected={selected.includes(ex)}
            onSelect={toggleExercise}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-6">
        <span className="text-xs text-text-muted font-mono">
          {selected.length} exercise{selected.length !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={handleStart}
          disabled={selected.length === 0}
          className="inline-flex items-center gap-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shadow-accent/15 tracking-wide uppercase font-mono"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          Continue to Camera Check
        </button>
      </div>
    </div>
  );
};
