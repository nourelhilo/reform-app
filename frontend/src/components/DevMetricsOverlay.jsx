import React from 'react';

export const DevMetricsOverlay = ({ devMetrics, confidence = 1.0, isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="bg-black/80 backdrop-blur-md border border-border-subtle rounded-xl p-3 text-[11px] font-mono text-text-muted flex items-center gap-4 select-none">
      <div className="flex items-center gap-1.5">
        <span className="text-text-primary font-bold">FPS</span>
        <span className="text-emerald-400">{devMetrics.fps || 30.0}</span>
      </div>
      <div className="w-px h-3 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-text-primary font-bold">POSE</span>
        <span>{devMetrics.poseLatencyMs || 0}ms</span>
      </div>
      <div className="w-px h-3 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-text-primary font-bold">INF</span>
        <span>{devMetrics.inferenceLatencyMs || 0}ms</span>
      </div>
      <div className="w-px h-3 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-text-primary font-bold">WS</span>
        <span>{devMetrics.wsLatencyMs || 5}ms</span>
      </div>
      <div className="w-px h-3 bg-border-subtle" />
      <div className="flex items-center gap-1.5">
        <span className="text-text-primary font-bold">CONF</span>
        <span>{Math.round(confidence * 100)}%</span>
      </div>
    </div>
  );
};
