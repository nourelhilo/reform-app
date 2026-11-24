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
    # Each issue is (cue, joints that show the fault).
    issues: tuple = ()


# A rep's score has three parts (total 100):
#   range   40  reaching the counted target earns 28; reaching the ideal earns all 40
#   control 20  full marks at a controlled pace, half marks at the minimum duration
#   faults  40  each fault costs points in proportion to the share of the rep it was seen
RANGE_POINTS, CONTROL_POINTS, FAULT_POINTS = 40, 20, 40
GRADES = ((90, "A"), (80, "B"), (65, "C"), (0, "D"))
SLOW_DOWN = "Slow down and control the movement."
GO_FURTHER = {False: "Good rep. Go a little deeper next time.", True: "Good rep. Reach a little further next time."}


def grade(score):
    return next(letter for floor, letter in GRADES if score >= floor)


def clamp(value):
    return max(0.0, min(1.0, value))


class RepCycle:
    def __init__(self, phases, min_duration, min_frames=3, high_peak=False, target=None, ideal=None):
        self.phases = phases
        self.min_duration = min_duration
        self.min_frames = min_frames
        self.high_peak = high_peak
        self.target = target
        self.ideal = ideal
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

    def range_share(self):
        """0 at the counted target, 1 at (or past) the ideal range."""
        if self.target is None or self.ideal is None or self.target == self.ideal:
            return 1.0
        return clamp((self.peak - self.target) / (self.ideal - self.target))

    def score_rep(self, duration):
        range_share = self.range_share()
        range_points = RANGE_POINTS * (0.7 + 0.3 * range_share)
        control_share = clamp(0.5 + 0.5 * (duration - self.min_duration) / self.min_duration)
        control_points = CONTROL_POINTS * control_share
        shares = {cue: frames / self.samples for cue, frames in self.fault_frames.items()}
        fault_points = FAULT_POINTS * clamp(1 - sum(shares.values()))
        score = round(range_points + control_points + fault_points)
        faults = [{"cue": cue, "share": round(share, 2)}
                  for cue, share in sorted(shares.items(), key=lambda item: -item[1])]
        # One clear takeaway for the next rep: worst fault, then range, then pace.
        if faults and faults[0]["share"] >= 0.2:
            note = faults[0]["cue"]
        elif range_share < 0.5:
            note = GO_FURTHER[self.high_peak]
        elif control_share < 0.75:
            note = SLOW_DOWN
        else:
            note = "Great rep."
        tips = [fault["cue"] for fault in faults]
        if control_share < 0.75:
            tips.append(SLOW_DOWN)
        return score, {
            "formScore": score, "grade": grade(score),
            "rangeScore": round(range_points), "controlScore": round(control_points),
            "faultScore": round(fault_points), "faults": faults, "feedbackGiven": sorted(set(tips)),
        }, note

    def analyze(self, motion, now=None):
        now = monotonic() if now is None else now
        if self.last_frame is not None and now - self.last_frame > 0.75:
            self.interrupt()
        self.last_frame = now
        cues = tuple(cue for cue, _ in motion.issues)
        fault_joints = sorted({joint for _, joints in motion.issues for joint in joints})
        instant = max(0, 100 - 15 * len(cues))
        note = None
        detail = None

        if not self.armed:
            self.armed = motion.home
            self.phase = self.phases[0] if self.armed else "idle"
        elif self.started is None and motion.moving:
            self.started = now
            self.peak = motion.angle
            self.hit_target = False
            self.samples = 0
            self.fault_frames = {}
            self.phase = self.phases[1]

        if self.started is not None:
            self.peak = (max if self.high_peak else min)(self.peak, motion.angle)
            self.samples += 1
            for cue in cues:
                self.fault_frames[cue] = self.fault_frames.get(cue, 0) + 1
            self.hit_target |= motion.target
            if motion.home:
                duration = now - self.started
                if self.hit_target and duration >= self.min_duration and self.samples >= self.min_frames:
                    self.rep_count += 1
                    score, summary, note = self.score_rep(duration)
                    self.score_total += score
                    detail = {
                        "repNumber": self.rep_count, "durationSeconds": round(duration, 2),
                        "maxRomAngle": round(self.peak, 1), **summary,
                    }
                elif not self.hit_target:
                    note = "Range target missed. Move through your comfortable range."
                self.started = None
                self.phase = self.phases[0]
            elif self.hit_target:
                self.phase = self.phases[3] if motion.ascending else self.phases[2]

        cue = cues[0] if cues and self.started is not None else note
        default = "Return to the starting position."
        if self.armed:
            default = "Keep moving through the rep." if self.started is not None else "Ready for the next rep."
        feedback, speech = self.coach.update(cue, default, now)
        return {
            "rep": self.rep_count, "phase": self.phase, "formScore": self.form_score,
            "instantScore": instant if self.started is not None else None,
            "feedback": feedback, "speechCue": speech, "repCompleted": detail is not None,
            "lastRepDetail": detail, "activeJoints": motion.joints,
            "faultJoints": fault_joints if self.started is not None else [],
            "metrics": motion.metrics,
        }
