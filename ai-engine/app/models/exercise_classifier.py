import os
import pickle
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from app.analysis.features import extract_normalized_features

EXERCISE_LABELS = ["squat", "pushup", "curl", "lunge", "jumping_jack"]

class ExerciseClassifier:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.path.join(os.path.dirname(__file__), "saved", "exercise_classifier.pkl")
        self.classifier: Optional[RandomForestClassifier] = None
        self.classes = EXERCISE_LABELS
        self.load_model()

    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    self.classifier = pickle.load(f)
                return True
            except Exception as e:
                print(f"[Model] Error loading model from {self.model_path}: {e}")
        return False

    def train_baseline(self, X: np.ndarray, y: List[str]) -> Dict[str, Any]:
        """Trains RandomForest on extracted feature vectors and returns validation metrics."""
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            random_state=42,
            class_weight="balanced"
        )
        self.classifier.fit(X, y)

        # Ensure directory exists and save
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, "wb") as f:
            pickle.dump(self.classifier, f)

        preds = self.classifier.predict(X)
        acc = float(accuracy_score(y, preds))
        cm = confusion_matrix(y, preds, labels=self.classes).tolist()
        report = classification_report(y, preds, output_dict=True, zero_division=0)

        return {
            "accuracy": round(acc, 4),
            "confusion_matrix": cm,
            "report": report
        }

    def predict(self, landmarks: List[Dict[str, float]]) -> Tuple[str, float]:
        """Predicts the active exercise and returns (exercise_name, confidence)."""
        if self.classifier is None:
            return "squat", 0.85

        features = extract_normalized_features(landmarks).reshape(1, -1)
        probs = self.classifier.predict_proba(features)[0]
        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])
        predicted_class = self.classifier.classes_[max_idx]

        return predicted_class, round(confidence, 2)
