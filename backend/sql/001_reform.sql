BEGIN;

CREATE SCHEMA IF NOT EXISTS reform_private;
REVOKE ALL ON SCHEMA reform_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS reform_private.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  profile_image text NOT NULL DEFAULT '',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reform_private.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES reform_private.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_seconds double precision NOT NULL CHECK (duration_seconds >= 0),
  total_reps double precision NOT NULL CHECK (total_reps >= 0),
  form_score double precision NOT NULL CHECK (form_score BETWEEN 0 AND 100),
  exercises jsonb NOT NULL CHECK (jsonb_typeof(exercises) = 'array' AND jsonb_array_length(exercises) > 0),
  notes text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reform_workouts_by_user
  ON reform_private.workouts (user_id, created_at DESC, id DESC);

ALTER TABLE reform_private.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reform_private.workouts ENABLE ROW LEVEL SECURITY;

COMMIT;
