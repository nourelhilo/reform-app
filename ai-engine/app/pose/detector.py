from pathlib import Path
import time

import cv2
import mediapipe as mp


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "saved" / "pose_landmarker.task"


class PoseDetector:
    def __init__(self):
        options = mp.tasks.vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL_PATH)),
            running_mode=mp.tasks.vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.55,
            min_pose_presence_confidence=0.55,
            min_tracking_confidence=0.55,
        )
        self.pose = mp.tasks.vision.PoseLandmarker.create_from_options(options)
        self.timestamp = -1

    def process_frame(self, frame):
        start = time.perf_counter()
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        self.timestamp = max(self.timestamp + 1, int(time.monotonic() * 1000))
        result = self.pose.detect_for_video(image, self.timestamp)
        latency_ms = (time.perf_counter() - start) * 1000

        if not result.pose_landmarks:
            return None, latency_ms
        return [
            {"x": float(lm.x), "y": float(lm.y), "z": float(lm.z),
             "visibility": min(float(lm.visibility), float(lm.presence))}
            for lm in result.pose_landmarks[0]
        ], latency_ms

    def close(self):
        self.pose.close()
