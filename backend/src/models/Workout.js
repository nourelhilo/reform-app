const db = require('../config/db');

const columns = `id AS "_id", user_id AS "userId", title, 'completed' AS status,
  started_at AS "startedAt", ended_at AS "endedAt", duration_seconds AS "durationSeconds",
  total_reps AS "totalReps", form_score AS "overallFormScore", exercises, notes, meta,
  created_at AS "createdAt", created_at AS "updatedAt"`;

async function create(userId, workout) {
  const { rows: [row] } = await db.query(`
    INSERT INTO reform_private.workouts
      (user_id, title, started_at, ended_at, duration_seconds, total_reps, form_score, exercises, notes, meta)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)
    RETURNING ${columns}
  `, [
    userId, workout.title, workout.startedAt, workout.endedAt, workout.durationSeconds,
    workout.totalReps, workout.overallFormScore, JSON.stringify(workout.exercises), workout.notes, workout.meta,
  ]);
  return row;
}

async function list(userId, { limit = null, offset = 0, chronological = false } = {}) {
  const direction = chronological ? 'ASC' : 'DESC';
  const { rows } = await db.query(`
    SELECT ${columns} FROM reform_private.workouts WHERE user_id = $1
    ORDER BY created_at ${direction}, id ${direction}
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);
  return rows;
}

async function count(userId) {
  const { rows: [row] } = await db.query(
    'SELECT count(*) AS total FROM reform_private.workouts WHERE user_id = $1', [userId]
  );
  return Number(row.total);
}

async function find(userId, id) {
  const { rows: [row] } = await db.query(
    `SELECT ${columns} FROM reform_private.workouts WHERE user_id = $1 AND id = $2`, [userId, id]
  );
  return row;
}

async function remove(userId, id) {
  const { rowCount } = await db.query(
    'DELETE FROM reform_private.workouts WHERE user_id = $1 AND id = $2', [userId, id]
  );
  return rowCount === 1;
}

module.exports = { create, list, count, find, remove };
