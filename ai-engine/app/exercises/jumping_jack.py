import time
from enum import Enum
from typing import Dict, Any, List, Optional
from app.analysis.angles import calculate_angle_2d, calculate_distance_2d
from app.pose.landmarks import PoseLandmark
from app.coaching.feedback import FeedbackManager

class JumpingJackState(str, Enum):
    CLOSED = "closed"
    OPENING = "opening"
    OPEN_PEAK = "open_peak"
    CLOSING = "closing"

class JumpingJackAnalyzer:
    def __init__(self):
        self.state = JumpingJackState.CLOSED
        self.rep_count = 0
        self.feedback_manager = FeedbackManager(cooldown_seconds=2.0)
        
        self.max_arm_angle = 0.0
        self.max_leg_ratio = 0.0
        self.rep_start_time = 0.0
        self.current_rep_scores = []
        self.current_rep_issues = set()
        self.completed_reps = []

        # Thresholds
        self.CLOSED_ARM_ANGLE = 45.0
        self.OPEN_ARM_ANGLE = 135.0
        self.MIN_ARM_ROM = 120.0
        self.OPEN_LEG_RATIO = 1.35
        self.MIN_REP_DURATION = 0.4

    def analyze(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        now = time.time()

        l_shoulder = (landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"])
        r_shoulder = (landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"])
        l_wrist = (landmarks[PoseLandmark.LEFT_WRIST]["x"], landmarks[PoseLandmark.LEFT_WRIST]["y"])
        r_wrist = (landmarks[PoseLandmark.RIGHT_WRIST]["x"], landmarks[PoseLandmark.RIGHT_WRIST]["y"])
        l_hip = (landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"])
        r_hip = (landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"])
        l_ankle = (landmarks[PoseLandmark.LEFT_ANKLE]["x"], landmarks[PoseLandmark.LEFT_ANKLE]["y"])
        r_ankle = (landmarks[PoseLandmark.RIGHT_ANKLE]["x"], landmarks[PoseLandmark.RIGHT_ANKLE]["y"])

        # Shoulder abduction angles (hip-shoulder-wrist)
        l_arm_angle = calculate_angle_2d(l_hip, l_shoulder, l_wrist)
        r_arm_angle = calculate_angle_2d(r_hip, r_shoulder, r_wrist)
        avg_arm_angle = (l_arm_angle + r_arm_angle) / 2.0

        # Leg separation relative to shoulder width
        shoulder_width = calculate_distance_2d(l_shoulder, r_shoulder) + 1e-6
        ankle_distance = calculate_distance_2d(l_ankle, r_ankle)
        leg_ratio = ankle_distance / shoulder_width

        issues = []
        positives = []
        instant_score = 100

        # Form checks: Arm elevation and Leg width sync
        if avg_arm_angle > 90.0 and leg_ratio < 1.1:
            instant_score -= 20
            issues.append("Spread your feet wider as your arms raise.")
            self.current_rep_issues.add("Feet not spreading wide enough")

        arm_diff = abs(l_arm_angle - r_arm_angle)
        if arm_diff > 25.0:
            instant_score -= 15
            issues.append("Raise both arms symmetrically.")
            self.current_rep_issues.add("Asymmetric arm raise")

        rep_completed = False
        rep_detail = None

        if self.state == JumpingJackState.CLOSED:
            self.max_arm_angle = 0.0
            self.max_leg_ratio = 0.0
            if avg_arm_angle > self.CLOSED_ARM_ANGLE + 15:
                self.state = JumpingJackState.OPENING
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()

        elif self.state == JumpingJackState.OPENING:
            self.max_arm_angle = max(self.max_arm_angle, avg_arm_angle)
            self.max_leg_ratio = max(self.max_leg_ratio, leg_ratio)
            self.current_rep_scores.append(instant_score)

            if avg_arm_angle >= self.OPEN_ARM_ANGLE and leg_ratio >= self.OPEN_LEG_RATIO:
                self.state = JumpingJackState.OPEN_PEAK
                positives.append("Great reach overhead!")
            elif avg_arm_angle < self.CLOSED_ARM_ANGLE + 5 and (now - self.rep_start_time) > 0.3:
                self.state = JumpingJackState.CLOSED

        elif self.state == JumpingJackState.OPEN_PEAK:
            self.max_arm_angle = max(self.max_arm_angle, avg_arm_angle)
            self.max_leg_ratio = max(self.max_leg_ratio, leg_ratio)
            self.current_rep_scores.append(instant_score)

            if avg_arm_angle < self.OPEN_ARM_ANGLE - 15:
                self.state = JumpingJackState.CLOSING

        elif self.state == JumpingJackState.CLOSING:
            self.current_rep_scores.append(instant_score)

            if avg_arm_angle <= self.CLOSED_ARM_ANGLE:
                duration = now - self.rep_start_time
                if self.max_arm_angle >= self.MIN_ARM_ROM and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    rep_completed = True

                    avg_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    if self.max_arm_angle < self.OPEN_ARM_ANGLE:
                        avg_score = max(avg_score - 15, 60)
                        self.current_rep_issues.add("Incomplete arm reach overhead")

                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_score, 100), 40),
                        "maxRomAngle": round(self.max_arm_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 0.5,
                    }
                    self.completed_reps.append(rep_detail)

                self.state = JumpingJackState.CLOSED

        active_feedback = self.feedback_manager.update(issues, positives, is_in_motion=self.state != JumpingJackState.CLOSED)
        speech_cue = self.feedback_manager.get_speech_event()

        overall_score = int(sum(r["formScore"] for r in self.completed_reps) / len(self.completed_reps)) if self.completed_reps else instant_score

        return {
            "exercise": "jumping_jack",
            "rep": self.rep_count,
            "phase": self.state.value,
            "formScore": max(min(overall_score, 100), 20),
            "instantScore": max(min(instant_score, 100), 20),
            "feedback": active_feedback,
            "speechCue": speech_cue,
            "repCompleted": rep_completed,
            "lastRepDetail": rep_detail,
            "activeJoints": [
                PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
                PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
                PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE
            ],
            "metrics": {
                "armAngle": round(avg_arm_angle, 1),
                "legSeparationRatio": round(leg_ratio, 2),
                "maxArmReach": round(self.max_arm_angle, 1)
            }
        }
