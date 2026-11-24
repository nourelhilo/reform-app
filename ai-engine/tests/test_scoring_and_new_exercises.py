"""Per-rep scoring and the front-view/floor exercises added after the first five."""
from math import cos, radians, sin

import pytest

from app.exercises.motion import grade
from app.exercises.tracking import A, E, H, K, S, W, ExerciseTracker
from app.analysis.angles import calculate_angle_2d
from test_exercises import pose


def blank():
    return [dict(x=.5, y=.5, z=0, visibility=0) for _ in range(33)]


def put(points, joint, x, y, aspect=16/9):
    """x, y are in square units with y growing downward, centred on 0.5."""
    points[joint].update(x=x * .58 / aspect + .5, y=.5 + (y - .5) * .58, visibility=.99)


def press(angle, other=None):
    points = blank()
    for i, sign in enumerate((-1, 1)):
        theta = other if (other is not None and i) else angle
        rise = radians((theta - 90) / 90 * 70)          # upper arm lifts as the elbow opens
        fore = rise + radians(180 - theta)              # forearm turns up from the upper arm
        sx, sy = sign * .13, .40
        ex, ey = sx + sign * .15 * cos(rise), sy - .15 * sin(rise)
        put(points, S[i], sx, sy)
        put(points, H[i], sx, .65)
        put(points, E[i], ex, ey)
        put(points, W[i], ex + sign * .14 * cos(fore), ey - .14 * sin(fore))
    return points


def lateral(angle, other=None):
    points = blank()
    for i, sign in enumerate((-1, 1)):
        theta = radians(other if (other is not None and i) else angle)
        sx, sy = sign * .13, .40
        put(points, S[i], sx, sy)
        put(points, H[i], sx, .65)
        put(points, E[i], sx + sign * .15 * sin(theta), sy + .15 * cos(theta))
        put(points, W[i], sx + sign * .28 * sin(theta), sy + .28 * cos(theta))
    return points


def bridge(angle, ankle=(.28, .75)):
    """Lying side view: find the hip height that gives the requested S–H–K angle."""
    shoulder, knee = (-.32, .75), (.20, .50)
    # The angle grows with hip height until the hip reaches the shoulder–knee line.
    low, high = 0.0, .75 - (shoulder[1] + (knee[1] - shoulder[1]) * (-.05 - shoulder[0]) / (knee[0] - shoulder[0]))
    for _ in range(60):
        lift = (low + high) / 2
        hip = (-.05, .75 - lift)
        if calculate_angle_2d(shoulder, hip, knee) < angle:
            low = lift
        else:
            high = lift
    points = blank()
    for i in range(2):
        put(points, S[i], *shoulder)
        put(points, H[i], *hip)
        put(points, K[i], *knee)
        put(points, A[i], *ankle)
    return points


BUILDERS = {"shoulder_press": press, "lateral_raise": lateral, "glute_bridge": bridge}


@pytest.mark.parametrize("name,angles", [
    ("shoulder_press", [90, 130, 168, 130, 92]),
    ("lateral_raise", [10, 50, 86, 50, 12]),
    ("glute_bridge", [136, 155, 172, 150, 136]),
])
def test_new_exercises_count_one_full_rep(name, angles):
    tracker = ExerciseTracker(name)
    results = [tracker.track(BUILDERS[name](angle), 16, 9, i * .3)[0] for i, angle in enumerate(angles)]
    assert all(results), "every frame should be trackable"
    assert [r["rep"] for r in results] == [0, 0, 0, 0, 1]
    assert results[-1]["lastRepDetail"]["maxRomAngle"] == pytest.approx(angles[2], abs=1)


@pytest.mark.parametrize("name,angles", [
    ("shoulder_press", [90, 130, 145, 130, 92]),
    ("lateral_raise", [10, 50, 70, 50, 12]),
    ("glute_bridge", [136, 155, 160, 150, 136]),
])
def test_new_exercises_ignore_partial_reps(name, angles):
    tracker = ExerciseTracker(name)
    for i, angle in enumerate(angles):
        result, _ = tracker.track(BUILDERS[name](angle), 16, 9, i * .3)
    assert result["rep"] == 0
    assert "Range target missed" in result["feedback"]


def test_front_view_exercises_reject_side_view():
    assert ExerciseTracker("shoulder_press").track(pose("curl", 90), 16, 9, 0)[0] is None
    assert ExerciseTracker("lateral_raise").track(pose("curl", 170), 16, 9, 0)[0] is None


def rep(name, angles, builder=None, step=.3, **kwargs):
    tracker = ExerciseTracker(name)
    build = builder or (lambda angle: pose(name, angle, **kwargs))
    for i, angle in enumerate(angles):
        result, _ = tracker.track(build(angle), 16, 9, i * step)
    return result["lastRepDetail"]


def test_deeper_reps_score_higher_and_get_graded():
    deep = rep("squat", [177, 135, 78, 128, 174])
    shallow = rep("squat", [177, 135, 94, 128, 174])
    assert deep["formScore"] > shallow["formScore"]
    assert deep["grade"] == "A" and deep["faults"] == []
    assert shallow["rangeScore"] < deep["rangeScore"]


def test_shallow_rep_coaches_more_depth():
    tracker = ExerciseTracker("squat")
    for i, angle in enumerate([177, 135, 94, 128, 174]):
        result, _ = tracker.track(pose("squat", angle), 16, 9, i * .3)
    assert result["rep"] == 1 and "Go a little deeper" in result["feedback"]


def test_rushed_reps_lose_control_points():
    slow = rep("squat", [177, 135, 80, 128, 174], step=.3)
    rushed = rep("squat", [177, 135, 80, 128, 174], step=.2)
    assert rushed["controlScore"] < slow["controlScore"]
    assert "Slow down and control the movement." in rushed["feedbackGiven"]


def test_a_fault_held_all_rep_costs_its_share_and_is_named():
    uneven = rep("lateral_raise", [10, 50, 86, 50, 12], builder=lambda a: lateral(a, other=a + 25 if a > 20 else a))
    clean = rep("lateral_raise", [10, 50, 86, 50, 12], builder=lateral)
    assert uneven["formScore"] < clean["formScore"]
    assert "Raise both arms together." in [fault["cue"] for fault in uneven["faults"]]
    assert uneven["grade"] != "A"


def test_fault_joints_are_reported_during_a_rep():
    tracker = ExerciseTracker("lateral_raise")
    tracker.track(lateral(10), 16, 9, 0)
    result, _ = tracker.track(lateral(60, other=100), 16, 9, .3)
    assert "Raise both arms together." in result["feedback"]
    assert set(result["faultJoints"]) >= set(S)


def test_grade_bands():
    assert [grade(s) for s in (100, 90, 89, 80, 79, 65, 64, 0)] == ["A", "A", "B", "B", "C", "C", "D", "D"]


def test_bridge_flags_feet_too_far():
    tracker = ExerciseTracker("glute_bridge")
    tracker.track(bridge(136, ankle=(.66, .52)), 16, 9, 0)
    result, _ = tracker.track(bridge(155, ankle=(.66, .52)), 16, 9, .3)
    assert "Bring your feet closer to your hips." in result["feedback"]
