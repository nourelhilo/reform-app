const Workout = require('../models/Workout');

// @desc    Get dashboard summary metrics and weekly trends
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardMetrics = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    if (workouts.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        summary: {
          totalWorkouts: 0,
          totalReps: 0,
          averageFormScore: 0,
          totalDurationSeconds: 0,
        },
        weekly: {
          workoutCount: 0,
          repCount: 0,
          avgScore: 0,
        },
        recentWorkouts: [],
        formScoreTrend: [],
      });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last7DaysWorkouts = workouts.filter(w => new Date(w.createdAt) >= oneWeekAgo);
    const weeklyWorkouts = last7DaysWorkouts.length;
    const weeklyReps = last7DaysWorkouts.reduce((acc, w) => acc + (w.totalReps || 0), 0);
    const weeklyAvgScore = weeklyWorkouts > 0
      ? Math.round(last7DaysWorkouts.reduce((acc, w) => acc + (w.overallFormScore || 0), 0) / weeklyWorkouts)
      : 0;

    // Form score trend (chronological)
    const formScoreTrend = workouts
      .slice(0, 15)
      .reverse()
      .map(w => ({
        id: w._id,
        date: new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        formScore: w.overallFormScore,
        reps: w.totalReps,
        title: w.title,
      }));

    res.json({
      success: true,
      hasData: true,
      summary: req.user.stats || {
        totalWorkouts: workouts.length,
        totalReps: workouts.reduce((acc, w) => acc + (w.totalReps || 0), 0),
        averageFormScore: Math.round(workouts.reduce((acc, w) => acc + (w.overallFormScore || 0), 0) / workouts.length),
        totalDurationSeconds: workouts.reduce((acc, w) => acc + (w.durationSeconds || 0), 0),
      },
      weekly: {
        workoutCount: weeklyWorkouts,
        repCount: weeklyReps,
        avgScore: weeklyAvgScore,
      },
      recentWorkouts: workouts.slice(0, 5),
      formScoreTrend,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed progress analytics per exercise
// @route   GET /api/analytics/progress
// @access  Private
const getProgressAnalytics = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .lean();

    if (workouts.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        message: 'No workouts recorded yet. Complete a workout to view analytics.',
      });
    }

    // Exercise breakdown
    const exerciseStats = {
      squat: { count: 0, reps: 0, scores: [] },
      pushup: { count: 0, reps: 0, scores: [] },
      curl: { count: 0, reps: 0, scores: [] },
      lunge: { count: 0, reps: 0, scores: [] },
      jumping_jack: { count: 0, reps: 0, scores: [] },
    };

    workouts.forEach(w => {
      w.exercises?.forEach(ex => {
        const name = ex.exerciseName;
        if (exerciseStats[name]) {
          exerciseStats[name].count += 1;
          exerciseStats[name].reps += ex.totalReps || 0;
          exerciseStats[name].scores.push(ex.averageFormScore);
        }
      });
    });

    const exerciseSummaries = Object.keys(exerciseStats).map(name => {
      const stat = exerciseStats[name];
      const avg = stat.scores.length > 0
        ? Math.round(stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length)
        : 0;

      // Calculate real improvement if >= 3 data points
      let improvement = null;
      if (stat.scores.length >= 3) {
        const firstThird = stat.scores.slice(0, Math.ceil(stat.scores.length / 3));
        const lastThird = stat.scores.slice(-Math.ceil(stat.scores.length / 3));
        const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
        const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
        improvement = Math.round(lastAvg - firstAvg);
      }

      return {
        exercise: name,
        sessionCount: stat.count,
        totalReps: stat.reps,
        averageFormScore: avg,
        improvementPercent: improvement,
        scoreHistory: stat.scores,
      };
    });

    res.json({
      success: true,
      hasData: true,
      totalWorkouts: workouts.length,
      exercises: exerciseSummaries,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getProgressAnalytics,
};
