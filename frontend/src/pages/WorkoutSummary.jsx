import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Award, Clock, Repeat, Star, BarChart3, Home, CheckCircle2, AlertTriangle } from 'lucide-react';

const formatDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const EXERCISE_LABELS = {
  squat: 'Squats', pushup: 'Push-Ups', curl: 'Bicep Curls',
  lunge: 'Lunges', jumping_jack: 'Jumping Jacks',
};

const ScoreRing = ({ score, size = 110 }) => {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const progress = circ - (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#201E26" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke={color}
          strokeWidth="7" strokeDasharray={circ} strokeDashoffset={progress}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text-primary leading-none">{score}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5 font-mono">Form</span>
      </div>
    </div>
  );
};

export const WorkoutSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const workoutData = location.state?.workoutData;

  if (!workoutData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <p className="text-text-muted text-sm">No workout data found.</p>
        <Link to="/" className="text-xs text-accent hover:underline">Return Home</Link>
      </div>
    );
  }

  const { title, durationSeconds, totalReps, overallFormScore, exercises } = workoutData;
  const estimatedCalories = Math.round(totalReps * 0.35 + (durationSeconds / 60) * 4.2);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border-subtle mb-4">
          <Award className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Session Completed</h1>
        <p className="text-xs text-text-muted mt-1">{title}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3.5 mb-6">
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 text-center">
          <Clock className="w-4 h-4 text-text-muted mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary font-mono-stat">{formatDuration(durationSeconds)}</p>
          <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-0.5">Duration</p>
        </div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 text-center">
          <Repeat className="w-4 h-4 text-text-muted mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary font-mono-stat">{totalReps}</p>
          <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-0.5">Total Reps</p>
        </div>
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 text-center">
          <Star className="w-4 h-4 text-text-muted mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary font-mono-stat">{estimatedCalories}</p>
          <p className="text-[11px] text-text-muted uppercase tracking-wider font-mono mt-0.5">Est. Calories</p>
        </div>
      </div>

      {/* Form Score + Per-Exercise */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <ScoreRing score={overallFormScore} />
          <div>
            <h3 className="font-semibold text-text-primary text-base">Movement Quality</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {overallFormScore >= 75
                ? 'Strong posture and consistent depth across your sets.'
                : overallFormScore >= 50
                ? 'Good effort. Focus on keeping your alignment stable on the final reps.'
                : 'Consider slowing down your pace to focus on full range of motion.'}
            </p>
          </div>
        </div>

        <div className="border-t border-border-subtle pt-4 space-y-3.5">
          {exercises.map((ex, i) => {
            const barColor = ex.averageFormScore >= 75 ? 'bg-emerald-500' : ex.averageFormScore >= 50 ? 'bg-amber-400' : 'bg-rose-400';
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="w-28 flex-shrink-0">
                  <p className="text-xs font-medium text-text-primary">{EXERCISE_LABELS[ex.exerciseName] || ex.exerciseName}</p>
                  <p className="text-[11px] text-text-muted">{ex.totalReps} reps • {formatDuration(ex.durationSeconds)}</p>
                </div>
                <div className="flex-1 bg-elevated rounded-full h-2">
                  <div
                    className={`${barColor} h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${ex.averageFormScore}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted w-8 text-right">{ex.averageFormScore}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to="/"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface border border-border-subtle text-text-primary text-xs font-mono uppercase rounded-xl hover:bg-elevated transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
        <button
          onClick={() => navigate('/workout/setup')}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-mono uppercase rounded-xl transition-colors shadow-sm"
        >
          <Repeat className="w-4 h-4" />
          Train Again
        </button>
      </div>

      <div className="mt-4 text-center">
        <Link to="/history" className="text-xs text-accent hover:underline inline-flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          View full session history
        </Link>
      </div>
    </div>
  );
};
