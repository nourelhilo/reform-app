const User = require('../models/User');

// @desc    Get or sync current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found in database.' });
    }
    res.json({ success: true, user });
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
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found in database.' });
    }

    if (name !== undefined) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (preferences) {
      user.preferences = {
        ...user.preferences.toObject(),
        ...preferences,
      };
    }

    await user.save();
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
    const { uid, email, name, picture } = req.firebaseUser;
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email: email || '',
        name: name || req.body.name || email?.split('@')[0] || 'Athlete',
        profileImage: picture || req.body.profileImage || '',
      });
      console.log(`[User Sync] Created new user in MongoDB for Firebase UID: ${uid}`);
    } else {
      if (req.body.name && req.body.name !== user.name) user.name = req.body.name;
      if (req.body.profileImage && req.body.profileImage !== user.profileImage) user.profileImage = req.body.profileImage;
      await user.save();
    }

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
