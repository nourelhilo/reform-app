import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

export const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await resetPassword(email);
      setSuccess(true);
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
          <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">Account Recovery</span>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight mt-1">RESET PASSWORD</h2>
          <p className="text-xs text-text-muted mt-2">Enter your email address to receive password reset instructions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/20 flex items-start gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-status-success mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">Reset Link Sent</p>
            <p className="text-xs text-text-muted mb-6">Check your inbox for instructions to reset your password.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs text-accent font-semibold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  required
                  className="w-full bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent"
                />
                <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold text-xs py-3 rounded-xl transition-colors uppercase tracking-widest font-mono flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Reset Link
            </button>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
