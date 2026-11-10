import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { BarChart3, TrendingUp, Repeat2, Clock, Star, Loader2, Info, Activity } from 'lucide-react';

const EXERCISE_LABELS = {
  squat: 'Squat', pushup: 'Push-Up', curl: 'Bicep Curl',
  lunge: 'Lunge', jumping_jack: 'Jumping Jack',
};

const METRIC_COLORS = ['#d6fb68', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

const sparklinePath = (points, width = 100, height = 40) => {
  if (!points || points.length < 2) return '';
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => height - ((p - min) / range) * (height - 4) - 2);
  return 'M ' + xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' L ');
};

export const Analytics = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const [dashData, progressData] = await Promise.all([
          api.getDashboardMetrics(user),
          api.getProgressAnalytics(user),
        ]);
        setDashboard(dashData);
        setProgress(progressData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span className="text-xs text-text-muted">Loading analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <Info className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const formTrend = dashboard?.formScoreTrend || [];
  const exercises = progress?.exercises || [];
  const hasData = dashboard?.hasData;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 pb-6 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Trends</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">Progress & Analytics</h1>
        <p className="text-xs text-text-muted mt-1.5">Track how your movement quality, volume, and consistency develop over time.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sessions', value: summary.totalWorkouts ?? '—', icon: BarChart3 },
          { label: 'Total Reps', value: summary.totalReps ?? '—', icon: Repeat2 },
          { label: 'Avg Form Score', value: summary.averageFormScore ? `${Math.round(summary.averageFormScore)}%` : '—', icon: Star },
          { label: 'Total Time', value: summary.totalDurationSeconds ? `${Math.round(summary.totalDurationSeconds / 60)}m` : '—', icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border-subtle rounded-2xl p-5">
            <Icon className="w-4 h-4 text-accent mb-2.5" />
            <p className="text-2xl font-bold text-text-primary leading-none font-mono-stat">{value}</p>
            <p className="text-[11px] text-text-muted uppercase tracking-widest mt-1.5 font-mono">{label}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="bg-surface border border-border-subtle rounded-3xl p-12 text-center">
          <Activity className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-text-primary mb-2">No Data Yet</h3>
          <p className="text-xs text-text-muted">Complete a workout session to start seeing your analytics here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Form Score Trend */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary text-sm">Form Score Trend</h3>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              {formTrend.length > 1 ? (
                <>
                  <svg viewBox="0 0 100 40" className="w-full h-24" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="analFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d6fb68" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#d6fb68" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={sparklinePath(formTrend.map(d => d.formScore))} fill="none" stroke="#d6fb68" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <div className="mt-2 flex justify-between text-[10px] text-text-muted font-mono">
                    <span>{formTrend[0]?.date || '—'}</span>
                    <span>{formTrend[formTrend.length - 1]?.date || '—'}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-24 text-xs text-text-muted">Not enough sessions yet</div>
              )}
            </div>

            {/* Weekly Summary */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary text-sm">This Week</h3>
                <BarChart3 className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Sessions', value: dashboard?.weekly?.workoutCount ?? 0 },
                  { label: 'Reps', value: dashboard?.weekly?.repCount ?? 0 },
                  { label: 'Avg Form', value: dashboard?.weekly?.avgScore ? `${dashboard.weekly.avgScore}%` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-mono uppercase tracking-wider">{label}</span>
                    <span className="text-sm font-bold text-text-primary font-mono-stat">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per-Exercise Breakdown */}
          {exercises.filter(e => e.sessionCount > 0).length > 0 && (
            <div className="bg-surface border border-border-subtle rounded-2xl p-6">
              <h3 className="font-semibold text-text-primary text-sm mb-5">Exercise Breakdown</h3>
              <div className="space-y-4">
                {exercises
                  .filter(e => e.sessionCount > 0)
                  .map((ex, i) => (
                    <div key={ex.exercise} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs font-medium text-text-primary">{EXERCISE_LABELS[ex.exercise] || ex.exercise}</p>
                        <p className="text-[11px] text-text-muted">{ex.totalReps} reps • {ex.sessionCount} sessions</p>
                      </div>
                      <div className="flex-1 bg-elevated rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: `${ex.averageFormScore}%`,
                            backgroundColor: METRIC_COLORS[i % METRIC_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-text-muted w-10 text-right">{ex.averageFormScore}%</span>
                      {ex.improvementPercent !== null && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ex.improvementPercent >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                          {ex.improvementPercent >= 0 ? '+' : ''}{ex.improvementPercent}%
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
