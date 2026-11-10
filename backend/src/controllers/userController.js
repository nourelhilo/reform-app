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
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (preferences && typeof preferences === 'object') {
      for (const key of ['voiceCoaching', 'showSkeletonOverlay']) {
        if (typeof preferences[key] === 'boolean') user.set(`preferences.${key}`, preferences[key]);
      }
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
    const user = req.user;
    const { name, profileImage } = req.body;
    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof profileImage === 'string' && profileImage) user.profileImage = profileImage;
    if (user.isModified()) await user.save();
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
