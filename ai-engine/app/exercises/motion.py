"""One tracked start → target → return cycle. All thresholds are camera heuristics."""
from dataclasses import dataclass
from time import monotonic

from app.coaching.feedback import FeedbackManager


@dataclass
class Motion:
    angle: float
    home: bool
    moving: bool
    target: bool
    ascending: bool
    joints: tuple
    metrics: dict
    issues: tuple = ()


class RepCycle:
    def __init__(self, phases, min_duration, min_frames=3, high_peak=False):
        self.phases = phases
        self.min_duration = min_duration
        self.min_frames = min_frames
        self.high_peak = high_peak
        self.rep_count = self.score_total = 0
        self.coach = FeedbackManager()
        self.interrupt()

    @property
    def form_score(self):
        return round(self.score_total / self.rep_count) if self.rep_count else None

    def interrupt(self):
        self.armed = False
        self.started = None
        self.last_frame = None
        self.phase = "idle"

    def analyze(self, motion, now=None):
        now = monotonic() if now is None else now
        if self.last_frame is not None and now - self.last_frame > 0.75:
            self.interrupt()
        self.last_frame = now
        issues = tuple(motion.issues)
        instant = max(0, 100 - 15 * len(issues))
        note = None
        detail = None

        if not self.armed:
            self.armed = motion.home
            self.phase = self.phases[0] if self.armed else "idle"
        elif self.started is None and motion.moving:
            self.started = now
            self.peak = motion.angle
            self.hit_target = False
            self.samples = self.score_sum = 0
            self.rep_issues = set()
            self.phase = self.phases[1]

        if self.started is not None:
            self.peak = (max if self.high_peak else min)(self.peak, motion.angle)
            self.samples += 1
            self.score_sum += instant
            self.rep_issues.update(issues)
            self.hit_target |= motion.target
            if motion.home:
                duration = now - self.started
                if self.hit_target and duration >= self.min_duration and self.samples >= self.min_frames:
                    self.rep_count += 1
                    score = round(self.score_sum / self.samples)
                    self.score_total += score
                    detail = {
                        "repNumber": self.rep_count, "durationSeconds": round(duration, 2),
                        "formScore": score, "maxRomAngle": round(self.peak, 1),
                        "feedbackGiven": sorted(self.rep_issues),
                    }
                    note = "Rep counted."
                elif not self.hit_target:
                    note = "Range target missed. Move through your comfortable range."
                self.started = None
                self.phase = self.phases[0]
            elif self.hit_target:
                self.phase = self.phases[3] if motion.ascending else self.phases[2]

        cue = issues[0] if issues and self.started is not None else note
        default = "Return to the starting position."
        if self.armed:
            default = "Keep moving through the rep." if self.started is not None else "Ready for the next rep."
        feedback, speech = self.coach.update(cue, default, now)
        return {
            "rep": self.rep_count, "phase": self.phase, "formScore": self.form_score,
            "instantScore": instant if self.started is not None else None,
            "feedback": feedback, "speechCue": speech, "repCompleted": detail is not None,
            "lastRepDetail": detail, "activeJoints": motion.joints, "metrics": motion.metrics,
        }
