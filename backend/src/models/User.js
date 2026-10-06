const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    profileImage: {
      type: String,
      default: '',
    },
    preferences: {
      voiceCoaching: {
        type: Boolean,
        default: true,
      },
      soundEffects: {
        type: Boolean,
        default: true,
      },
      units: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'metric',
      },
      preferredExercises: {
        type: [String],
        default: ['squat', 'pushup', 'curl', 'lunge', 'jumping_jack'],
      },
      cameraIndex: {
        type: Number,
        default: 0,
      },
      showSkeletonOverlay: {
        type: Boolean,
        default: true,
      },
      devOverlay: {
        type: Boolean,
        default: false,
      },
    },
    stats: {
      totalWorkouts: {
        type: Number,
        default: 0,
      },
      totalReps: {
        type: Number,
        default: 0,
      },
      averageFormScore: {
        type: Number,
        default: 0,
      },
      totalDurationSeconds: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
