const { admin, getFirebaseStatus } = require('../config/firebase');
const User = require('../models/User');

const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: No Bearer token provided in Authorization header.',
    });
  }

  const token = authHeader.split('Bearer ')[1];
  const { configured } = getFirebaseStatus();

  if (!configured) {
    return res.status(503).json({
      success: false,
      error: 'Authentication service unavailable: Firebase Admin is not configured on backend. Please configure FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID.',
    });
  }

  let identity;
  try {
    identity = await admin.auth().verifyIdToken(token);
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired Firebase token.',
    });
  }

  if (!identity.email) {
    return res.status(403).json({ success: false, error: 'An email address is required for this account.' });
  }

  try {
    req.firebaseUser = identity;
    req.user = await User.findOneAndUpdate(
      { firebaseUid: identity.uid },
      { $setOnInsert: {
        email: identity.email,
        name: identity.name || identity.email.split('@')[0],
        profileImage: identity.picture || '',
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyAuth };
