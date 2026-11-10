"""Exercise-specific geometry in the image plane, with square pixels."""
from math import hypot, isfinite
from app.analysis.angles import calculate_angle_2d, calculate_vertical_angle
from app.pose.landmarks import PoseLandmark as P
from app.exercises.motion import Motion, RepCycle

S, E, W, H, K, A, HEEL, TOE = (
    (P.LEFT_SHOULDER, P.RIGHT_SHOULDER), (P.LEFT_ELBOW, P.RIGHT_ELBOW),
    (P.LEFT_WRIST, P.RIGHT_WRIST), (P.LEFT_HIP, P.RIGHT_HIP),
    (P.LEFT_KNEE, P.RIGHT_KNEE), (P.LEFT_ANKLE, P.RIGHT_ANKLE),
    (P.LEFT_HEEL, P.RIGHT_HEEL), (P.LEFT_FOOT_INDEX, P.RIGHT_FOOT_INDEX),
)
# Inclusion angles: 180° is straight. The numbers allow some camera error;
# docs/pose-validation.md separates movement references from app settings.
# name: (near extension, entry, counted depth, minimum duration, phase labels)
RULES = {
    "squat": (165, 150, 95, 0.55, ("standing", "descending", "bottom", "ascending")),
    "pushup": (160, 145, 95, 0.45, ("plank", "descending", "bottom", "ascending")),
    "curl": (160, 145, 55, 0.45, ("extended", "curling", "peak", "lowering")),
    "lunge": (160, 145, 95, 0.60, ("standing", "descending", "bottom", "ascending")),
    "jumping_jack": (35, 55, 150, 0.24, ("closed", "opening", "open", "closing")),
}
VIEWS = {
    "squat": "Turn side-on and show your shoulder, hip, knee and ankle.",
    "pushup": "Use a side view and show your full plank, from shoulder to ankle.",
    "curl": "Use a side view and keep one arm and your hip in frame.",
    "lunge": "Use a side view and keep both legs and shoes in frame.",
    "jumping_jack": "Face the camera and leave room above your hands and around your feet.",
}


class Pose:
    def __init__(self, landmarks, width, height):
        self.landmarks = landmarks
        self.aspect = width / height

    def confidence(self, joint):
        p = self.landmarks[joint]
        if not all(isfinite(p[key]) for key in ("x", "y", "visibility")):
            return 0
        if not (0 <= p["x"] <= 1 and 0 <= p["y"] <= 1):
            return 0
        return p["visibility"]

    def visible(self, joints):
        return min(map(self.confidence, joints)) >= 0.55

    def point(self, joint):
        p = self.landmarks[joint]
        return p["x"] * self.aspect, p["y"]

    def dx(self, first, second):
        return self.point(first)[0] - self.point(second)[0]

    def distance(self, a, b):
        x, y = self.point(a)
        u, v = self.point(b)
        return hypot(x-u, y-v)

    def angle(self, a, b, c):
        if min(self.distance(a, b), self.distance(b, c)) < 0.015:
            raise ValueError("Joint segments overlap in this view")
        return calculate_angle_2d(self.point(a), self.point(b), self.point(c))


class ExerciseTracker:
    def __init__(self, exercise):
        self.exercise = exercise
        self.home, self.trigger, self.target, duration, phases = RULES[exercise]
        self.cycle = RepCycle(phases, duration, high_peak=exercise == "jumping_jack")
        self.side = self.lead = None

    def interrupt(self):
        self.cycle.interrupt()
        self.side = self.lead = None

    def track(self, landmarks, width, height, now=None):
        if landmarks is None or len(landmarks) < 33:
            self.interrupt()
            return None, 0.0
        p = Pose(landmarks, width, height)
        try:
            if self.exercise == "jumping_jack":
                motion = self.jack(p)
            elif self.exercise == "lunge":
                motion = self.lunge(p)
            else:
                motion = self.side_motion(p)
        except ValueError:
            motion = None
        if motion is None:
            self.interrupt()
            return None, 0.0
        result = self.cycle.analyze(motion, now)
        if self.cycle.started is None:
            self.lead = None
        return result, round(min(map(p.confidence, motion.joints)), 2)

    def bend(self, angle, joints, metrics, issues=(), home=True, target=True, moving=True):
        return Motion(angle, home and angle >= self.home, moving and angle < self.trigger,
                      target and angle <= self.target, angle > self.target + 12,
                      joints, metrics, issues)

    def side_motion(self, p):
        groups = {
            "squat": (S, H, K, A),
            "pushup": (S, E, W, H, A),
            "curl": (S, E, W, H),
        }[self.exercise]
        candidates = [tuple(group[i] for group in groups) for i in range(2)]
        if self.side is None:
            self.side = max(range(2), key=lambda i: min(map(p.confidence, candidates[i])))
        i = self.side
        joints = candidates[i]
        if not p.visible(joints):
            return None
        if self.exercise in ("squat", "curl") and p.visible(S):
            if abs(p.dx(*S)) > .9 * p.distance(S[i], H[i]):
                return None
        if self.exercise == "squat":
            angle = p.angle(H[i], K[i], A[i])
            torso = calculate_vertical_angle(p.point(H[i]), p.point(S[i]))
            # Wide stances and other squat variants can legitimately lean more.
            issues = ("Try a steadier torso position.",) if torso > 65 else ()
            return self.bend(angle, joints, {"kneeAngle": round(angle, 1)}, issues)
        angle = p.angle(S[i], E[i], W[i])
        if self.exercise == "pushup":
            if abs(p.dx(S[i], A[i])) < p.distance(S[i], A[i]) * 0.70:
                return None
            line = p.angle(S[i], H[i], A[i])
            issues = ("Keep your shoulders, hips and ankles in one line.",) if line < 155 else ()
            return self.bend(angle, joints, {"elbowAngle": round(angle, 1)}, issues)
        arm = p.angle(H[i], S[i], E[i])
        issues = ("Keep your upper arm closer to your side.",) if arm > 30 else ()
        return self.bend(angle, joints, {"elbowAngle": round(angle, 1)}, issues)

    def lunge(self, p):
        joints = S + H + K + A
        if not p.visible(joints):
            return None
        knees = [p.angle(H[i], K[i], A[i]) for i in range(2)]
        torso = (p.distance(S[0], H[0]) + p.distance(S[1], H[1])) / 2
        spread = abs(p.dx(A[0], A[1])) / max(torso, 0.015)
        home = spread < 0.45 and min(knees) >= self.home
        split = spread >= 0.65
        if split and self.lead is None:
            # Find the forward foot along the image's horizontal axis. The
            # trailing heel can lift, so choose the best visible projected shoe.
            feet = [(p.dx(TOE[i], HEEL[i]), i) for i in range(2) if p.visible((TOE[i], HEEL[i]))]
            if feet:
                direction, i = max(feet, key=lambda foot: abs(foot[0]))
                if abs(direction) >= torso * 0.10:
                    self.lead = 0 if p.dx(A[0], A[1]) * direction > 0 else 1
                    joints += (TOE[i], HEEL[i])
        if split and self.lead is None:
            return None
        angle = knees[self.lead] if self.lead is not None else min(knees)
        return self.bend(angle, joints, {"leadKneeAngle": round(angle, 1) if self.lead is not None else None},
                         home=home, target=split and self.lead is not None, moving=split)

    def jack(self, p):
        joints = S + H + E + W + A
        if not p.visible(joints):
            return None
        width = abs(p.dx(*S))
        if width < 0.5 * max(p.distance(S[i], H[i]) for i in range(2)):
            return None
        ratio = abs(p.dx(*A)) / width
        arms = [p.angle(H[i], S[i], E[i]) for i in range(2)]
        angle = min(arms)
        overhead = all(p.point(W[i])[1] < p.point(S[i])[1] for i in range(2))
        issues = ("Raise both arms together.",) if abs(arms[0] - arms[1]) > 25 else ()
        return Motion(angle, max(arms) <= self.home and ratio <= 1.10,
                      max(arms) >= self.trigger or ratio >= 1.35,
                      angle >= self.target and overhead and ratio >= 1.45,
                      angle < 135, joints, {"armElevation": round(angle, 1), "stanceRatio": round(ratio, 2)}, issues)
