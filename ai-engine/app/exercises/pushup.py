import time
from enum import Enum
from typing import Dict, Any, List, Optional
from app.analysis.angles import calculate_angle_2d
from app.pose.landmarks import PoseLandmark
from app.coaching.feedback import FeedbackManager

class PushupState(str, Enum):
    PLANK = "plank"
    DESCENDING = "descending"
    BOTTOM = "bottom"
    ASCENDING = "ascending"

class PushupAnalyzer:
    def __init__(self):
        self.state = PushupState.PLANK
        self.rep_count = 0
        self.feedback_manager = FeedbackManager(cooldown_seconds=2.0)
        
        self.min_elbow_angle = 180.0
        self.rep_start_time = 0.0
        self.current_rep_scores = []
        self.current_rep_issues = set()
        self.completed_reps = []

        # Thresholds
        self.TOP_ELBOW_ANGLE = 155.0
        self.DESCEND_TRIGGER = 145.0
        self.BOTTOM_ELBOW_ANGLE = 90.0
        self.MIN_ROM_REQUIRED = 105.0
        self.MIN_REP_DURATION = 0.9

    def analyze(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        now = time.time()

        # Extract joints
        l_shoulder = (landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"])
        r_shoulder = (landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"])
        l_elbow = (landmarks[PoseLandmark.LEFT_ELBOW]["x"], landmarks[PoseLandmark.LEFT_ELBOW]["y"])
        r_elbow = (landmarks[PoseLandmark.RIGHT_ELBOW]["x"], landmarks[PoseLandmark.RIGHT_ELBOW]["y"])
        l_wrist = (landmarks[PoseLandmark.LEFT_WRIST]["x"], landmarks[PoseLandmark.LEFT_WRIST]["y"])
        r_wrist = (landmarks[PoseLandmark.RIGHT_WRIST]["x"], landmarks[PoseLandmark.RIGHT_WRIST]["y"])
        l_hip = (landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"])
        r_hip = (landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"])
        l_ankle = (landmarks[PoseLandmark.LEFT_ANKLE]["x"], landmarks[PoseLandmark.LEFT_ANKLE]["y"])
        r_ankle = (landmarks[PoseLandmark.RIGHT_ANKLE]["x"], landmarks[PoseLandmark.RIGHT_ANKLE]["y"])

        # Elbow flexion
        l_elbow_angle = calculate_angle_2d(l_shoulder, l_elbow, l_wrist)
        r_elbow_angle = calculate_angle_2d(r_shoulder, r_elbow, r_wrist)
        avg_elbow = (l_elbow_angle + r_elbow_angle) / 2.0

        # Body alignment (Spine/Hip angle)
        l_body_angle = calculate_angle_2d(l_shoulder, l_hip, l_ankle)
        r_body_angle = calculate_angle_2d(r_shoulder, r_hip, r_ankle)
        avg_body_angle = (l_body_angle + r_body_angle) / 2.0

        issues = []
        positives = []
        instant_score = 100

        # Form checks: Hip sag vs pike
        if avg_body_angle < 155.0:
            instant_score -= 25
            issues.append("Keep your core tight and hips aligned.")
            self.current_rep_issues.add("Hip sag or pike (body out of alignment)")

        # Symmetry
        elbow_diff = abs(l_elbow_angle - r_elbow_angle)
        if elbow_diff > 20.0:
            instant_score -= 15
            issues.append("Push evenly with both arms.")
            self.current_rep_issues.add("Asymmetric arm push")

        # State transitions
        rep_completed = False
        rep_detail = None

        if self.state == PushupState.PLANK:
            self.min_elbow_angle = 180.0
            if avg_elbow < self.DESCEND_TRIGGER:
                self.state = PushupState.DESCENDING
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()

        elif self.state == PushupState.DESCENDING:
            self.min_elbow_angle = min(self.min_elbow_angle, avg_elbow)
            self.current_rep_scores.append(instant_score)

            if avg_elbow <= self.BOTTOM_ELBOW_ANGLE:
                self.state = PushupState.BOTTOM
                positives.append("Good push-up depth.")
            elif avg_elbow > self.TOP_ELBOW_ANGLE - 5 and (now - self.rep_start_time) > 0.4:
                self.state = PushupState.PLANK

        elif self.state == PushupState.BOTTOM:
            self.min_elbow_angle = min(self.min_elbow_angle, avg_elbow)
            self.current_rep_scores.append(instant_score)

            if avg_elbow > self.BOTTOM_ELBOW_ANGLE + 15:
                self.state = PushupState.ASCENDING

        elif self.state == PushupState.ASCENDING:
            self.current_rep_scores.append(instant_score)

            if avg_elbow >= self.TOP_ELBOW_ANGLE:
                duration = now - self.rep_start_time
                if self.min_elbow_angle <= self.MIN_ROM_REQUIRED and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    rep_completed = True

                    avg_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    if self.min_elbow_angle > self.BOTTOM_ELBOW_ANGLE:
                        avg_score = max(avg_score - 15, 50)
                        self.current_rep_issues.add("Partial depth (did not reach 90 degrees)")
                    else:
                        positives.append("Excellent push-up depth!")

                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_score, 100), 40),
                        "maxRomAngle": round(self.min_elbow_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 1.2,
                    }
                    self.completed_reps.append(rep_detail)

                self.state = PushupState.PLANK

        active_feedback = self.feedback_manager.update(issues, positives, is_in_motion=self.state != PushupState.PLANK)
        speech_cue = self.feedback_manager.get_speech_event()

        overall_score = int(sum(r["formScore"] for r in self.completed_reps) / len(self.completed_reps)) if self.completed_reps else instant_score

        return {
            "exercise": "pushup",
            "rep": self.rep_count,
            "phase": self.state.value,
            "formScore": max(min(overall_score, 100), 20),
            "instantScore": max(min(instant_score, 100), 20),
            "feedback": active_feedback,
            "speechCue": speech_cue,
            "repCompleted": rep_completed,
            "lastRepDetail": rep_detail,
            "activeJoints": [
                PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
                PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST
            ],
            "metrics": {
                "elbowAngle": round(avg_elbow, 1),
                "bodyAngle": round(avg_body_angle, 1),
                "minDepthAngle": round(self.min_elbow_angle, 1)
            }
        }
