const { Pool } = require('pg');
const { resolve } = require('node:path');

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
    if (url.hostname.endsWith('.pooler.supabase.com') || url.hostname.endsWith('.supabase.co')) {
      if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'verify-full');
      if (!url.searchParams.has('sslrootcert')) {
        url.searchParams.set('sslrootcert', resolve(__dirname, '../../certs/supabase-root.crt'));
      }
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
  } catch (error) {
    console.error('Supabase health check failed:', error.code || error.name, error.message);
    return { configured, connected: false, problem: describeDBError(error) };
  }
}

// A short, secret-free hint for the health endpoint so a failed connection can be fixed.
function describeDBError(error) {
  const code = error?.code || '';
  const message = String(error?.message || '');
  if (code === 'ERR_INVALID_URL' || error instanceof TypeError) return 'SUPABASE_DATABASE_URL is not a valid postgresql:// URI.';
  if (code === '28P01' || code === '28000' || /password authentication/i.test(message)) return 'Wrong database user or password.';
  if (/tenant or user not found/i.test(message)) return 'Pooler user not recognized: use the postgres.<project-ref> user from the Connect dialog.';
  if (code === '42P01' || code === '3F000') return 'Reform tables are missing: run backend/sql/001_reform.sql in the SQL Editor.';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Database host not found: check the host in SUPABASE_DATABASE_URL.';
  if (/certificate|self[- ]signed|SSL|TLS/i.test(code + message)) return 'TLS verification failed: use the Supabase pooler host with the bundled certificate.';
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || /timeout/i.test(message)) return 'Database unreachable: check the pooler host, port, and that the project is not paused.';
  return 'Connection failed; see the server logs.';
}

async function closeDB() {
  const current = pool;
  pool = undefined;
  await current?.end();
}

module.exports = { query, getDBStatus, closeDB };
