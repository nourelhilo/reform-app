const Workout = require('../models/Workout');

const { ACTIVE_EXERCISES } = require('../config/exercises');

const exerciseNames = new Set(ACTIVE_EXERCISES);
const GRADES = new Set(['A', 'B', 'C', 'D']);
const num = value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : undefined);
const cues = (list, max) => (Array.isArray(list) ? list.filter(item => typeof item === 'string').map(item => item.slice(0, 160)).slice(0, max) : []);

function cleanRep(rep) {
  return {
    repNumber: num(rep.repNumber), durationSeconds: num(rep.durationSeconds), formScore: num(rep.formScore),
    maxRomAngle: num(rep.maxRomAngle), grade: GRADES.has(rep.grade) ? rep.grade : undefined,
    rangeScore: num(rep.rangeScore), controlScore: num(rep.controlScore), faultScore: num(rep.faultScore),
    faults: Array.isArray(rep.faults) ? rep.faults.slice(0, 10)
      .filter(fault => typeof fault?.cue === 'string')
      .map(fault => ({ cue: fault.cue.slice(0, 160), share: num(fault.share) })) : [],
    feedbackGiven: cues(rep.feedbackGiven, 10),
  };
}

function cleanSets(sets) {
  if (!Array.isArray(sets)) return [];
  return sets.slice(0, 20).map(set => ({
    setNumber: num(set?.setNumber), reps: num(set?.reps), seconds: num(set?.seconds),
    averageFormScore: num(set?.averageFormScore),
  })).filter(set => (set.reps ?? 0) >= 0 && (set.seconds ?? 0) >= 0 && (set.reps !== undefined || set.seconds !== undefined));
}
const validScore = value => Number.isFinite(Number(value)) && value != null &&
  Number(value) >= 0 && Number(value) <= 100;
const nonnegative = value => Number.isFinite(Number(value)) && Number(value) >= 0;

const MAX_REPS_PER_EXERCISE = 1000;
const MAX_TITLE = 120;
const MAX_NOTES = 2000;

function validExercise(exercise) {
  if (!exerciseNames.has(exercise?.exerciseName) || !validScore(exercise.averageFormScore)) return false;
  if (Array.isArray(exercise.reps) && exercise.reps.length > MAX_REPS_PER_EXERCISE) return false;
  if (![exercise.totalReps, exercise.validReps, exercise.durationSeconds, exercise.holdSeconds, exercise.weightKg]
    .every(value => nonnegative(value ?? 0))) return false;
  if ((exercise.weightKg ?? 0) > 500 || (exercise.holdSeconds ?? 0) > 6 * 60 * 60) return false;
  return exercise.reps === undefined || (Array.isArray(exercise.reps) &&
    exercise.reps.every(rep => rep?.repNumber != null && nonnegative(rep.repNumber) && validScore(rep.formScore)));
}

function notFound(res) {
  return res.status(404).json({ success: false, error: 'Workout session not found.' });
}

async function saveWorkout(req, res, next) {
  try {
    const { title, durationSeconds = 0, totalReps = 0, overallFormScore = 0,
      exercises, notes, startedAt, endedAt, meta } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > 20) {
      return res.status(400).json({ success: false, error: 'Workout must contain at least one exercise record.' });
    }
    const start = startedAt ? new Date(startedAt) : new Date();
    const end = endedAt ? new Date(endedAt) : new Date();
    if (!exercises.every(validExercise) || !nonnegative(durationSeconds) || !nonnegative(totalReps) ||
        !validScore(overallFormScore) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Workout contains invalid exercise or session data.' });
    }

    const workout = await Workout.create(req.user._id, {
      title: typeof title === 'string' && title.trim()
        ? title.trim().slice(0, MAX_TITLE) : `${exercises[0].exerciseName.toUpperCase()} Session`,
      durationSeconds: Number(durationSeconds),
      totalReps: Number(totalReps),
      overallFormScore: Number(overallFormScore),
      // Keep only known fields so arbitrary client data isn't stored.
      exercises: exercises.map(exercise => ({
        exerciseName: exercise.exerciseName,
        reps: (exercise.reps || []).map(cleanRep),
        sets: cleanSets(exercise.sets),
        plannedSets: num(exercise.plannedSets), repsPerSet: num(exercise.repsPerSet),
        holdSeconds: num(exercise.holdSeconds), weightKg: num(exercise.weightKg),
        keyFeedback: cues(exercise.keyFeedback, 20),
        totalReps: Number(exercise.totalReps ?? 0), validReps: Number(exercise.validReps ?? 0),
        durationSeconds: Number(exercise.durationSeconds ?? 0), averageFormScore: Number(exercise.averageFormScore),
      })),
      notes: typeof notes === 'string' ? notes.slice(0, MAX_NOTES) : '',
      startedAt: start,
      endedAt: end,
      meta: meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {},
    });
    res.status(201).json({ success: true, workout, message: 'Workout saved successfully' });
  } catch (error) {
    next(error);
  }
}

async function getWorkouts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({ success: false, error: 'Invalid workout page.' });
    }
    const [workouts, total] = await Promise.all([
      Workout.list(req.user._id, { limit, offset }),
      Workout.count(req.user._id),
    ]);
    res.json({ success: true, workouts, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

async function getWorkoutById(req, res, next) {
  try {
    const workout = await Workout.find(req.user._id, req.params.id);
    if (!workout) return notFound(res);
    res.json({ success: true, workout });
  } catch (error) {
    next(error);
  }
}

async function deleteWorkout(req, res, next) {
  try {
    if (!await Workout.remove(req.user._id, req.params.id)) return notFound(res);
    res.json({ success: true, message: 'Workout deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { saveWorkout, getWorkouts, getWorkoutById, deleteWorkout };
