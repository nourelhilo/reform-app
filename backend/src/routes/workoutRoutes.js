const express = require('express');
const router = express.Router();
const {
  saveWorkout,
  getWorkouts,
  getWorkoutById,
  deleteWorkout,
} = require('../controllers/workoutController');
const { verifyAuth } = require('../middleware/auth');

router.use(verifyAuth);

router.route('/')
  .post(saveWorkout)
  .get(getWorkouts);

router.route('/:id')
  .get(getWorkoutById)
  .delete(deleteWorkout);

module.exports = router;
