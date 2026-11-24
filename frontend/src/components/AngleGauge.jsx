import React from 'react';

// Camera angles are estimates (often ±5–10°), so show them in 5° steps.
export const round5 = value => Math.round(value / 5) * 5;

/**
 * Turn the engine's goal payload into what the gauge shows. Pure, so it can be
 * tested without React.
 *  rep goal:  { current, start, target, ideal, direction: 'lower'|'higher', progress, reached, best }
 *  hold goal: { current, low, high, direction: 'band', reached }
 */
export function describeGoal(goal, inRep) {
  if (!goal || goal.current == null) return null;
  const current = round5(goal.current);
  if (goal.direction === 'band') {
    const low = goal.low, high = goal.high;
    const inside = goal.current >= low && goal.current <= high;
    const below = goal.current < low;
    const span = 180;
    return {
      current, goalText: `${low}–${high}°`, fill: Math.min(1, Math.max(0, goal.current / span)),
      marks: [low / span, high / span], ok: inside,
      // Body-line holds (plank) top out at 180°; joint holds (wall sit) have a real upper limit.
      hint: inside ? 'In range. Hold it.'
        : below ? `${high >= 180 ? 'Straighten your body' : 'Come up a little'} · ${round5(low - goal.current) || 5}° to go`
        : `Go lower · ${round5(goal.current - high) || 5}° to go`,
    };
  }
  const word = goal.direction === 'lower' ? 'lower' : 'higher';
  const remaining = Math.abs(goal.target - goal.current);
  const span = Math.abs(goal.ideal - goal.start) || 1;
  const toward = value => Math.min(1, Math.max(0, Math.abs(value - goal.start) / span));
  const past = goal.direction === 'lower' ? goal.current <= goal.target : goal.current >= goal.target;
  let hint;
  if (inRep) hint = goal.reached || past ? 'Goal reached ✓' : `Go ${word} · ${round5(remaining) || 5}° to go`;
  else if (goal.best != null) {
    const hit = goal.direction === 'lower' ? goal.best <= goal.target : goal.best >= goal.target;
    hint = `Last rep ${round5(goal.best)}° · ${hit ? 'goal reached ✓' : `${round5(Math.abs(goal.target - goal.best)) || 5}° short`}`;
  } else hint = `Go ${word} to ${goal.target}° on each rep`;
  return {
    current, goalText: `${goal.target}°`, fill: toward(goal.current),
    marks: [toward(goal.target), toward(goal.ideal)], ok: goal.reached || past, hint,
  };
}

export function AngleGauge({ goal, label, inRep }) {
  const view = describeGoal(goal, inRep);
  if (!view) return null;
  return <div className="angle-gauge" data-ok={view.ok}>
    <div className="angle-gauge-top">
      <span>{label}</span>
      <strong>{view.current}°</strong>
      <span>goal {view.goalText}</span>
    </div>
    <div className="angle-gauge-bar" role="meter" aria-label={`${label}: ${view.current} degrees, goal ${view.goalText}`}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.fill * 100)}>
      <i style={{ width: `${view.fill * 100}%` }} />
      {view.marks.map((mark, i) => <b key={i} style={{ left: `${mark * 100}%` }} data-kind={i ? 'ideal' : 'goal'} />)}
    </div>
    <p>{view.hint}</p>
  </div>;
}
