const Workout = require('../models/Workout');
const User = require('../models/User');

// @desc    Create and save completed workout
// @route   POST /api/workouts
// @access  Private
const saveWorkout = async (req, res, next) => {
  try {
    const {
      title,
      durationSeconds,
      totalReps,
      overallFormScore,
      exercises,
      notes,
      startedAt,
      endedAt,
      meta,
    } = req.body;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Workout must contain at least one exercise record.',
      });
    }

    const workout = await Workout.create({
      userId: req.user._id,
      firebaseUid: req.firebaseUser.uid,
      title: title || `${exercises[0]?.exerciseName?.toUpperCase() || 'Workout'} Session`,
      durationSeconds: Number(durationSeconds) || 0,
      totalReps: Number(totalReps) || 0,
      overallFormScore: Number(overallFormScore) || 0,
      exercises: exercises,
      notes: notes || '',
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: endedAt ? new Date(endedAt) : new Date(),
      meta: meta || {},
    });

    // Update aggregate stats on user
    const userWorkouts = await Workout.find({ userId: req.user._id });
    const totalWorkoutCount = userWorkouts.length;
    const allReps = userWorkouts.reduce((acc, w) => acc + (w.totalReps || 0), 0);
    const allDuration = userWorkouts.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);
    const avgScore = Math.round(
      userWorkouts.reduce((acc, w) => acc + (w.overallFormScore || 0), 0) / totalWorkoutCount
    );

    await User.findByIdAndUpdate(req.user._id, {
      stats: {
        totalWorkouts: totalWorkoutCount,
        totalReps: allReps,
        averageFormScore: avgScore,
        totalDurationSeconds: allDuration,
      },
    });

    res.status(201).json({
      success: true,
      workout,
      message: 'Workout saved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's workout history with pagination
// @route   GET /api/workouts
// @access  Private
const getWorkouts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [workouts, total] = await Promise.all([
      Workout.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Workout.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      success: true,
      workouts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single workout details
// @route   GET /api/workouts/:id
// @access  Private
const getWorkoutById = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        error: 'Workout session not found.',
      });
    }

    res.json({
      success: true,
      workout,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a workout record
// @route   DELETE /api/workouts/:id
// @access  Private
const deleteWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        error: 'Workout session not found.',
      });
    }

    // Refresh user stats
    const remainingWorkouts = await Workout.find({ userId: req.user._id });
    const count = remainingWorkouts.length;
    const totalReps = remainingWorkouts.reduce((acc, w) => acc + (w.totalReps || 0), 0);
    const totalDuration = remainingWorkouts.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);
    const avgScore = count > 0 ? Math.round(remainingWorkouts.reduce((acc, w) => acc + (w.overallFormScore || 0), 0) / count) : 0;

    await User.findByIdAndUpdate(req.user._id, {
      stats: {
        totalWorkouts: count,
        totalReps,
        averageFormScore: avgScore,
        totalDurationSeconds: totalDuration,
      },
    });

    res.json({
      success: true,
      message: 'Workout deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveWorkout,
  getWorkouts,
  getWorkoutById,
  deleteWorkout,
};
