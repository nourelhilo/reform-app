import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User as UserIcon, Settings, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const Profile = () => {
  const { user, mongoUser, logout, savePreferences } = useAuth();
  const [preferences, setPreferences] = useState({ voiceCoaching: false, showSkeletonOverlay: true });
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mongoUser?.preferences) {
      setPreferences({ voiceCoaching: Boolean(mongoUser.preferences.voiceCoaching),
        showSkeletonOverlay: mongoUser.preferences.showSkeletonOverlay !== false });
    }
  }, [mongoUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSavedMessage('');

    try {
      await savePreferences(preferences);
      setSavedMessage('Preferences saved.');
      setTimeout(() => setSavedMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="account-heading mb-8 pb-6 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Account</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">Profile & Settings</h1>
        <p className="text-xs text-text-muted mt-1.5">Manage your account, coaching audio, and camera preferences.</p>
      </div>

      {savedMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Account Card */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserIcon className="w-4 h-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono">Account Information</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-elevated border border-border-subtle flex items-center justify-center text-xl font-bold text-text-primary overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-text-primary">{user?.displayName || 'Athlete'}</p>
              <p className="text-xs text-text-muted">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Preferences Form */}
        <form onSubmit={handleSave} className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-0">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-4 h-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono">Vision & Audio Preferences</h2>
          </div>

          {/* Voice Coach */}
          <div className="flex items-center justify-between py-4 border-b border-border-subtle">
            <div>
              <p className="text-sm font-medium text-text-primary">Voice Coaching</p>
              <p className="text-xs text-text-muted mt-0.5">Receive live spoken feedback during repetitions.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Voice coaching"
                checked={preferences.voiceCoaching}
                onChange={(e) => setPreferences({ ...preferences, voiceCoaching: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
            </label>
          </div>

          <label className="flex items-center justify-between gap-4 py-4">
            <span>
              <span className="block text-sm font-medium text-text-primary">Skeleton overlay</span>
              <span className="block text-xs text-text-muted mt-0.5">Show tracked joints on the camera preview.</span>
            </span>
            <input type="checkbox" aria-label="Skeleton overlay" checked={preferences.showSkeletonOverlay}
              onChange={e => setPreferences({ ...preferences, showSkeletonOverlay: e.target.checked })}
              className="w-5 h-5 accent-accent" />
          </label>
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-semibold transition-all disabled:opacity-50 font-mono uppercase tracking-wider"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>

        {/* Sign Out */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Sign Out</p>
            <p className="text-xs text-text-muted mt-0.5">End your session on this device.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-elevated hover:bg-[#f1e5fa] border border-border-subtle text-rose-800 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
