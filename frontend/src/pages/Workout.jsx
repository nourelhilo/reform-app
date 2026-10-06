import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CameraView } from '../components/CameraView';
import { RepCounter } from '../components/RepCounter';
import { FormScore } from '../components/FormScore';
import { CoachFeedback } from '../components/CoachFeedback';
import { WorkoutTimer } from '../components/WorkoutTimer';
import { DevMetricsOverlay } from '../components/DevMetricsOverlay';
import { useWorkoutSocket } from '../hooks/useWorkoutSocket';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Pause, Play, Square, Wifi, WifiOff, Settings } from 'lucide-react';

export const Workout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedExercises = location.state?.exercises || ['squat'];
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [showDevOverlay, setShowDevOverlay] = useState(import.meta.env.DEV);
  const [showingEndConfirm, setShowingEndConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const startTimeRef = useRef(new Date().toISOString());
  const allSessionDataRef = useRef({});

  const currentExercise = selectedExercises[currentExerciseIndex];

  const {
    exercise,
    repCount,
    phase,
    formScore,
    instantScore,
    confidence,
    feedback,
    visibility,
    landmarks,
    activeJoints,
    exerciseMetrics,
    devMetrics,
    isConnected,
    connectionError,
    repAnimation,
    completedRepsHistory,
    sendFrame,
    changeExercise,
    resetSession,
  } = useWorkoutSocket(currentExercise, false, true);

  // Track reps per exercise
  const handleFrameCapture = useCallback((blob) => {
    if (!isPaused) {
      sendFrame(blob);
    }
  }, [isPaused, sendFrame]);

  const handleTimerTick = useCallback((secs) => {
    setWorkoutDuration(secs);
  }, []);

  const handleNextExercise = () => {
    // Store current exercise data
    allSessionDataRef.current[exercise] = {
      exerciseName: exercise,
      totalReps: repCount,
      validReps: repCount,
      averageFormScore: formScore,
      durationSeconds: workoutDuration,
      reps: completedRepsHistory,
      keyFeedback: [],
    };

    if (currentExerciseIndex < selectedExercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIdx);
      changeExercise(selectedExercises[nextIdx]);
      resetSession();
    } else {
      handleEndWorkout();
    }
  };

  const handleEndWorkout = async () => {
    // Store final exercise
    allSessionDataRef.current[exercise] = {
      exerciseName: exercise,
      totalReps: repCount,
      validReps: repCount,
      averageFormScore: formScore,
      durationSeconds: workoutDuration,
      reps: completedRepsHistory,
      keyFeedback: [],
    };

    const exercises = Object.values(allSessionDataRef.current).filter(e => e.totalReps > 0 || e.durationSeconds > 0);
    const totalReps = exercises.reduce((acc, e) => acc + e.totalReps, 0);
    const overallFormScore = exercises.length > 0
      ? Math.round(exercises.reduce((acc, e) => acc + e.averageFormScore, 0) / exercises.length)
      : 0;

    const workoutPayload = {
      title: `${selectedExercises.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(' & ')} Session`,
      durationSeconds: workoutDuration,
      totalReps,
      overallFormScore,
      exercises: exercises.length > 0 ? exercises : [{
        exerciseName: exercise,
        totalReps: repCount,
        validReps: repCount,
        averageFormScore: formScore,
        durationSeconds: workoutDuration,
        reps: completedRepsHistory,
        keyFeedback: [],
      }],
      startedAt: startTimeRef.current,
      endedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (user) {
        await api.saveWorkout(workoutPayload, user);
      }
    } catch (err) {
      console.warn('Could not save workout to backend:', err.message);
    } finally {
      setSaving(false);
      navigate('/workout/summary', {
        state: { workoutData: workoutPayload }
      });
    }
  };

  const EXERCISE_LABELS = {
    squat: 'Squats',
    pushup: 'Push-ups',
    curl: 'Bicep Curls',
    lunge: 'Lunges',
    jumping_jack: 'Jumping Jacks',
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Top Bar */}
      <div className="h-14 border-b border-border-subtle px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="flex items-center gap-4">
          <WorkoutTimer isActive={!isPaused} onTick={handleTimerTick} />

          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                <WifiOff className="w-3.5 h-3.5" />
                DISCONNECTED
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-surface border border-border-subtle hover:border-text-muted/40 transition-colors text-text-muted"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setShowingEndConfirm(true)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-status-error/10 border border-status-error/30 hover:bg-status-error/20 transition-colors text-rose-400"
          >
            <Square className="w-3.5 h-3.5 fill-rose-400" />
            End
          </button>
        </div>
      </div>

      {/* Main Workout Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Camera View - Large Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative">
            <CameraView
              landmarks={landmarks}
              activeJoints={activeJoints}
              formScore={formScore}
              onFrameCapture={handleFrameCapture}
              targetFps={20}
              showSkeleton={true}
              className="w-full"
            />

            {/* Dev Overlay in corner of camera */}
            {showDevOverlay && (
              <div className="absolute bottom-3 left-3 z-20">
                <DevMetricsOverlay devMetrics={devMetrics} confidence={confidence} isVisible={showDevOverlay} />
              </div>
            )}

            {/* Pause Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-30">
                <div className="text-center">
                  <Pause className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-sm font-mono text-text-muted uppercase tracking-widest">Paused</p>
                </div>
              </div>
            )}
          </div>

          {/* Exercise Progress Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {selectedExercises.map((ex, idx) => (
              <div
                key={ex}
                className={`flex-shrink-0 text-xs font-mono uppercase px-3 py-1.5 rounded-full border transition-colors ${
                  idx === currentExerciseIndex
                    ? 'bg-accent text-white border-accent'
                    : idx < currentExerciseIndex
                    ? 'bg-elevated border-border-subtle text-emerald-400'
                    : 'bg-surface border-border-subtle text-text-muted'
                }`}
              >
                {EXERCISE_LABELS[ex] || ex}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Stats */}
        <div className="flex flex-col gap-4">
          {/* Exercise Name */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5">
            <span className="text-xs uppercase tracking-widest text-text-muted font-mono font-semibold">Current Exercise</span>
            <h2 className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
              {EXERCISE_LABELS[exercise] || exercise.toUpperCase()}
            </h2>
            <span className="text-xs font-mono text-accent uppercase">{phase.replace('_', ' ')}</span>
          </div>

          {/* Rep Count */}
          <RepCounter reps={repCount} isIncrementing={repAnimation} />

          {/* Form Score */}
          <FormScore score={formScore} instantScore={instantScore} phase={phase} />

          {/* Coach Feedback */}
          <CoachFeedback feedback={feedback} visibility={visibility} confidence={confidence} />

          {/* Next Exercise / End Buttons */}
          {selectedExercises.length > 1 && currentExerciseIndex < selectedExercises.length - 1 && (
            <button
              onClick={handleNextExercise}
              className="w-full py-3 bg-elevated hover:bg-[#201E26] border border-border-subtle text-text-primary text-xs font-mono uppercase tracking-wider rounded-xl transition-colors"
            >
              Next: {EXERCISE_LABELS[selectedExercises[currentExerciseIndex + 1]]}
            </button>
          )}

          <button
            onClick={handleEndWorkout}
            disabled={saving}
            className="w-full py-3 bg-status-error/10 hover:bg-status-error/20 border border-status-error/30 text-rose-400 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving Workout...' : 'End Workout'}
          </button>

          {connectionError && (
            <div className="text-xs text-amber-400 text-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              {connectionError}
            </div>
          )}
        </div>
      </div>

      {/* End Confirm Modal */}
      {showingEndConfirm && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-surface border border-border-subtle rounded-3xl p-8 max-w-sm w-full mx-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary mb-2">End Workout?</h3>
            <p className="text-xs text-text-muted mb-6">Your current session data will be saved to MongoDB.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowingEndConfirm(false)}
                className="flex-1 py-2.5 bg-elevated border border-border-subtle text-text-muted text-xs rounded-xl hover:bg-[#201E26] transition-colors font-mono uppercase"
              >
                Continue
              </button>
              <button
                onClick={() => { setShowingEndConfirm(false); handleEndWorkout(); }}
                className="flex-1 py-2.5 bg-status-error/20 border border-status-error/30 text-rose-400 text-xs rounded-xl hover:bg-status-error/30 transition-colors font-mono uppercase"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
