import time

import cv2
import numpy as np

from app.exercises.tracking import ExerciseTracker, RULES, VIEWS
from app.pose.detector import PoseDetector


MAX_FRAME_BYTES = 512 * 1024


class WorkoutSessionManager:
    def __init__(self, exercise):
        self.exercise = exercise
        self.detector = PoseDetector()
        self.tracker = ExerciseTracker(exercise)
        self.frame_count = 0
        self.fps_window = time.monotonic()
        self.fps = 0.0

    def set_exercise(self, exercise):
        if exercise not in RULES:
            return False
        self.exercise = exercise
        self.reset_session()
        return True

    def reset_session(self):
        self.tracker = ExerciseTracker(self.exercise)

    def pause(self):
        self.tracker.interrupt()

    def process_image_frame(self, image_bytes):
        start = time.perf_counter()
        frame = None
        if 0 < len(image_bytes) <= MAX_FRAME_BYTES:
            try:
                frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
            except cv2.error:
                pass
        if frame is None or max(frame.shape[:2]) > 1920:
            return self.unavailable("error", "Could not read that camera frame.")

        landmarks, pose_latency = self.detector.process_frame(frame)
        now = time.monotonic()
        self.frame_count += 1
        elapsed = now - self.fps_window
        if elapsed >= 1.0:
            self.fps = round(self.frame_count / elapsed, 1)
            self.frame_count, self.fps_window = 0, now

        result, confidence = self.tracker.track(landmarks, frame.shape[1], frame.shape[0], now)
        if result is None:
            payload = self.unavailable("partial_body", VIEWS[self.exercise]) if landmarks else (
                self.unavailable("no_person", "Step into the camera frame."))
        else:
            angles = result.pop("metrics")
            payload = {
                **result, "exercise": self.exercise, "confidence": confidence,
                "visibility": {"status": "ready", "is_valid": True,
                               "message": "Tracking ready", "overall_confidence": confidence},
                "exerciseMetrics": angles,
            }
        payload["landmarks"] = landmarks
        payload["metrics"] = {
            "fps": self.fps,
            "poseLatencyMs": round(pose_latency, 1),
            "totalLatencyMs": round((time.perf_counter() - start) * 1000, 1),
        }
        return payload

    def unavailable(self, status, message):
        self.pause()
        return {
            "exercise": self.exercise, "rep": self.tracker.cycle.rep_count, "phase": "idle",
            "formScore": self.tracker.cycle.form_score, "instantScore": None,
            "confidence": 0, "feedback": message, "speechCue": None,
            "repCompleted": False, "lastRepDetail": None, "activeJoints": [],
            "exerciseMetrics": {}, "landmarks": None,
            "visibility": {"status": status, "is_valid": False,
                           "message": message, "overall_confidence": 0},
        }

    def close(self):
        self.detector.close()
