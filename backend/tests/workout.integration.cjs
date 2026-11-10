const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('auth, preferences, workout history, analytics, and ownership', async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  await database.exec(readFileSync(join(__dirname, '../sql/001_reform.sql'), 'utf8'));
  process.env.SUPABASE_DATABASE_URL = 'postgresql://test@localhost/test';
  const db = require('../src/config/db');
  t.mock.method(db, 'query', async (text, values) => {
    const params = values?.map(value => value === undefined ? null :
      value instanceof Date ? value.toISOString() : value);
    const result = await database.query(text, params);
    return { ...result, rowCount: result.affectedRows };
  });
  process.env.FIREBASE_PROJECT_ID = 'demo-reform';
  // Firebase Admin verifies emulator tokens and checks the account by UID.
  const identity = http.createServer(async (req, res) => {
    if (!req.url.endsWith('accounts:lookup')) {
      res.writeHead(404).end();
      return;
    }
    let payload = '';
    for await (const chunk of req) payload += chunk;
    const { localId = [] } = JSON.parse(payload);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: localId.map(uid => ({
      localId: uid, email: `${uid}@example.test`, disabled: false, validSince: '0',
    })) }));
  }).listen(0, '127.0.0.1');
  await once(identity, 'listening');
  t.after(() => identity.close());
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${identity.address().port}`;

  const request = require('supertest');
  const { initFirebase } = require('../src/config/firebase');
  const app = require('../src/app');
  const firebase = initFirebase();
  t.after(() => firebase.delete());

  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = uid => {
    const now = Math.floor(Date.now() / 1000);
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      iss: 'https://securetoken.google.com/demo-reform', aud: 'demo-reform',
      sub: uid, user_id: uid, auth_time: now, iat: now, exp: now + 3600,
      email: `${uid}@example.test`, firebase: { sign_in_provider: 'password' },
    })}.`;
  };
  const agent = request(app);
  const auth = uid => ['Authorization', `Bearer ${token(uid)}`];
  await agent.get('/api/workouts').expect(401);
  await agent.get('/api/workouts').set('Authorization', 'Bearer bad').expect(401);
  await agent.get('/api/health').expect(200).expect(res => {
    assert.deepEqual(res.body.services.supabase, { configured: true, connected: true });
  });

  const account = auth('athlete');
  const profile = await agent.post('/api/users/sync').set(...account).send({ name: 'Test Athlete' }).expect(200);
  assert.equal(profile.body.user.name, 'Test Athlete');
  assert.equal(profile.body.user.preferences.voiceCoaching, false);
  await agent.put('/api/users/profile').set(...account).send({
    preferences: { voiceCoaching: true, showSkeletonOverlay: false },
  }).expect(200);
  const updated = await agent.get('/api/users/profile').set(...account).expect(200);
  assert.equal(updated.body.user.preferences.voiceCoaching, true);
  assert.equal(updated.body.user.preferences.showSkeletonOverlay, false);

  const workout = {
    title: 'Squats', totalReps: 1, durationSeconds: 12, overallFormScore: 91,
    meta: { poseRuleVersion: 2 },
    exercises: [{ exerciseName: 'squat', totalReps: 1, validReps: 1, averageFormScore: 91,
      durationSeconds: 12, reps: [{ repNumber: 1, formScore: 91, maxRomAngle: 88 }] }],
  };
  const saved = await agent.post('/api/workouts').set(...account).send(workout).expect(201);
  const id = saved.body.workout._id;
  assert.equal(saved.body.workout.meta.poseRuleVersion, 2);
  const history = await agent.get('/api/workouts').set(...account).expect(200);
  assert.deepEqual(history.body.workouts.map(entry => entry._id), [id]);
  await agent.get(`/api/workouts/${id}`).set(...account).expect(200);
  const other = auth('other-athlete');
  await agent.get(`/api/workouts/${id}`).set(...other).expect(404);
  await agent.delete(`/api/workouts/${id}`).set(...other).expect(404);
  const dashboard = await agent.get('/api/analytics/dashboard').set(...account).expect(200);
  assert.equal(dashboard.body.weekly.repCount, 1);
  assert.equal(dashboard.body.summary.totalWorkouts, 1);
  const progress = await agent.get('/api/analytics/progress').set(...account).expect(200);
  assert.equal(progress.body.exercises.find(ex => ex.exercise === 'squat').averageFormScore, 91);
  await agent.delete(`/api/workouts/${id}`).set(...account).expect(200);
  const empty = await agent.get('/api/workouts').set(...account).expect(200);
  assert.equal(empty.body.pagination.total, 0);
});
