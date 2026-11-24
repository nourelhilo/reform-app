const keyPrefix = 'reform.guest-workout.';

// Storage can throw (private browsing, disabled cookies) and entries can be
// corrupted or written by an older version. Skip anything unreadable instead
// of crashing the History, Dashboard and Progress pages.
function readWorkouts() {
  const workouts = [];
  let keys = [];
  try { keys = Object.keys(localStorage); } catch { return workouts; }
  for (const key of keys) {
    if (!key.startsWith(keyPrefix)) continue;
    try {
      const workout = JSON.parse(localStorage.getItem(key));
      if (workout && typeof workout.createdAt === 'string' && Array.isArray(workout.exercises)) {
        workouts.push(workout);
      }
    } catch { /* ignore unreadable entry */ }
  }
  return workouts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}


// Same rules as backend/src/utils/records.js. Guests use their own local calendar days.
export function personalRecords(workouts) {
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

const localDay = time => { const d = new Date(time); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export function streakDays(workouts, now = Date.now()) {
  const days = new Set(workouts.map(w => localDay(Date.parse(w.createdAt))));
  const day = new Date(now);
  if (!days.has(localDay(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(day))) { streak += 1; day.setDate(day.getDate() - 1); }
  return streak;
}

const newId = () => globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Same rule as the server: compare the first and last third of sessions.
function improvement(scores) {
  if (scores.length < 3) return null;
  const third = Math.ceil(scores.length / 3);
  const mean = list => list.reduce((sum, value) => sum + value, 0) / list.length;
  return Math.round(mean(scores.slice(-third)) - mean(scores.slice(0, third)));
}

const total = (items, field) => items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
const averageScore = workouts => workouts.length
  ? Math.round(total(workouts, 'overallFormScore') / workouts.length)
  : 0;

export const guestWorkouts = {
  save(workoutData) {
    const workout = {
      ...workoutData,
      _id: newId(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(keyPrefix + workout._id, JSON.stringify(workout));
    return { workout };
  },

  history(page, limit) {
    const workouts = readWorkouts();
    const offset = (page - 1) * limit;
    return { workouts: workouts.slice(offset, offset + limit), pagination: { total: workouts.length } };
  },

  dashboard() {
    const workouts = readWorkouts();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = workouts.filter(workout => Date.parse(workout.createdAt) >= weekAgo);

    return {
      hasData: workouts.length > 0,
      summary: {
        totalWorkouts: workouts.length,
        totalReps: total(workouts, 'totalReps'),
        averageFormScore: averageScore(workouts),
        totalDurationSeconds: total(workouts, 'durationSeconds'),
      },
      weekly: {
        workoutCount: weekly.length,
        repCount: total(weekly, 'totalReps'),
        avgScore: averageScore(weekly),
      },
      recentWorkouts: workouts.slice(0, 5),
      streakDays: streakDays(workouts),
      formScoreTrend: workouts.slice(0, 15).reverse().map(workout => ({
        id: workout._id,
        date: new Date(workout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        formScore: workout.overallFormScore,
      })),
    };
  },

  progress() {
    const byExercise = new Map();
    const workouts = readWorkouts();
    const records = personalRecords(workouts);
    for (const workout of [...workouts].reverse()) {
      for (const exercise of workout.exercises) {
        if (!exercise.totalReps && !exercise.holdSeconds) continue;
        if (!byExercise.has(exercise.exerciseName)) byExercise.set(exercise.exerciseName, []);
        byExercise.get(exercise.exerciseName).push(exercise);
      }
    }

    return {
      exercises: Array.from(byExercise, ([exercise, sessions]) => ({
        exercise,
        sessionCount: sessions.length,
        totalReps: total(sessions, 'totalReps'),
        averageFormScore: Math.round(total(sessions, 'averageFormScore') / sessions.length),
        improvementPercent: improvement(sessions.map(session => session.averageFormScore)),
        scoreHistory: sessions.map(session => session.averageFormScore),
        record: records[exercise] || null,
      })),
      streakDays: streakDays(workouts),
    };
  },
};
