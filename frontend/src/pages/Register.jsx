import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';

export const Register = () => {
  const { registerWithEmail, loginWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerWithEmail(email, password, name);
      navigate('/verify-email');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-medium">Get Started</span>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-1">Create your account</h2>
          <p className="text-xs text-text-muted mt-1.5">Start tracking your movement with real-time coaching.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/20 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full bg-elevated hover:bg-[#2d3828] border border-border-subtle text-text-primary font-medium text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors mb-6 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-[11px] uppercase tracking-wider text-text-muted font-mono">OR EMAIL</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Athlete Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              />
              <User className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                required
                className="w-full bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              />
              <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              />
              <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-text-muted hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
              />
              <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-background font-semibold text-xs py-3 rounded-xl transition-colors uppercase tracking-widest font-mono flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
