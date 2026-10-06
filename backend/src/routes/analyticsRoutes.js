const express = require('express');
const router = express.Router();
const { getDashboardMetrics, getProgressAnalytics } = require('../controllers/analyticsController');
const { verifyAuth } = require('../middleware/auth');

router.use(verifyAuth);

router.get('/dashboard', getDashboardMetrics);
router.get('/progress', getProgressAnalytics);

module.exports = router;
