// Personal records and streaks. Mirrored for guests in frontend/src/services/guestWorkouts.js.
const DAY = 24 * 60 * 60 * 1000;

function personalRecords(workouts) {
  const records = {};
  for (const workout of workouts) {
    for (const ex of workout.exercises || []) {
      const r = records[ex.exerciseName] ||= { bestSetReps: 0, longestHoldSeconds: 0, bestFormScore: 0, heaviestKg: 0 };
      const sets = Array.isArray(ex.sets) && ex.sets.length ? ex.sets : [{ reps: ex.totalReps, seconds: ex.holdSeconds }];
      for (const set of sets) {
        r.bestSetReps = Math.max(r.bestSetReps, Number(set.reps) || 0);
        r.longestHoldSeconds = Math.max(r.longestHoldSeconds, Math.round(Number(set.seconds) || 0));
      }
      if ((Number(ex.totalReps) || 0) > 0 || (Number(ex.holdSeconds) || 0) > 0) {
        r.bestFormScore = Math.max(r.bestFormScore, Number(ex.averageFormScore) || 0);
      }
      r.heaviestKg = Math.max(r.heaviestKg, Number(ex.weightKg) || 0);
    }
  }
  return records;
}

// Consecutive days with at least one workout, ending today (or yesterday, so a
// streak isn't "lost" before today's session). Days are UTC calendar days.
function streakDays(workouts, now = Date.now()) {
  const days = new Set(workouts.map(w => Math.floor(Date.parse(w.createdAt) / DAY)));
  let day = Math.floor(now / DAY);
  if (!days.has(day)) day -= 1;
  let streak = 0;
  while (days.has(day)) { streak += 1; day -= 1; }
  return streak;
}

module.exports = { personalRecords, streakDays };
