const mongoose = require('mongoose');

const repDetailSchema = new mongoose.Schema(
  {
    repNumber: { type: Number, required: true },
    durationSeconds: { type: Number, default: 0 },
    formScore: { type: Number, required: true, min: 0, max: 100 },
    feedbackGiven: [{ type: String }],
    maxRomAngle: { type: Number },
    minRomAngle: { type: Number },
    peakVelocity: { type: Number },
    symmetryScore: { type: Number },
    tempoGood: { type: Boolean },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const exerciseRecordSchema = new mongoose.Schema(
  {
    exerciseName: {
      type: String,
      required: true,
      enum: ['squat', 'pushup', 'curl', 'lunge', 'jumping_jack'],
    },
    totalReps: { type: Number, required: true, default: 0 },
    validReps: { type: Number, required: true, default: 0 },
    averageFormScore: { type: Number, required: true, min: 0, max: 100 },
    durationSeconds: { type: Number, required: true, default: 0 },
    reps: [repDetailSchema],
    keyFeedback: [{ type: String }],
    commonMistakes: [{ type: String }],
    positiveHighlights: [{ type: String }],
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    firebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Workout Session',
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled'],
      default: 'completed',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
    durationSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    totalReps: {
      type: Number,
      required: true,
      default: 0,
    },
    overallFormScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    exercises: [exerciseRecordSchema],
    notes: {
      type: String,
      default: '',
    },
    meta: {
      poseRuleVersion: { type: Number },
      cameraUsed: { type: String, default: 'webcam' },
      avgFps: { type: Number },
      avgPoseLatencyMs: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

workoutSchema.index({ firebaseUid: 1, createdAt: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
