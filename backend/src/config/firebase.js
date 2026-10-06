const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;
let isFirebaseConfigured = false;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseConfigured = true;
      console.log('\x1b[32m%s\x1b[0m', `✓ Firebase Admin initialized with service account (${serviceAccount.project_id})`);
    } else if (projectId) {
      firebaseApp = admin.initializeApp({
        projectId: projectId,
      });
      isFirebaseConfigured = true;
      console.log('\x1b[32m%s\x1b[0m', `✓ Firebase Admin initialized for project ID: ${projectId}`);
    } else {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  Firebase Warning: No service account or FIREBASE_PROJECT_ID configured.');
      console.warn('\x1b[33m%s\x1b[0m', '   Authentication token verification will reject until Firebase is configured.');
    }
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Firebase Admin Init Error: ${err.message}`);
  }

  return firebaseApp;
};

const getFirebaseStatus = () => ({
  configured: isFirebaseConfigured,
  projectId: process.env.FIREBASE_PROJECT_ID || null,
});

module.exports = { initFirebase, getFirebaseStatus, admin };
