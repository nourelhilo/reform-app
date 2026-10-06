import time
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from app.analysis.angles import calculate_angle_2d, calculate_vertical_angle, calculate_distance_2d
from app.pose.landmarks import PoseLandmark
from app.coaching.feedback import FeedbackManager

class SquatState(str, Enum):
    STANDING = "standing"
    DESCENDING = "descending"
    BOTTOM = "bottom"
    ASCENDING = "ascending"

class SquatAnalyzer:
    def __init__(self):
        self.state = SquatState.STANDING
        self.rep_count = 0
        self.feedback_manager = FeedbackManager(cooldown_seconds=2.0)
        
        # State tracking
        self.min_knee_angle = 180.0
        self.rep_start_time = 0.0
        self.last_rep_finish_time = 0.0
        self.current_rep_scores = []
        self.current_rep_issues = set()
        self.completed_reps = []
        
        # Angle Thresholds
        self.STANDING_KNEE_ANGLE = 160.0  # Above this is standing
        self.DESCENDING_TRIGGER = 150.0   # Starts descending
        self.PARALLEL_DEPTH = 100.0       # Good parallel depth
        self.DEEP_DEPTH = 85.0           # Deep squat
        self.MIN_ROM_REQUIRED = 120.0     # Must at least hit 120 deg for valid rep
        self.MIN_REP_DURATION = 1.0       # Seconds (prevents micro-bounces)

    def analyze(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Processes 33 landmarks for squat state machine, kinematics, and form analysis.
        """
        now = time.time()
        
        # Extract relevant joints
        left_hip = (landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"])
        right_hip = (landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"])
        left_knee = (landmarks[PoseLandmark.LEFT_KNEE]["x"], landmarks[PoseLandmark.LEFT_KNEE]["y"])
        right_knee = (landmarks[PoseLandmark.RIGHT_KNEE]["x"], landmarks[PoseLandmark.RIGHT_KNEE]["y"])
        left_ankle = (landmarks[PoseLandmark.LEFT_ANKLE]["x"], landmarks[PoseLandmark.LEFT_ANKLE]["y"])
        right_ankle = (landmarks[PoseLandmark.RIGHT_ANKLE]["x"], landmarks[PoseLandmark.RIGHT_ANKLE]["y"])
        left_shoulder = (landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"])
        right_shoulder = (landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"])

        # 1. Joint Angles
        left_knee_angle = calculate_angle_2d(left_hip, left_knee, left_ankle)
        right_knee_angle = calculate_angle_2d(right_hip, right_knee, right_ankle)
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2.0

        # Torso inclination relative to vertical
        mid_shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2, (left_shoulder[1] + right_shoulder[1]) / 2)
        mid_hip = ((left_hip[0] + right_hip[0]) / 2, (left_hip[1] + right_hip[1]) / 2)
        torso_angle = calculate_vertical_angle(mid_hip, mid_shoulder)

        # Symmetry
        symmetry_diff = abs(left_knee_angle - right_knee_angle)

        # Knee tracking / Knee cave (valgus) detection
        knee_dist = calculate_distance_2d(left_knee, right_knee)
        ankle_dist = calculate_distance_2d(left_ankle, right_ankle)
        knee_to_ankle_ratio = knee_dist / (ankle_dist + 1e-6)

        # 2. Form Scoring & Real-time Metrics
        issues = []
        positives = []
        instant_score = 100

        # Form checks
        if torso_angle > 45.0:
            instant_score -= 20
            issues.append("Keep your chest up and torso stable.")
            self.current_rep_issues.add("Excessive forward torso lean")

        if symmetry_diff > 18.0:
            instant_score -= 15
            issues.append("Distribute your weight evenly on both legs.")
            self.current_rep_issues.add("Asymmetric weight distribution")

        if knee_to_ankle_ratio < 0.75 and avg_knee_angle < 130:
            instant_score -= 25
            issues.append("Keep your knees aligned with your toes.")
            self.current_rep_issues.add("Knee cave (valgus collapse)")

        # 3. State Machine Transitions
        rep_completed_event = False
        rep_detail = None

        if self.state == SquatState.STANDING:
            self.min_knee_angle = 180.0
            if avg_knee_angle <= self.PARALLEL_DEPTH:
                self.state = SquatState.BOTTOM
                self.min_knee_angle = avg_knee_angle
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()
                positives.append("Good depth.")
            elif avg_knee_angle < self.DESCENDING_TRIGGER:
                self.state = SquatState.DESCENDING
                self.min_knee_angle = avg_knee_angle
                self.rep_start_time = now
                self.current_rep_scores = [instant_score]
                self.current_rep_issues = set()

        elif self.state == SquatState.DESCENDING:
            self.min_knee_angle = min(self.min_knee_angle, avg_knee_angle)
            self.current_rep_scores.append(instant_score)

            if avg_knee_angle <= self.PARALLEL_DEPTH:
                self.state = SquatState.BOTTOM
                positives.append("Good depth.")
            elif avg_knee_angle > self.STANDING_KNEE_ANGLE - 5 and (now - self.rep_start_time) > 0.5:
                # Returned without hitting depth
                issues.append("Try going deeper into parallel.")
                self.state = SquatState.STANDING

        elif self.state == SquatState.BOTTOM:
            self.min_knee_angle = min(self.min_knee_angle, avg_knee_angle)
            self.current_rep_scores.append(instant_score)

            if avg_knee_angle > self.PARALLEL_DEPTH + 10:
                self.state = SquatState.ASCENDING

        elif self.state == SquatState.ASCENDING:
            self.current_rep_scores.append(instant_score)

            if avg_knee_angle >= self.STANDING_KNEE_ANGLE:
                duration = now - self.rep_start_time

                # Check if it was a valid full rep
                if self.min_knee_angle <= self.MIN_ROM_REQUIRED and duration >= self.MIN_REP_DURATION:
                    self.rep_count += 1
                    self.last_rep_finish_time = now
                    rep_completed_event = True

                    # Final score calculation for this rep
                    avg_rep_score = int(sum(self.current_rep_scores) / max(len(self.current_rep_scores), 1))
                    
                    # Depth deductions
                    if self.min_knee_angle > self.PARALLEL_DEPTH:
                        avg_rep_score = max(avg_rep_score - 15, 50)
                        self.current_rep_issues.add("Partial depth (did not reach parallel)")
                    else:
                        positives.append("Excellent squat depth!")

                    rep_detail = {
                        "repNumber": self.rep_count,
                        "durationSeconds": round(duration, 2),
                        "formScore": max(min(avg_rep_score, 100), 40),
                        "maxRomAngle": round(self.min_knee_angle, 1),
                        "feedbackGiven": list(self.current_rep_issues),
                        "tempoGood": duration >= 1.5,
                    }
                    self.completed_reps.append(rep_detail)
                    positives.append("Rep completed!")

                self.state = SquatState.STANDING

        # Manage feedback
        active_feedback = self.feedback_manager.update(issues, positives, is_in_motion=self.state != SquatState.STANDING)
        speech_cue = self.feedback_manager.get_speech_event()

        # Overall session form score
        if self.completed_reps:
            overall_form_score = int(sum(r["formScore"] for r in self.completed_reps) / len(self.completed_reps))
        else:
            overall_form_score = instant_score

        return {
            "exercise": "squat",
            "rep": self.rep_count,
            "phase": self.state.value,
            "formScore": max(min(overall_form_score, 100), 20),
            "instantScore": max(min(instant_score, 100), 20),
            "feedback": active_feedback,
            "speechCue": speech_cue,
            "repCompleted": rep_completed_event,
            "lastRepDetail": rep_detail,
            "activeJoints": [
                PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
                PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP
            ],
            "metrics": {
                "kneeAngle": round(avg_knee_angle, 1),
                "torsoAngle": round(torso_angle, 1),
                "symmetryDiff": round(symmetry_diff, 1),
                "minDepthReached": round(self.min_knee_angle, 1)
            }
        }
