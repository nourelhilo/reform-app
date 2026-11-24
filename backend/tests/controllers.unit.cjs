// Controller rules that need no database: input limits and analytics math.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const saved = [];
const workouts = [
  { exercises: [{ exerciseName: 'squat', totalReps: 5, averageFormScore: 90 },
    { exerciseName: 'curl', totalReps: 0, averageFormScore: 0 }] },
  { exercises: [{ exerciseName: 'curl', totalReps: 4, averageFormScore: 80 }] },
];
const modelPath = path.join(__dirname, '../src/models/Workout.js');
require.cache[modelPath] = { id: modelPath, filename: modelPath, loaded: true, exports: {
  create: async (_user, workout) => (saved.push(workout), { _id: 'id', ...workout }),
  list: async () => workouts,
} };
const { saveWorkout } = require('../src/controllers/workoutController');
const { getProgressAnalytics } = require('../src/controllers/analyticsController');

const call = async (handler, body) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(b) { this.body = b; return this; } };
  await handler({ user: { _id: 'user' }, body }, res, error => { throw error; });
  return res;
};
const workout = () => ({
  title: `  ${'T'.repeat(300)}`, totalReps: 1, overallFormScore: 91, notes: 'n'.repeat(5000),
  exercises: [{ exerciseName: 'squat', totalReps: 1, validReps: 1, averageFormScore: 91, durationSeconds: 3,
    unexpected: 'x', reps: [{ repNumber: 1, formScore: 91, maxRomAngle: 88, junk: 1, feedbackGiven: ['Cue', 5] }] }],
});

test('saved workouts are trimmed to known fields and sizes', async () => {
  assert.equal((await call(saveWorkout, workout())).code, 201);
  const [stored] = saved;
  assert.equal(stored.title.length, 120);
  assert.equal(stored.notes.length, 2000);
  assert.equal(stored.exercises[0].unexpected, undefined);
  assert.deepEqual(stored.exercises[0].reps[0],
    { repNumber: 1, durationSeconds: undefined, formScore: 91, maxRomAngle: 88, feedbackGiven: ['Cue'] });
});

test('oversized rep lists are rejected', async () => {
  const body = workout();
  body.exercises[0].reps = Array.from({ length: 1001 }, (_, i) => ({ repNumber: i, formScore: 90 }));
  assert.equal((await call(saveWorkout, body)).code, 400);
});

test('skipped exercises do not lower progress averages', async () => {
  const { body } = await call(getProgressAnalytics);
  const curl = body.exercises.find(entry => entry.exercise === 'curl');
  assert.equal(curl.sessionCount, 1);
  assert.equal(curl.averageFormScore, 80);
});
