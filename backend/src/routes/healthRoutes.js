const express = require('express');
const router = express.Router();
const { getDBStatus } = require('../config/db');
const { getFirebaseStatus } = require('../config/firebase');

router.get('/health', async (req, res) => {
  const dbStatus = await getDBStatus();
  const fbStatus = getFirebaseStatus();

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      supabase: dbStatus,
      firebase: {
        configured: fbStatus.configured,
        projectId: fbStatus.projectId,
      },
      aiEngine: {
        expectedUrl: process.env.VITE_AI_ENGINE_WS_URL || 'ws://localhost:8000/ws/workout',
      },
    },
  });
});

module.exports = router;
