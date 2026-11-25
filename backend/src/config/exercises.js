// Every exercise Reform has offered. Older workouts may still contain any of these,
// so history and analytics read them all.
const EXERCISES = Object.freeze([
  'squat', 'pushup', 'curl', 'lunge', 'jumping_jack', 'shoulder_press', 'lateral_raise', 'glute_bridge',
  'plank', 'side_plank', 'wall_sit',
]);

// Exercises new workouts may contain: only those whose counting held up on real
// exercise video. Keep in sync with ACTIVE in ai-engine/app/exercises/tracking.py
// and frontend/src/services/exercises.js.
const ACTIVE_EXERCISES = Object.freeze(['squat', 'pushup', 'lunge', 'plank']);

module.exports = { EXERCISES, ACTIVE_EXERCISES };
