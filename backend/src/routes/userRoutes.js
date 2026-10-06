const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, syncUser } = require('../controllers/userController');
const { verifyAuth } = require('../middleware/auth');

router.get('/profile', verifyAuth, getUserProfile);
router.put('/profile', verifyAuth, updateUserProfile);
router.post('/sync', verifyAuth, syncUser);

module.exports = router;
