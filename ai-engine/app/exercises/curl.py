import time
from enum import Enum
from typing import Dict, Any, List, Optional
from app.analysis.angles import calculate_angle_2d, calculate_vertical_angle
from app.pose.landmarks import PoseLandmark
from app.coaching.feedback import FeedbackManager

class CurlState(str, Enum):
    EXTENDED = "extended"
    CURLING = "curling"
    PEAK = "peak"
    LOWERING = "lowering"

class BicepCurlAnalyzer:
    def __init__(self):
        self.state = CurlState.EXTENDED
        self.rep_count = 0
        self.feedback_manager = FeedbackManager(cooldown_seconds=2.0)
        
        self.min_elbow_angle = 180.0
        self.rep_start_time = 0.0
        self.current_rep_scores = []
        self.current_rep_issues = set()
        self.completed_reps = []

        # Thresholds
        self.EXTENDED_ELBOW_ANGLE = 150.0
        self.CURL_TRIGGER = 140.0
        self.PEAK_ELBOW_ANGLE = 45.0
        self.MIN_ROM_REQUIRED = 65.0
        self.MIN_REP_DURATION = 0.8

    def analyze(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        now = time.time()

        l_shoulder = (landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"])
        r_shoulder = (landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"])
        l_elbow = (landmarks[PoseLandmark.LEFT_ELBOW]["x"], landmarks[PoseLandmark.LEFT_ELBOW]["y"])
        r_elbow = (landmarks[PoseLandmark.RIGHT_ELBOW]["x"], landmarks[PoseLandmark.RIGHT_ELBOW]["y"])
        l_wrist = (landmarks[PoseLandmark.LEFT_WRIST]["x"], landmarks[PoseLandmark.LEFT_WRIST]["y"])
        r_wrist = (landmarks[PoseLandmark.RIGHT_WRIST]["x"], landmarks[PoseLandmark.RIGHT_WRIST]["y"])
        l_hip = (landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"])
        r_hip = (landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"])

        # Elbow flexion angles
        l_elbow_angle = calculate_angle_2d(l_shoulder, l_elbow, l_wrist)
        r_elbow_angle = calculate_angle_2d(r_shoulder, r_elbow, r_wrist)

        # Use the arm with stronger movement or average
        active_elbow_angle = min(l_elbow_angle, r_elbow_angle)

        # Upper arm stability (elbow flare / shoulder swing)
        l_upper_arm_angle = calculate_vertical_angle(l_shoulder, l_elbow)
        r_upper_arm_angle = calculate_vertical_angle(r_shoulder, r_elbow)
        avg_upper_arm_angle = (l_upper_arm_angle + r_upper_arm_angle) / 2.0

        issues = []
        positives = []
        instant_score = 100

        # Form checks: Upper arm stability / swinging
        if avg_upper_arm_angle > 28.0:
            instant_score -= 20
            issues.append("Keep your elbows pinned to your sides. Avoid swinging.")
            self.current_rep_issues.add("Upper-arm / shoulder momentum")

        rep_completed = False
        rep_detail = None

        if self.state == CurlState.EXTENDED:
            self.min_elbow_angle = 180.0
            if active_elbow_angle <= self.PEAK_ELBOW_ANGLE:
                self.state = CurlState.PEAK
                self.min_elbow_angle = active_elbow_angle
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()
                positives.append("Good peak contraction.")
            elif active_elbow_angle < self.CURL_TRIGGER:
                self.state = CurlState.CURLING
                self.min_elbow_angle = active_elbow_angle
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()

        elif self.state == CurlState.CURLING:
            self.min_elbow_angle = min(self.min_elbow_angle, active_elbow_angle)
            self.current_rep_scores.append(instant_score)

            if active_elbow_angle <= self.PEAK_ELBOW_ANGLE:
                self.state = CurlState.PEAK
                positives.append("Good peak contraction.")
            elif active_elbow_angle > self.EXTENDED_ELBOW_ANGLE - 5 and (now - self.rep_start_time) > 0.4:
                self.state = CurlState.EXTENDED

        elif self.state == CurlState.PEAK:
            self.min_elbow_angle = min(self.min_elbow_angle, active_elbow_angle)
            self.current_rep_scores.append(instant_score)

            if active_elbow_angle >= self.EXTENDED_ELBOW_ANGLE:
                duration = now - self.rep_start_time
                if self.min_elbow_angle <= self.MIN_ROM_REQUIRED and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    rep_completed = True
                    avg_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_score, 100), 40),
                        "maxRomAngle": round(self.min_elbow_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 1.5,
                    }
                    self.completed_reps.append(rep_detail)
                self.state = CurlState.EXTENDED
            elif active_elbow_angle > self.PEAK_ELBOW_ANGLE + 15:
                self.state = CurlState.LOWERING

        elif self.state == CurlState.LOWERING:
            self.current_rep_scores.append(instant_score)

            if active_elbow_angle >= self.EXTENDED_ELBOW_ANGLE:
                duration = now - self.rep_start_time
                if self.min_elbow_angle <= self.MIN_ROM_REQUIRED and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    rep_completed = True

                    avg_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    if self.min_elbow_angle > self.PEAK_ELBOW_ANGLE:
                        avg_score = max(avg_score - 10, 50)
                        self.current_rep_issues.add("Incomplete peak contraction")
                    else:
                        positives.append("Full range of motion!")

                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_score, 100), 40),
                        "maxRomAngle": round(self.min_elbow_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 1.5,
                    }
                    self.completed_reps.append(rep_detail)

                self.state = CurlState.EXTENDED

        active_feedback = self.feedback_manager.update(issues, positives, is_in_motion=self.state != CurlState.EXTENDED)
        speech_cue = self.feedback_manager.get_speech_event()

        overall_score = int(sum(r["formScore"] for r in self.completed_reps) / len(self.completed_reps)) if self.completed_reps else instant_score

        return {
            "exercise": "curl",
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
                PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
                PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER
            ],
            "metrics": {
                "activeElbowAngle": round(active_elbow_angle, 1),
                "upperArmAngle": round(avg_upper_arm_angle, 1),
                "minPeakAngle": round(self.min_elbow_angle, 1)
            }
        }
