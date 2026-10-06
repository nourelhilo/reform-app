import time
from enum import Enum
from typing import Dict, Any, List, Optional
from app.analysis.angles import calculate_angle_2d, calculate_vertical_angle
from app.pose.landmarks import PoseLandmark
from app.coaching.feedback import FeedbackManager

class LungeState(str, Enum):
    STANDING = "standing"
    DESCENDING = "descending"
    BOTTOM = "bottom"
    ASCENDING = "ascending"

class LungeAnalyzer:
    def __init__(self):
        self.state = LungeState.STANDING
        self.rep_count = 0
        self.feedback_manager = FeedbackManager(cooldown_seconds=2.0)
        
        self.min_knee_angle = 180.0
        self.rep_start_time = 0.0
        self.current_rep_scores = []
        self.current_rep_issues = set()
        self.completed_reps = []

        # Thresholds
        self.STANDING_KNEE_ANGLE = 160.0
        self.DESCEND_TRIGGER = 145.0
        self.BOTTOM_LUNGE_ANGLE = 95.0
        self.MIN_ROM_REQUIRED = 115.0
        self.MIN_REP_DURATION = 1.0

    def analyze(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        now = time.time()

        l_hip = (landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"])
        r_hip = (landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"])
        l_knee = (landmarks[PoseLandmark.LEFT_KNEE]["x"], landmarks[PoseLandmark.LEFT_KNEE]["y"])
        r_knee = (landmarks[PoseLandmark.RIGHT_KNEE]["x"], landmarks[PoseLandmark.RIGHT_KNEE]["y"])
        l_ankle = (landmarks[PoseLandmark.LEFT_ANKLE]["x"], landmarks[PoseLandmark.LEFT_ANKLE]["y"])
        r_ankle = (landmarks[PoseLandmark.RIGHT_ANKLE]["x"], landmarks[PoseLandmark.RIGHT_ANKLE]["y"])
        l_shoulder = (landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"])
        r_shoulder = (landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"])

        l_knee_angle = calculate_angle_2d(l_hip, l_knee, l_ankle)
        r_knee_angle = calculate_angle_2d(r_hip, r_knee, r_ankle)

        # The lead leg experiences the deepest bend
        lead_knee_angle = min(l_knee_angle, r_knee_angle)

        # Torso uprightness
        mid_shoulder = ((l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2)
        mid_hip = ((l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2)
        torso_angle = calculate_vertical_angle(mid_hip, mid_shoulder)

        issues = []
        positives = []
        instant_score = 100

        if torso_angle > 35.0:
            instant_score -= 20
            issues.append("Keep your torso upright and tall.")
            self.current_rep_issues.add("Torso leaning forward")

        rep_completed = False
        rep_detail = None

        if self.state == LungeState.STANDING:
            self.min_knee_angle = 180.0
            if lead_knee_angle < self.DESCEND_TRIGGER:
                self.state = LungeState.DESCENDING
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()

        elif self.state == LungeState.DESCENDING:
            self.min_knee_angle = min(self.min_knee_angle, lead_knee_angle)
            self.current_rep_scores.append(instant_score)

            if lead_knee_angle <= self.BOTTOM_LUNGE_ANGLE:
                self.state = LungeState.BOTTOM
                positives.append("Good lunge depth.")
            elif lead_knee_angle > self.STANDING_KNEE_ANGLE - 5 and (now - self.rep_start_time) > 0.5:
                self.state = LungeState.STANDING

        elif self.state == LungeState.BOTTOM:
            self.min_knee_angle = min(self.min_knee_angle, lead_knee_angle)
            self.current_rep_scores.append(instant_score)

            if lead_knee_angle > self.BOTTOM_LUNGE_ANGLE + 15:
                self.state = LungeState.ASCENDING

        elif self.state == LungeState.ASCENDING:
            self.current_rep_scores.append(instant_score)

            if lead_knee_angle >= self.STANDING_KNEE_ANGLE:
                duration = now - self.rep_start_time
                if self.min_knee_angle <= self.MIN_ROM_REQUIRED and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    rep_completed = True

                    avg_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    if self.min_knee_angle > self.BOTTOM_LUNGE_ANGLE:
                        avg_score = max(avg_score - 10, 55)
                        self.current_rep_issues.add("Partial lunge depth")
                    else:
                        positives.append("Great depth and balance!")

                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_score, 100), 40),
                        "maxRomAngle": round(self.min_knee_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 1.2,
                    }
                    self.completed_reps.append(rep_detail)

                self.state = LungeState.STANDING

        active_feedback = self.feedback_manager.update(issues, positives, is_in_motion=self.state != LungeState.STANDING)
        speech_cue = self.feedback_manager.get_speech_event()

        overall_score = int(sum(r["formScore"] for r in self.completed_reps) / len(self.completed_reps)) if self.completed_reps else instant_score

        return {
            "exercise": "lunge",
            "rep": self.rep_count,
            "phase": self.state.value,
            "formScore": max(min(overall_score, 100), 20),
            "instantScore": max(min(instant_score, 100), 20),
            "feedback": active_feedback,
            "speechCue": speech_cue,
            "repCompleted": rep_completed,
            "lastRepDetail": rep_detail,
            "activeJoints": [
                PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
                PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
                PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE
            ],
            "metrics": {
                "leadKneeAngle": round(lead_knee_angle, 1),
                "torsoAngle": round(torso_angle, 1),
                "minDepthReached": round(self.min_knee_angle, 1)
            }
        }
