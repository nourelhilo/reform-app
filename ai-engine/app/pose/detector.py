import cv2
import time
import numpy as np
import mediapipe as mp
from typing import Dict, Any, List, Optional, Tuple

class PoseDetector:
    def __init__(
        self,
        static_image_mode: bool = False,
        model_complexity: int = 1,
        smooth_landmarks: bool = True,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=static_image_mode,
            model_complexity=model_complexity,
            smooth_landmarks=smooth_landmarks,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

    def process_frame(self, frame: np.ndarray) -> Tuple[Optional[List[Dict[str, float]]], float]:
        """
        Process BGR OpenCV frame and extract 33 normalized landmarks.
        Returns: (landmarks_list, latency_ms)
        """
        t0 = time.perf_counter()
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False

        results = self.pose.process(rgb_frame)
        latency_ms = (time.perf_counter() - t0) * 1000.0

        if not results.pose_landmarks:
            return None, latency_ms

        landmarks = []
        for lm in results.pose_landmarks.landmark:
            landmarks.append({
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(lm.visibility),
            })

        return landmarks, latency_ms

    def close(self):
        if self.pose:
            self.pose.close()
