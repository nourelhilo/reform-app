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

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // Find or automatically link user in MongoDB
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Athlete',
        profileImage: decodedToken.picture || '',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      error: `Unauthorized: Invalid or expired Firebase authentication token (${error.message})`,
    });
  }
};

module.exports = { verifyAuth };
