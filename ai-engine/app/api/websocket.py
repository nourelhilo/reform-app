import json
import time
import base64
import cv2
import numpy as np
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

from app.pose.detector import PoseDetector
from app.pose.landmarks import evaluate_body_visibility
from app.exercises.squat import SquatAnalyzer
from app.exercises.pushup import PushupAnalyzer
from app.exercises.curl import BicepCurlAnalyzer
from app.exercises.lunge import LungeAnalyzer
from app.exercises.jumping_jack import JumpingJackAnalyzer
from app.models.exercise_classifier import ExerciseClassifier

class WorkoutSessionManager:
    def __init__(self):
        self.detector = PoseDetector(model_complexity=1, smooth_landmarks=True)
        self.classifier = ExerciseClassifier()
        self.analyzers = {
            "squat": SquatAnalyzer(),
            "pushup": PushupAnalyzer(),
            "curl": BicepCurlAnalyzer(),
            "lunge": LungeAnalyzer(),
            "jumping_jack": JumpingJackAnalyzer(),
        }
        self.current_exercise = "squat"
        self.auto_detect = False
        self.frame_count = 0
        self.last_fps_calc_time = time.time()
        self.fps = 0.0

    def set_exercise(self, exercise_name: str, auto_detect: bool = False):
        if exercise_name in self.analyzers:
            self.current_exercise = exercise_name
            self.auto_detect = auto_detect

    def reset_session(self):
        for name in self.analyzers:
            if name == "squat": self.analyzers[name] = SquatAnalyzer()
            elif name == "pushup": self.analyzers[name] = PushupAnalyzer()
            elif name == "curl": self.analyzers[name] = BicepCurlAnalyzer()
            elif name == "lunge": self.analyzers[name] = LungeAnalyzer()
            elif name == "jumping_jack": self.analyzers[name] = JumpingJackAnalyzer()

    def process_image_frame(self, image_bytes: bytes) -> Dict[str, Any]:
        """Processes a single camera frame from client, performs pose estimation and kinematic state machine."""
        t_start = time.perf_counter()
        
        # Calculate FPS
        self.frame_count += 1
        now = time.time()
        if now - self.last_fps_calc_time >= 1.0:
            self.fps = round(self.frame_count / (now - self.last_fps_calc_time), 1)
            self.frame_count = 0
            self.last_fps_calc_time = now

        # Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {
                "error": "Failed to decode frame",
                "visibility": {"status": "error", "is_valid": False, "message": "Invalid video frame"}
            }

        # 1. Pose estimation
        landmarks, pose_latency = self.detector.process_frame(frame)

        if not landmarks:
            return {
                "exercise": self.current_exercise,
                "rep": self.analyzers[self.current_exercise].rep_count,
                "phase": "idle",
                "formScore": 0,
                "confidence": 0.0,
                "feedback": "No person detected. Step into frame.",
                "visibility": {
                    "status": "no_person",
                    "is_valid": False,
                    "message": "No person detected. Step into frame.",
                    "overall_confidence": 0.0
                },
                "landmarks": None,
                "metrics": {
                    "fps": self.fps or 30.0,
                    "poseLatencyMs": round(pose_latency, 1),
                    "inferenceLatencyMs": 0.0,
                }
            }

        # 2. Body visibility check
        visibility_eval = evaluate_body_visibility(landmarks)
        if not visibility_eval["is_valid"]:
            return {
                "exercise": self.current_exercise,
                "rep": self.analyzers[self.current_exercise].rep_count,
                "phase": "idle",
                "formScore": 0,
                "confidence": visibility_eval["overall_confidence"],
                "feedback": visibility_eval["message"],
                "visibility": visibility_eval,
                "landmarks": landmarks,
                "metrics": {
                    "fps": self.fps or 30.0,
                    "poseLatencyMs": round(pose_latency, 1),
                    "inferenceLatencyMs": 0.0,
                }
            }

        # 3. ML Auto-detection (if enabled)
        t_inf_start = time.perf_counter()
        ml_confidence = visibility_eval["overall_confidence"]
        if self.auto_detect:
            detected_ex, conf = self.classifier.predict(landmarks)
            if conf >= 0.70:
                self.current_exercise = detected_ex
                ml_confidence = conf

        # 4. Exercise Kinematic State Machine Analysis
        analyzer = self.analyzers[self.current_exercise]
        analysis_result = analyzer.analyze(landmarks)
        inf_latency = (time.perf_counter() - t_inf_start) * 1000.0

        return {
            "exercise": self.current_exercise,
            "rep": analysis_result["rep"],
            "phase": analysis_result["phase"],
            "formScore": analysis_result["formScore"],
            "instantScore": analysis_result["instantScore"],
            "confidence": ml_confidence,
            "feedback": analysis_result["feedback"],
            "speechCue": analysis_result["speechCue"],
            "repCompleted": analysis_result["repCompleted"],
            "lastRepDetail": analysis_result["lastRepDetail"],
            "activeJoints": analysis_result["activeJoints"],
            "landmarks": landmarks,
            "visibility": visibility_eval,
            "exerciseMetrics": analysis_result["metrics"],
            "metrics": {
                "fps": self.fps or 30.0,
                "poseLatencyMs": round(pose_latency, 1),
                "inferenceLatencyMs": round(inf_latency, 1),
                "totalLatencyMs": round((time.perf_counter() - t_start) * 1000.0, 1),
            }
        }

    def close(self):
        self.detector.close()
