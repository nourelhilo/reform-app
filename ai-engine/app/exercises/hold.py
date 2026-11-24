"""Timed holds (plank, side plank, wall sit): time only counts in a good position."""
from time import monotonic

from app.analysis.angles import calculate_vertical_angle
from app.coaching.feedback import FeedbackManager
from app.exercises.motion import MAX_GAP
from app.exercises.tracking import A, H, K, S, Pose

# name: (good band low, high, measured angle label, view guidance)
HOLDS = {
    "plank": (160, 180, "bodyLine", "Use a side view and show your shoulder, hip and ankle (or knee)."),
    "side_plank": (160, 180, "bodyLine", "Face the camera side-on to the floor with shoulder, hip and feet in frame."),
    "wall_sit": (75, 115, "kneeAngle", "Use a side view with your back on the wall and knee, hip and ankle in frame."),
}


class HoldTracker:
    def __init__(self, exercise):
        self.exercise = exercise
        self.low, self.high, self.key, _ = HOLDS[exercise]
        self.coach = FeedbackManager()
        self.held = 0.0        # seconds in a good position
        self.tracked = 0.0     # seconds attempting the hold (good or not)
        self.streak = 0.0      # current unbroken good stretch
        self.best = 0.0        # longest unbroken good stretch
        self.last = None
        self.rep_count = 0     # holds have no reps; kept for the session payload
        self.cycle = self      # the session reads tracker.cycle.rep_count/form_score

    @property
    def form_score(self):
        return round(100 * self.held / self.tracked) if self.tracked >= 1 else None

    def interrupt(self):
        self.last = None
        self.streak = 0.0

    @property
    def last_frame(self):
        return self.last

    def end_of_body(self, p, i):
        return A[i] if p.visible((A[i],)) else K[i]

    def measure(self, p):
        """Return (angle, in_position, engaged, joints, issues) or None if not trackable."""
        if self.exercise == "wall_sit":
            options = [(i, (S[i], H[i], K[i], A[i])) for i in range(2)]
            i, joints = max(options, key=lambda o: min(map(p.confidence, o[1])))
            if not p.visible(joints):
                return None
            knee = p.angle(H[i], K[i], A[i])
            torso = calculate_vertical_angle(p.point(H[i]), p.point(S[i]))
            issues = []
            if knee > self.high:
                issues.append(("Slide lower until your thighs are level.", (H[i], K[i])))
            elif knee < self.low:
                issues.append(("Come up a little, knees at about 90°.", (H[i], K[i])))
            if torso > 25:
                issues.append(("Keep your back against the wall.", (S[i], H[i])))
            return knee, not issues, knee < 145, joints, tuple(issues)

        options = []
        for i in range(2):
            end = self.end_of_body(p, i)
            options.append((i, end, (S[i], H[i], end)))
        i, end, joints = max(options, key=lambda o: min(map(p.confidence, o[2])))
        if not p.visible(joints):
            return None
        reach = p.distance(S[i], end)
        flat = abs(p.dx(S[i], end)) >= reach * 0.6
        if self.exercise == "plank" and not flat:
            return None
        if self.exercise == "side_plank":
            # Body slopes up from the feet: neither flat on the floor nor standing.
            rise = abs(p.point(S[i])[1] - p.point(end)[1])
            if not (0.12 * reach <= rise <= 0.75 * reach):
                return None
        line = p.angle(S[i], H[i], end)
        issues = ()
        if line < self.low:
            (sx, sy), (hx, hy), (ex, ey) = p.point(S[i]), p.point(H[i]), p.point(end)
            line_y = sy + (ey - sy) * (hx - sx) / (ex - sx) if ex != sx else sy
            cue = "Lift your hips into one line." if hy > line_y else "Lower your hips into one line."
            issues = ((cue, (S[i], H[i], end)),)
        return line, not issues, True, joints, issues

    def track(self, landmarks, width, height, now=None):
        now = monotonic() if now is None else now
        if landmarks is None or len(landmarks) < 33:
            return None, 0.0
        p = Pose(landmarks, width, height)
        try:
            measured = self.measure(p)
        except ValueError:
            measured = None
        if measured is None:
            if self.last is not None and now - self.last > MAX_GAP:
                self.interrupt()
            return None, 0.0
        angle, good, engaged, joints, issues = measured
        step = now - self.last if self.last is not None and now - self.last <= MAX_GAP else 0.0
        self.last = now
        if engaged:
            self.tracked += step
        if good:
            self.held += step
            self.streak += step
            self.best = max(self.best, self.streak)
        else:
            self.streak = 0.0
        cues = tuple(cue for cue, _ in issues)
        default = "Hold it. Breathe steadily." if good else ("Get into position." if not engaged else "Adjust your position.")
        feedback, speech = self.coach.update(cues[0] if cues else None, default, now)
        return {
            "rep": 0, "phase": "holding" if good else ("adjust" if engaged else "idle"),
            "formScore": self.form_score, "instantScore": 100 if good else (70 if engaged else None),
            "feedback": feedback, "speechCue": speech, "repCompleted": False, "lastRepDetail": None,
            "activeJoints": list(joints), "faultJoints": sorted({j for _, js in issues for j in js}),
            "metrics": {self.key: round(angle, 1)},
            "goal": {"current": round(angle, 1), "low": self.low, "high": self.high, "direction": "band",
                     "reached": good, "best": None},
            "hold": {"seconds": round(self.held, 1), "inPosition": good, "bestStreak": round(self.best, 1)},
        }, round(min(map(p.confidence, joints)), 2)
