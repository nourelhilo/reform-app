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
      formScoreTrend: workouts.slice(0, 15).reverse().map(workout => ({
        id: workout._id,
        date: new Date(workout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        formScore: workout.overallFormScore,
      })),
    };
  },

  progress() {
    const byExercise = new Map();
    for (const workout of readWorkouts().reverse()) {
      for (const exercise of workout.exercises) {
        if (!exercise.totalReps) continue;
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
      })),
    };
  },
};
