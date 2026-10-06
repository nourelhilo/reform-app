import React from 'react';

const EXERCISE_META = {
  squat: {
    label: 'Squat',
    description: 'Tracks hip and knee flexion, depth consistency, and upright torso posture.',
    muscles: ['Quads', 'Glutes', 'Hamstrings'],
  },
  pushup: {
    label: 'Push-Up',
    description: 'Measures elbow angle at the bottom and checks for hip sagging or flare.',
    muscles: ['Chest', 'Triceps', 'Core'],
  },
  curl: {
    label: 'Bicep Curl',
    description: 'Tracks forearm flexion and alerts you if your elbow drifts or swings.',
    muscles: ['Biceps', 'Forearms'],
  },
  lunge: {
    label: 'Lunge',
    description: 'Monitors front knee depth and balance across alternating legs.',
    muscles: ['Quads', 'Glutes', 'Core'],
  },
  jumping_jack: {
    label: 'Jumping Jack',
    description: 'Checks arm elevation and leg stance synchronization throughout the movement.',
    muscles: ['Full Body', 'Cardio'],
  },
};

export const ExerciseCard = ({ id, selected, onSelect }) => {
  const meta = EXERCISE_META[id] || { label: id, muscles: [], description: '' };

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`relative text-left w-full bg-surface rounded-2xl border p-5 transition-all duration-200 group ${
        selected
          ? 'border-accent shadow-md shadow-accent/10 bg-accent/5'
          : 'border-border-subtle hover:border-text-muted/30 hover:bg-elevated'
      }`}
    >
      {/* Selector indicator */}
      <div className={`absolute top-5 right-5 w-4 h-4 rounded-full border transition-all ${
        selected ? 'bg-accent border-accent' : 'border-border-subtle group-hover:border-text-muted/40'
      }`}>
        {selected && (
          <svg className="w-2.5 h-2.5 text-white absolute inset-0 m-auto" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <h3 className="font-semibold text-text-primary text-base mb-1.5 pr-6">{meta.label}</h3>
      <p className="text-xs text-text-muted mb-4 leading-relaxed">{meta.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {meta.muscles.map((m) => (
          <span key={m} className="text-[11px] font-mono bg-elevated border border-border-subtle text-text-muted rounded px-2 py-0.5">
            {m}
          </span>
        ))}
      </div>
    </button>
  );
};
