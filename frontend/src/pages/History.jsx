import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Clock, Repeat2, Star, BarChart3, Loader2, Info } from 'lucide-react';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDuration = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const EXERCISE_LABELS = {
  squat: 'Squats', pushup: 'Push-Ups', curl: 'Curls',
  lunge: 'Lunges', jumping_jack: 'Jumping Jacks',
};

export const History = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const data = await api.getWorkouts(user, { page, limit: LIMIT });
        setWorkouts(prev => page === 1 ? (data.workouts || []) : [...prev, ...(data.workouts || [])]);
        setHasMore((data.pagination?.total || 0) > page * LIMIT);
      } catch (err) {
        setError(err.message || 'Failed to load workout history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user, page]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 pb-6 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Activity</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">Workout History</h1>
        <p className="text-xs text-text-muted mt-1.5">A complete log of your completed sessions, rep totals, and form scores.</p>
      </div>

      {loading && page === 1 && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-xs text-text-muted">Loading your sessions...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <Info className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && workouts.length === 0 && (
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-sm text-text-muted">No workouts recorded yet.</p>
          <Link to="/workout/setup" className="mt-4 inline-block text-xs text-accent hover:underline">Start your first session</Link>
        </div>
      )}

      <div className="space-y-4">
        {workouts.map((w) => {
          const scoreColor = w.overallFormScore >= 75 ? 'text-emerald-400' : w.overallFormScore >= 50 ? 'text-amber-400' : 'text-rose-400';
          return (
            <div key={w._id} className="bg-surface border border-border-subtle rounded-2xl p-6 hover:border-text-muted/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-text-primary text-base">{w.title || 'Workout Session'}</h3>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">{formatDate(w.startedAt)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${scoreColor}`}>{w.overallFormScore}</span>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest">Form</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(w.durationSeconds)}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Repeat2 className="w-3.5 h-3.5" />
                  {w.totalReps} total reps
                </div>
              </div>

              {/* Exercise breakdown */}
              {w.exercises && w.exercises.length > 0 && (
                <div className="border-t border-border-subtle pt-4 flex flex-wrap gap-2">
                  {w.exercises.map((ex, i) => (
                    <span key={i} className="text-xs bg-elevated border border-border-subtle text-text-muted rounded-lg px-3 py-1 font-mono">
                      {EXERCISE_LABELS[ex.exerciseName] || ex.exerciseName} — {ex.totalReps}r
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && !loading && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full mt-6 py-3 bg-surface border border-border-subtle text-text-muted text-xs font-mono uppercase rounded-xl hover:bg-elevated transition-colors"
        >
          Load More
        </button>
      )}

      {loading && page > 1 && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
        </div>
      )}
    </div>
  );
};
