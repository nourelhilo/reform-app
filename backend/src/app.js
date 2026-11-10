const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const userRoutes = require('./routes/userRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
if (process.env.VERCEL) require('./config/firebase').initFirebase();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found.`,
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
