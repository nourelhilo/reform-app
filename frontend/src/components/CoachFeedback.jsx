import React from 'react';
import { AlertCircle, CheckCircle2, Info, Eye } from 'lucide-react';

export const CoachFeedback = ({ feedback, visibility, confidence = 1.0 }) => {
  const isVisibilityWarning = visibility && !visibility.is_valid;
  const isLowConfidence = confidence < 0.6;

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-text-muted">Coach Feedback</span>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Eye className="w-3.5 h-3.5" />
          <span className="font-mono">{Math.round(confidence * 100)}% conf</span>
        </div>
      </div>

      {isVisibilityWarning ? (
        <div className="flex items-start gap-3 bg-status-warning/10 border border-status-warning/20 rounded-xl p-3.5 text-amber-200">
          <AlertCircle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-status-warning mb-0.5">Camera Placement</p>
            <p className="text-sm">{visibility.message}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-elevated border border-border-subtle rounded-xl p-3.5">
          <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-0.5">Live Guidance</p>
            <p className="text-sm font-medium text-text-primary">{feedback || 'Maintain a steady, controlled pace.'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
