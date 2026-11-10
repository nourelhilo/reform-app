const { Pool } = require('pg');

let pool;

function query(text, values) {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) {
      throw Object.assign(new Error('Account storage is unavailable.'), { status: 503 });
    }
    const url = new URL(connectionString);
    if (process.env.SUPABASE_DATABASE_PASSWORD) {
      url.password = encodeURIComponent(process.env.SUPABASE_DATABASE_PASSWORD);
    }
    pool = new Pool({
      connectionString: url.href,
      max: process.env.VERCEL ? 1 : 5,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', error => console.error('PostgreSQL pool error:', error.code || error.name));
  }
  return pool.query(text, values);
}

async function getDBStatus() {
  const configured = Boolean(process.env.SUPABASE_DATABASE_URL);
  if (!configured) return { configured, connected: false };
  try {
    await module.exports.query(
      'SELECT 1 FROM reform_private.users, reform_private.workouts LIMIT 0'
    );
    return { configured, connected: true };
  } catch {
    return { configured, connected: false };
  }
}

async function closeDB() {
  const current = pool;
  pool = undefined;
  await current?.end();
}

module.exports = { query, getDBStatus, closeDB };
