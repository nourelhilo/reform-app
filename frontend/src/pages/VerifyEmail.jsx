import React from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const VerifyEmail = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border-subtle rounded-3xl p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-6">
          <MailCheck className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">VERIFY YOUR EMAIL</h2>
        <p className="text-xs text-text-muted leading-relaxed mb-6">
          We sent a verification link to <span className="text-text-primary font-mono font-medium">{user?.email || 'your email'}</span>. Please confirm your email address to secure your account.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent-hover text-background font-semibold text-xs py-3 rounded-xl transition-colors uppercase tracking-widest font-mono mb-4"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
