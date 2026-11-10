const User = require('../models/User');

// @desc    Get or sync current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & preferences
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const { name, profileImage, preferences } = req.body;
    const updates = { name: typeof name === 'string' ? name.trim() : undefined,
      profileImage: typeof profileImage === 'string' ? profileImage : undefined, preferences: {} };
    if (preferences && typeof preferences === 'object') {
      for (const key of ['voiceCoaching', 'showSkeletonOverlay']) {
        if (typeof preferences[key] === 'boolean') updates.preferences[key] = preferences[key];
      }
    }

    const user = await User.updateProfile(req.user.firebaseUid, updates);
    res.json({ success: true, user, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync user from Firebase on signup/login
// @route   POST /api/users/sync
// @access  Private
const syncUser = async (req, res, next) => {
  try {
    const { name, profileImage } = req.body;
    const updates = {
      name: typeof name === 'string' ? name.trim() || undefined : undefined,
      profileImage: typeof profileImage === 'string' ? profileImage || undefined : undefined,
    };
    const user = updates.name || updates.profileImage
      ? await User.updateProfile(req.user.firebaseUid, updates)
      : req.user;
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  syncUser,
};
