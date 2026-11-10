import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Play, Activity, Award, Clock, ArrowRight, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.getDashboardMetrics(user);
        setData(res);
      } catch (err) {
        console.warn('Dashboard fetch notice:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Top Header & Primary Action */}
      <div className="account-heading flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Overview</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mt-1">
            {greeting}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {user?.email ? `Signed in as ${user.email}` : 'Ready to train.'}
          </p>
        </div>

        <Link
          to="/workout/setup"
          className="inline-flex items-center gap-2.5 bg-accent hover:bg-accent-hover text-background font-medium text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shadow-accent/15 tracking-wide uppercase font-mono"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Start Session
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-warning/10 border border-status-warning/20 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-status-warning flex-shrink-0" />
          <span>Status: {error}</span>
        </div>
      )}

      {/* Weekly Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Workouts (7d)</span>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-bold font-mono-stat text-text-primary">
            {data?.weekly?.workoutCount ?? 0}
          </div>
          <span className="text-[11px] text-text-muted mt-2">Sessions this week</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Reps Completed</span>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-bold font-mono-stat text-text-primary">
            {data?.weekly?.repCount ?? 0}
          </div>
          <span className="text-[11px] text-text-muted mt-2">Tracked repetitions</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">Average Form</span>
            <Award className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-3xl font-bold font-mono-stat text-emerald-800">
            {data?.weekly?.avgScore ? `${data.weekly.avgScore}%` : '—'}
          </div>
          <span className="text-[11px] text-text-muted mt-2">Camera form estimate</span>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">All-Time Sessions</span>
            <Clock className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-3xl font-bold font-mono-stat text-text-primary">
            {data?.summary?.totalWorkouts ?? 0}
          </div>
          <span className="text-[11px] text-text-muted mt-2">Total logged sessions</span>
        </div>
      </div>

      {/* Main Content Area */}
      {!data?.hasData && !loading ? (
        <div className="bg-surface border border-border-subtle rounded-3xl p-10 text-center max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-elevated border border-border-subtle flex items-center justify-center text-text-muted mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">No Sessions Yet</h3>
          <p className="text-xs text-text-muted leading-relaxed mb-6">
            Start your first workout to begin tracking your movements and form over time.
          </p>
          <Link
            to="/workout/setup"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-background text-xs font-medium px-5 py-3 rounded-xl transition-colors uppercase font-mono tracking-wider"
          >
            Start Your First Workout
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Score Trend Chart */}
          <div className="lg:col-span-2 bg-surface border border-border-subtle rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-medium">Progression</span>
                <h3 className="text-base font-semibold text-text-primary mt-0.5">Form Score Trend</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-800" />
                <span>Recent sessions</span>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.formScoreTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="formScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#663da6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#663da6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#63596a" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#63596a" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffaf2',
                      borderColor: '#ded3c3',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#201c24',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="formScore"
                    stroke="#663da6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#formScoreGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Workouts List */}
          <div className="bg-surface border border-border-subtle rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-medium">Recent Sessions</span>
                <Link to="/history" className="text-xs text-accent hover:underline flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {data?.recentWorkouts?.map((w) => (
                  <Link
                    key={w._id}
                    to={`/history`}
                    className="block bg-elevated hover:bg-[#f1e5fa] border border-border-subtle rounded-xl p-3.5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">{w.title}</span>
                      <span className="text-xs font-mono font-semibold text-emerald-800">{w.overallFormScore}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{w.totalReps} reps • {Math.round((w.durationSeconds || 0) / 60)} min</span>
                      <span className="font-mono text-[11px]">{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/history"
              className="mt-6 w-full py-2.5 bg-elevated hover:bg-[#f1e5fa] border border-border-subtle text-text-primary text-xs font-medium rounded-xl text-center block transition-colors"
            >
              View Full History
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
