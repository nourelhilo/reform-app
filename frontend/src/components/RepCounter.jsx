import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const RepCounter = ({ reps = 0, isIncrementing = false, targetReps = null }) => {
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-text-muted">Repetitions</span>
        {targetReps && (
          <span className="text-xs text-text-muted">Target: {targetReps}</span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-bold tracking-tight text-text-primary font-mono-stat">
          {reps}
        </span>
        <span className="text-sm font-medium text-text-muted uppercase tracking-wider">reps</span>
      </div>

      {/* Subtle non-gamey +1 rep animation popup */}
      <AnimatePresence>
        {isIncrementing && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute top-4 right-4 bg-accent/20 border border-accent/40 text-accent px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider"
          >
            +1 REP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
