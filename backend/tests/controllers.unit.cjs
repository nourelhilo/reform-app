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
  assert.equal(stored.exercises[0].reps[0].junk, undefined);
  assert.equal(stored.exercises[0].reps[0].maxRomAngle, 88);
  assert.deepEqual(stored.exercises[0].reps[0].feedbackGiven, ['Cue']);
});

test('grades, faults and sets are kept; bad values are dropped', async () => {
  const body = workout();
  Object.assign(body.exercises[0], { exerciseName: 'lunge', plannedSets: 2, repsPerSet: 10,
    sets: [{ setNumber: 1, reps: 1, averageFormScore: 91 }, { reps: 'x' }] });
  Object.assign(body.exercises[0].reps[0], { grade: 'A', rangeScore: 40, faults: [{ cue: 'Cue', share: 0.2 }, { bad: 1 }] });
  const res = await call(saveWorkout, body);
  assert.equal(res.code, 201);
  const stored = saved.at(-1).exercises[0];
  assert.equal(stored.exerciseName, 'lunge');
  assert.equal(stored.reps[0].grade, 'A');
  assert.deepEqual(stored.reps[0].faults, [{ cue: 'Cue', share: 0.2 }]);
  assert.deepEqual(stored.sets, [{ setNumber: 1, reps: 1, seconds: undefined, averageFormScore: 91 }]);
  assert.equal(stored.repsPerSet, 10);
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

test('personal records and streaks', () => {
  const { personalRecords, streakDays } = require('../src/utils/records');
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 24, 12);
  const at = daysAgo => new Date(now - daysAgo * day).toISOString();
  const history = [
    { createdAt: at(0), exercises: [{ exerciseName: 'plank', totalReps: 0, holdSeconds: 95, averageFormScore: 88,
      sets: [{ seconds: 60.4 }, { seconds: 35 }] }] },
    { createdAt: at(1), exercises: [{ exerciseName: 'curl', totalReps: 22, averageFormScore: 91, weightKg: 12.5,
      sets: [{ reps: 12 }, { reps: 10 }] }] },
    { createdAt: at(2), exercises: [{ exerciseName: 'curl', totalReps: 0, averageFormScore: 0 }] },
    { createdAt: at(4), exercises: [{ exerciseName: 'curl', totalReps: 15, averageFormScore: 70 }] },
  ];
  const records = personalRecords(history);
  assert.deepEqual(records.plank, { bestSetReps: 0, longestHoldSeconds: 60, bestFormScore: 88, heaviestKg: 0 });
  assert.deepEqual(records.curl, { bestSetReps: 15, longestHoldSeconds: 0, bestFormScore: 91, heaviestKg: 12.5 });
  assert.equal(streakDays(history, now), 3);                 // today, yesterday, 2 days ago
  assert.equal(streakDays(history.slice(1), now), 2);        // nothing today yet: still counts from yesterday
  assert.equal(streakDays(history.slice(3), now), 0);
});

test('hold exercises save with seconds and weights', async () => {
  const body = workout();
  Object.assign(body.exercises[0], { exerciseName: 'plank', totalReps: 0, validReps: 0, holdSeconds: 45, reps: [],
    sets: [{ setNumber: 1, seconds: 45, averageFormScore: 90 }] });
  body.totalReps = 0;
  const res = await call(saveWorkout, body);
  assert.equal(res.code, 201);
  const stored = saved.at(-1).exercises[0];
  assert.equal(stored.holdSeconds, 45);
  assert.deepEqual(stored.sets, [{ setNumber: 1, reps: undefined, seconds: 45, averageFormScore: 90 }]);
  const heavy = workout();
  heavy.exercises[0].weightKg = 900;
  assert.equal((await call(saveWorkout, heavy)).code, 400);
});
