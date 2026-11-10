const keyPrefix = 'reform.guest-workout.';

function readWorkouts() {
  const workouts = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(keyPrefix)) continue;
    const value = localStorage.getItem(key);
    if (value) workouts.push(JSON.parse(value));
  }
  return workouts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const total = (items, field) => items.reduce((sum, item) => sum + item[field], 0);
const averageScore = workouts => workouts.length
  ? Math.round(total(workouts, 'overallFormScore') / workouts.length)
  : 0;

export const guestWorkouts = {
  save(workoutData) {
    const workout = {
      ...workoutData,
      _id: crypto.randomUUID(),
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
    for (const workout of readWorkouts()) {
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
        improvementPercent: null,
      })),
    };
  },
};
