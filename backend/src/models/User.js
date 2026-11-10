const db = require('../config/db');

const defaultPreferences = {
  voiceCoaching: false,
  soundEffects: true,
  units: 'metric',
  preferredExercises: ['squat', 'pushup', 'curl', 'lunge', 'jumping_jack'],
  cameraIndex: 0,
  showSkeletonOverlay: true,
  devOverlay: false,
};

async function findProfile(firebaseUid) {
  const { rows: [user] } = await db.query(`
    SELECT u.id AS "_id", u.firebase_uid AS "firebaseUid", u.email, u.name,
           u.profile_image AS "profileImage", u.preferences,
           u.created_at AS "createdAt", u.updated_at AS "updatedAt",
           (SELECT jsonb_build_object(
             'totalWorkouts', count(*),
             'totalReps', coalesce(sum(total_reps), 0),
             'averageFormScore', coalesce(round(avg(form_score)), 0),
             'totalDurationSeconds', coalesce(sum(duration_seconds), 0)
           ) FROM reform_private.workouts WHERE user_id = u.id) AS stats
    FROM reform_private.users AS u
    WHERE u.firebase_uid = $1
  `, [firebaseUid]);
  if (user) user.preferences = { ...defaultPreferences, ...user.preferences };
  return user;
}

async function getOrCreateProfile({ uid, email, name, picture }) {
  const existing = await findProfile(uid);
  if (existing) return existing;

  await db.query(`
    INSERT INTO reform_private.users (firebase_uid, email, name, profile_image)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (firebase_uid) DO NOTHING
  `, [uid, email.trim().toLowerCase(), (name || email.split('@')[0]).trim(), picture || '']);
  return findProfile(uid);
}

async function updateProfile(firebaseUid, { name, profileImage, preferences = {} }) {
  await db.query(`
    UPDATE reform_private.users
    SET name = coalesce($2, name), profile_image = coalesce($3, profile_image),
        preferences = preferences || $4::jsonb, updated_at = now()
    WHERE firebase_uid = $1
  `, [firebaseUid, name, profileImage, preferences]);
  return findProfile(firebaseUid);
}

module.exports = { getOrCreateProfile, updateProfile };
