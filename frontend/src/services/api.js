/**
 * api.js — Backend REST API client
 * Connects to the Node/Express backend at VITE_API_URL (default: http://localhost:5000/api)
 * All secure endpoints require a verified Firebase ID token.
 */

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Clean base URL to remove trailing slash or duplicate /api
const BASE_URL = rawBase.replace(/\/+$/, '').replace(/\/api$/, '');

const getToken = async (user) => {
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
};

const request = async (method, path, user = null, body = null) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${BASE_URL}${cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`}`;

  const headers = { 'Content-Type': 'application/json' };

  if (user) {
    const token = await getToken(user);
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers, signal: AbortSignal.timeout(10000) };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(fullUrl, opts);

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
};

export const api = {
  // Generic helper methods
  get: (path, user) => request('GET', path, user),
  post: (path, body, user) => request('POST', path, user, body),
  put: (path, body, user) => request('PUT', path, user, body),
  patch: (path, body, user) => request('PUT', path, user, body),
  delete: (path, user) => request('DELETE', path, user),

  // --- Auth / User ---

  /** Sync Firebase user to MongoDB on signup or login */
  syncUser: (user, extraData = {}) =>
    request('POST', '/api/users/sync', user, extraData),

  /** Get current user profile from MongoDB */
  getUserProfile: (user) =>
    request('GET', '/api/users/profile', user),

  /** Update user profile (name, profileImage, preferences) */
  updateUserProfile: (user, updates) =>
    request('PUT', '/api/users/profile', user, updates),

  // --- Workouts ---

  /** Save a completed workout session */
  saveWorkout: (workoutPayload, user) =>
    request('POST', '/api/workouts', user, workoutPayload),

  /** Get paginated workout history */
  getWorkouts: (user, { page = 1, limit = 10 } = {}) =>
    request('GET', `/api/workouts?page=${page}&limit=${limit}`, user),

  /** Get a single workout by ID */
  getWorkout: (user, workoutId) =>
    request('GET', `/api/workouts/${workoutId}`, user),

  /** Delete a workout session */
  deleteWorkout: (user, workoutId) =>
    request('DELETE', `/api/workouts/${workoutId}`, user),

  // --- Analytics ---

  /** Get dashboard overview & weekly trends */
  getDashboardMetrics: (user) =>
    request('GET', '/api/analytics/dashboard', user),

  /** Get exercise-specific progress & score history */
  getProgressAnalytics: (user) =>
    request('GET', '/api/analytics/progress', user),

  /** Analytics aliases */
  getAnalyticsSummary: (user) =>
    request('GET', '/api/analytics/dashboard', user),

  getAnalyticsTrends: (user) =>
    request('GET', '/api/analytics/progress', user),

  // --- Health check (no auth) ---
  health: () =>
    fetch(`${BASE_URL}/api/health`).then((r) => r.json()),
};
