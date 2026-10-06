import React from 'react';

export const FormScore = ({ score = 100, instantScore = 100, phase = 'idle' }) => {
  const isHigh = score >= 80;
  const isMedium = score >= 60 && score < 80;
  
  const scoreColor = isHigh ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-rose-400';
  const strokeColor = isHigh ? '#22c55e' : isMedium ? '#f59e0b' : '#f43f5e';

  // SVG circle calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-text-muted">Form Score</span>
        <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wider bg-elevated border border-border-subtle text-text-muted font-mono">
          {phase}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-border-subtle"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <span className={`absolute text-xl font-bold font-mono-stat ${scoreColor}`}>
            {score}%
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-primary">
            {isHigh ? 'Excellent Execution' : isMedium ? 'Good Control' : 'Adjustment Needed'}
          </span>
          <span className="text-xs text-text-muted mt-1">
            Instantaneous: <span className="font-mono">{instantScore}%</span>
          </span>
        </div>
      </div>
    </div>
  );
};
