import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.exercise_classifier import ExerciseClassifier, EXERCISE_LABELS
from app.pose.landmarks import PoseLandmark

def generate_exercise_pose_dataset(samples_per_class: int = 150):
    """
    Generates realistic geometric pose samples for all 5 exercises across
    different phases, variations in body sizes, and noise.
    """
    np.random.seed(42)
    X = []
    y = []

    for exercise in EXERCISE_LABELS:
        for _ in range(samples_per_class):
            # Base skeleton (normalized between 0 and 1)
            landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.95} for _ in range(33)]

            # Add human variation jitter
            noise = np.random.normal(0, 0.015, (33, 3))

            # Set anatomical positions based on exercise kinematics
            if exercise == "squat":
                # Torso upright, knee flexion varying from standing (0.75 y) to parallel squat (0.55 y)
                depth_factor = np.random.uniform(0.0, 1.0)
                hip_y = 0.5 + 0.15 * depth_factor
                knee_y = 0.7 - 0.05 * depth_factor
                knee_x_offset = 0.08 + 0.02 * depth_factor

                landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.42, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.58, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.44, "y": hip_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.56, "y": hip_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_KNEE] = {"x": 0.44 - knee_x_offset, "y": knee_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_KNEE] = {"x": 0.56 + knee_x_offset, "y": knee_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ANKLE] = {"x": 0.42, "y": 0.90, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": 0.58, "y": 0.90, "z": 0.0, "visibility": 0.95}

            elif exercise == "pushup":
                # Horizontal orientation (low Y distance between head/shoulders and hips/ankles)
                depth_factor = np.random.uniform(0.0, 1.0)
                elbow_flex = 0.12 * depth_factor
                landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.35, "y": 0.65 + elbow_flex, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.35, "y": 0.60 + elbow_flex, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ELBOW] = {"x": 0.30, "y": 0.70 + elbow_flex, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ELBOW] = {"x": 0.30, "y": 0.55 + elbow_flex, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_WRIST] = {"x": 0.35, "y": 0.85, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_WRIST] = {"x": 0.35, "y": 0.75, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.60, "y": 0.62 + elbow_flex * 0.5, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.60, "y": 0.58 + elbow_flex * 0.5, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ANKLE] = {"x": 0.88, "y": 0.65, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": 0.88, "y": 0.60, "z": 0.0, "visibility": 0.95}

            elif exercise == "curl":
                # Standing upright, wrists moving from low hip to near shoulders
                curl_progress = np.random.uniform(0.0, 1.0)
                wrist_y = 0.65 - 0.35 * curl_progress
                landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.42, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.58, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ELBOW] = {"x": 0.40, "y": 0.48, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ELBOW] = {"x": 0.60, "y": 0.48, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_WRIST] = {"x": 0.42, "y": wrist_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_WRIST] = {"x": 0.58, "y": wrist_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.44, "y": 0.55, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.56, "y": 0.55, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ANKLE] = {"x": 0.44, "y": 0.92, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": 0.56, "y": 0.92, "z": 0.0, "visibility": 0.95}

            elif exercise == "lunge":
                # Split stance: one foot forward, one foot back
                depth = np.random.uniform(0.2, 1.0)
                landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.45, "y": 0.30, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.55, "y": 0.30, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.46, "y": 0.52 + 0.1 * depth, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.54, "y": 0.52 + 0.1 * depth, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_KNEE] = {"x": 0.35, "y": 0.68 + 0.05 * depth, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_KNEE] = {"x": 0.65, "y": 0.72 + 0.08 * depth, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ANKLE] = {"x": 0.32, "y": 0.88, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": 0.70, "y": 0.90, "z": 0.0, "visibility": 0.95}

            elif exercise == "jumping_jack":
                # Arms out wide, feet out wide
                openness = np.random.uniform(0.0, 1.0)
                wrist_y = 0.65 - 0.50 * openness
                wrist_x_l = 0.40 - 0.25 * openness
                wrist_x_r = 0.60 + 0.25 * openness
                ankle_x_l = 0.45 - 0.20 * openness
                ankle_x_r = 0.55 + 0.20 * openness

                landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.42, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.58, "y": 0.28, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_WRIST] = {"x": wrist_x_l, "y": wrist_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_WRIST] = {"x": wrist_x_r, "y": wrist_y, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.44, "y": 0.52, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.56, "y": 0.52, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.LEFT_ANKLE] = {"x": ankle_x_l, "y": 0.92, "z": 0.0, "visibility": 0.95}
                landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": ankle_x_r, "y": 0.92, "z": 0.0, "visibility": 0.95}

            # Apply slight noise
            for i in range(33):
                landmarks[i]["x"] += float(noise[i, 0])
                landmarks[i]["y"] += float(noise[i, 1])

            from app.analysis.features import extract_normalized_features
            feat = extract_normalized_features(landmarks)
            X.append(feat)
            y.append(exercise)

    return np.array(X, dtype=np.float32), y

def train_and_evaluate():
    print("Generating kinematics dataset for 5 exercises...")
    X, y = generate_exercise_pose_dataset(samples_per_class=200)
    print(f"Dataset shape: {X.shape}, Classes: {set(y)}")

    classifier = ExerciseClassifier()
    metrics = classifier.train_baseline(X, y)
    print("\n--- AI Model Training Results ---")
    print(f"Accuracy: {metrics['accuracy'] * 100:.2f}%")
    print("Confusion Matrix:")
    print(np.array(metrics['confusion_matrix']))
    
    metrics_path = os.path.join(os.path.dirname(__file__), "evaluation_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved evaluation metrics to {metrics_path}")

if __name__ == "__main__":
    train_and_evaluate()
