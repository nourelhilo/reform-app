"""Exercise-specific geometry in the image plane, with square pixels."""
from math import hypot, isfinite
from app.analysis.angles import calculate_angle_2d, calculate_vertical_angle
from app.pose.landmarks import PoseLandmark as P
from time import monotonic
from app.exercises.motion import MAX_GAP, Motion, RepCycle

S, E, W, H, K, A, HEEL, TOE = (
    (P.LEFT_SHOULDER, P.RIGHT_SHOULDER), (P.LEFT_ELBOW, P.RIGHT_ELBOW),
    (P.LEFT_WRIST, P.RIGHT_WRIST), (P.LEFT_HIP, P.RIGHT_HIP),
    (P.LEFT_KNEE, P.RIGHT_KNEE), (P.LEFT_ANKLE, P.RIGHT_ANKLE),
    (P.LEFT_HEEL, P.RIGHT_HEEL), (P.LEFT_FOOT_INDEX, P.RIGHT_FOOT_INDEX),
)
# Inclusion angles: 180° is straight. The numbers allow some camera error;
# docs/pose-validation.md separates movement references from app settings.
# name: (start position, entry, counted target, minimum duration, phase labels)
# For "low" exercises the angle falls toward the target; for HIGH_PEAK ones it rises.
RULES = {
    "squat": (165, 150, 95, 0.55, ("standing", "descending", "bottom", "ascending")),
    "pushup": (160, 145, 100, 0.45, ("plank", "descending", "bottom", "ascending")),
    "curl": (160, 145, 55, 0.45, ("extended", "curling", "peak", "lowering")),
    "lunge": (160, 145, 95, 0.60, ("standing", "descending", "bottom", "ascending")),
    "jumping_jack": (35, 55, 130, 0.34, ("closed", "opening", "open", "closing")),
    "shoulder_press": (105, 120, 155, 0.45, ("racked", "pressing", "lockout", "lowering")),
    "lateral_raise": (30, 45, 80, 0.45, ("down", "raising", "top", "lowering")),
    "glute_bridge": (140, 150, 165, 0.45, ("down", "lifting", "top", "lowering")),
}
HIGH_PEAK = {"jumping_jack", "shoulder_press", "lateral_raise", "glute_bridge"}
# Fuller range that earns the full range score (the counted target earns most of it).
IDEAL = {"squat": 80, "pushup": 80, "curl": 40, "lunge": 85, "jumping_jack": 165,
         "shoulder_press": 170, "lateral_raise": 88, "glute_bridge": 175}
VIEWS = {
    "squat": "Turn side-on and show your shoulder, hip, knee and ankle.",
    "pushup": "Use a side view and show your full plank, from shoulder to ankle.",
    "curl": "Use a side view and keep one arm and your hip in frame.",
    "lunge": "Use a side view and keep both legs and shoes in frame.",
    "jumping_jack": "Face the camera and leave room above your hands and around your feet.",
    "shoulder_press": "Face the camera and leave room above your head for both hands.",
    "lateral_raise": "Face the camera and keep both arms and hips in frame.",
    "glute_bridge": "Lie side-on to the camera and show your shoulder, hip, knee and ankle.",
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

    def facing(self):
        """Both shoulders spread across the image, as in a front view."""
        return abs(self.dx(*S)) >= 0.5 * max(self.distance(S[i], H[i]) for i in range(2))


class RepTracker:
    def __init__(self, exercise):
        self.exercise = exercise
        self.home, self.trigger, self.target, duration, phases = RULES[exercise]
        # Fast moves only get 2-3 frames per rep at the live service's frame rate.
        self.cycle = RepCycle(phases, duration, min_frames=2 if exercise == "jumping_jack" else 3,
                              high_peak=exercise in HIGH_PEAK, target=self.target, ideal=IDEAL[exercise],
                              home=self.home)
        self.side = self.lead = None

    def interrupt(self):
        self.cycle.interrupt()
        self.side = self.lead = None

    def track(self, landmarks, width, height, now=None):
        if landmarks is None or len(landmarks) < 33:
            self.interrupt()
            return None, 0.0
        p = Pose(landmarks, width, height)
        method = {"jumping_jack": self.jack, "lunge": self.lunge, "shoulder_press": self.press,
                  "lateral_raise": self.raise_, "glute_bridge": self.bridge}.get(self.exercise, self.side_motion)
        try:
            motion = method(p)
        except ValueError:
            motion = None
        if motion is None:
            # A joint can drop out for a frame or two (hands above the frame, a
            # flickering ankle). Keep the rep in progress; the cycle drops it
            # only if tracking stays lost longer than MAX_GAP.
            last = self.cycle.last_frame
            current = now if now is not None else monotonic()
            if last is None or current - last > MAX_GAP:
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

    def rise(self, angle, joints, metrics, issues=(), home=True, target=True, returning=None):
        """Like bend(), for exercises whose angle grows toward the target."""
        return Motion(angle, home and angle <= self.home, angle >= self.trigger,
                      target and angle >= self.target,
                      angle < self.target - 15 if returning is None else returning,
                      joints, metrics, issues)

    def pick_side(self, p, groups):
        candidates = [tuple(group[i] for group in groups) for i in range(2)]
        if self.side is None:
            self.side = max(range(2), key=lambda i: min(map(p.confidence, candidates[i])))
        return self.side, candidates[self.side]

    def side_motion(self, p):
        if self.exercise == "pushup":
            return self.pushup(p)
        groups = {
            "squat": (S, H, K, A),
            "curl": (S, E, W, H),
        }[self.exercise]
        i, joints = self.pick_side(p, groups)
        if not p.visible(joints):
            return None
        if self.exercise in ("squat", "curl") and p.visible(S):
            if abs(p.dx(*S)) > .9 * p.distance(S[i], H[i]):
                return None
        torso = calculate_vertical_angle(p.point(H[i]), p.point(S[i]))
        if self.exercise == "squat":
            angle = p.angle(H[i], K[i], A[i])
            # Wide stances and other squat variants can legitimately lean more.
            issues = (("Keep your chest up.", (S[i], H[i])),) if torso > 65 else ()
            return self.bend(angle, joints, {"kneeAngle": round(angle, 1)}, issues)
        angle = p.angle(S[i], E[i], W[i])
        issues = []
        if p.angle(H[i], S[i], E[i]) > 30:
            issues.append(("Keep your upper arm close to your side.", (S[i], E[i])))
        if torso > 15:
            issues.append(("Keep your torso still. Avoid swinging.", (S[i], H[i])))
        return self.bend(angle, joints, {"elbowAngle": round(angle, 1)}, tuple(issues))

    def pushup(self, p):
        # Laptop cameras often clip or blur the feet, so the body line falls back
        # to the knee when the ankle isn't clear. The side is re-picked per frame.
        def option(i):
            end = A[i] if p.visible((A[i],)) else K[i]
            return i, end, (S[i], E[i], W[i], H[i], end)
        options = [option(i) for i in range(2)]
        i, end, joints = max(options, key=lambda o: min(map(p.confidence, o[2])))
        if not p.visible(joints):
            return None
        if abs(p.dx(S[i], end)) < p.distance(S[i], end) * 0.60:
            return None
        angle = p.angle(S[i], E[i], W[i])
        issues = ()
        if p.angle(S[i], H[i], end) < 155:
            # Image y grows downward: a hip below the shoulder–foot line is sagging.
            (sx, sy), (hx, hy), (ax, ay) = p.point(S[i]), p.point(H[i]), p.point(end)
            line_y = sy + (ay - sy) * (hx - sx) / (ax - sx) if ax != sx else sy
            cue = "Lift your hips so they don't sag." if hy > line_y else "Lower your hips into one line."
            issues = ((cue, (S[i], H[i], end)),)
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
        lean = max(calculate_vertical_angle(p.point(H[i]), p.point(S[i])) for i in range(2))
        issues = (("Keep your torso upright.", S + H),) if lean > 30 else ()
        return self.bend(angle, joints, {"leadKneeAngle": round(angle, 1) if self.lead is not None else None},
                         issues, home=home, target=split and self.lead is not None, moving=split)

    def jack(self, p):
        # Hands often leave the top of the frame on a jack, so wrists are optional;
        # elbows above the shoulders count as arms overhead.
        joints = S + H + E + A
        if not p.visible(joints):
            return None
        wrists = p.visible(W)
        if wrists:
            joints += W
        width = abs(p.dx(*S))
        if width < 0.5 * max(p.distance(S[i], H[i]) for i in range(2)):
            return None
        ratio = abs(p.dx(*A)) / width
        arms = [p.angle(H[i], S[i], E[i]) for i in range(2)]
        angle = min(arms)
        tip = W if wrists else E
        overhead = all(p.point(tip[i])[1] < p.point(S[i])[1] for i in range(2))
        issues = (("Raise both arms together.", S + E),) if abs(arms[0] - arms[1]) > 25 else ()
        return Motion(angle, max(arms) <= self.home and ratio <= 1.15,
                      max(arms) >= self.trigger or ratio >= 1.30,
                      angle >= self.target and overhead and ratio >= 1.30,
                      angle < 135, joints, {"armElevation": round(angle, 1), "stanceRatio": round(ratio, 2)}, issues)

    def press(self, p):
        joints = S + H + E + W
        if not p.visible(joints) or not p.facing():
            return None
        elbows = [p.angle(S[i], E[i], W[i]) for i in range(2)]
        angle = min(elbows)
        racked = all(p.point(W[i])[1] < p.point(E[i])[1] for i in range(2))
        torso = max(p.distance(S[i], H[i]) for i in range(2))
        overhead = all(p.point(W[i])[1] < p.point(S[i])[1] - 0.5 * torso for i in range(2))
        issues = (("Press both arms evenly.", S + E + W),) if abs(elbows[0] - elbows[1]) > 25 else ()
        return self.rise(angle, joints, {"elbowAngle": round(angle, 1)}, issues,
                         home=max(elbows) <= self.home and racked, target=overhead)

    def raise_(self, p):
        joints = S + H + E + W
        if not p.visible(joints) or not p.facing():
            return None
        arms = [p.angle(H[i], S[i], E[i]) for i in range(2)]
        angle = min(arms)
        issues = []
        if max(arms) > 110:
            issues.append(("Stop at shoulder height.", S + E))
        if abs(arms[0] - arms[1]) > 20:
            issues.append(("Raise both arms together.", S + E + W))
        return self.rise(angle, joints, {"armElevation": round(angle, 1)}, tuple(issues),
                         home=max(arms) <= self.home)

    def bridge(self, p):
        i, joints = self.pick_side(p, (S, H, K, A))
        if not p.visible(joints):
            return None
        # Lying down: shoulder and ankle are spread along the floor.
        if abs(p.dx(S[i], A[i])) < p.distance(S[i], A[i]) * 0.70:
            return None
        angle = p.angle(S[i], H[i], K[i])
        issues = ()
        if p.angle(H[i], K[i], A[i]) > 130:
            issues = (("Bring your feet closer to your hips.", (K[i], A[i])),)
        return self.rise(angle, joints, {"hipAngle": round(angle, 1)}, issues)


def ExerciseTracker(exercise):
    """Rep-counted exercises get a RepTracker; timed holds get a HoldTracker."""
    from app.exercises.hold import HOLDS, HoldTracker
    return HoldTracker(exercise) if exercise in HOLDS else RepTracker(exercise)


def _all_exercises():
    from app.exercises.hold import HOLDS
    views = dict(VIEWS)
    views.update({name: rule[3] for name, rule in HOLDS.items()})
    return views
