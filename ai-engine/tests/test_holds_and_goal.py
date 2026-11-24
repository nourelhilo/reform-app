"""Timed holds and the live angle-vs-goal gauge."""
import pytest

from app.exercises.tracking import A, H, K, S, ExerciseTracker
from app.analysis.angles import calculate_angle_2d
from test_exercises import pose


def blank():
    return [dict(x=.5, y=.5, z=0, visibility=0) for _ in range(33)]


def put(points, joint, x, y, aspect=16/9):
    points[joint].update(x=x * .58 / aspect + .5, y=.5 + (y - .5) * .58, visibility=.99)


def body(shoulder, ankle, hip_drop):
    """Shoulder → hip → ankle with the hip moved down (sag, +) or up (pike, −)."""
    points = blank()
    hip = ((shoulder[0] + ankle[0]) / 2, (shoulder[1] + ankle[1]) / 2 + hip_drop)
    knee = ((hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2)
    for i in range(2):
        put(points, S[i], *shoulder)
        put(points, H[i], *hip)
        put(points, K[i], *knee)
        put(points, A[i], *ankle)
    return points


plank = lambda drop=0.0: body((-.32, .55), (.32, .60), drop)
side_plank = lambda drop=0.0: body((-.25, .38), (.30, .74), drop)


def hold(name, frames, step=.25):
    tracker = ExerciseTracker(name)
    result = None
    for i, points in enumerate(frames):
        result = tracker.track(points, 16, 9, i * step)[0] or result
    return result


def test_plank_counts_only_good_seconds():
    good = hold("plank", [plank()] * 21)                      # 5 s at 4 fps
    assert good["hold"]["seconds"] == pytest.approx(5, abs=.01)
    assert good["formScore"] == 100 and good["phase"] == "holding"
    half = hold("plank", [plank(.07 if i % 2 else 0) for i in range(21)])
    assert half["hold"]["seconds"] == pytest.approx(2.5, abs=.3)
    assert 40 <= half["formScore"] <= 60


def test_plank_names_sag_and_pike():
    tracker = ExerciseTracker("plank")
    sag = tracker.track(plank(.08), 16, 9, 0)[0]
    assert sag["feedback"] == "Lift your hips into one line." and set(sag["faultJoints"])
    pike = ExerciseTracker("plank").track(plank(-.08), 16, 9, 0)[0]
    assert pike["feedback"] == "Lower your hips into one line."


def test_plank_ignores_standing_people():
    assert ExerciseTracker("plank").track(pose("squat", 175), 16, 9, 0)[0] is None


def test_hold_survives_brief_dropouts_but_not_long_ones():
    tracker = ExerciseTracker("plank")
    tracker.track(plank(), 16, 9, 0)
    hidden = plank()
    for joint in S:
        hidden[joint]["visibility"] = .1
    assert tracker.track(hidden, 16, 9, .5)[0] is None
    assert tracker.track(plank(), 16, 9, 1.0)[0]["hold"]["seconds"] == pytest.approx(1.0)
    assert tracker.track(plank(), 16, 9, 3.0)[0]["hold"]["seconds"] == pytest.approx(1.0)  # 2 s gap not counted


def test_side_plank_and_wall_sit():
    assert hold("side_plank", [side_plank()] * 9)["hold"]["seconds"] == pytest.approx(2)
    assert hold("side_plank", [side_plank(.08)] * 9)["hold"]["seconds"] == 0
    assert ExerciseTracker("side_plank").track(plank(), 16, 9, 0)[0] is None   # flat body is not a side plank
    sit = hold("wall_sit", [pose("squat", 95)] * 9)
    assert sit["hold"]["seconds"] == pytest.approx(2) and sit["metrics"]["kneeAngle"] == pytest.approx(95, abs=1)
    high = ExerciseTracker("wall_sit").track(pose("squat", 140), 16, 9, 0)[0]
    assert high["feedback"] == "Slide lower until your thighs are level."
    assert high["goal"] == {"current": pytest.approx(140, abs=1), "low": 75, "high": 115, "direction": "band",
                            "reached": False, "best": None}


def test_goal_gauge_values_match_the_counted_angle():
    tracker = ExerciseTracker("squat")
    start = tracker.track(pose("squat", 175), 16, 9, 0)[0]["goal"]
    assert start["target"] == 95 and start["ideal"] == 80 and start["direction"] == "lower"
    assert start["progress"] == 0 and start["best"] is None
    mid = tracker.track(pose("squat", 130), 16, 9, .3)[0]["goal"]
    assert mid["current"] == pytest.approx(130, abs=.5)
    assert mid["progress"] == pytest.approx((130 - 165) / (95 - 165), abs=.02)
    assert not mid["reached"]
    deep = tracker.track(pose("squat", 88), 16, 9, .6)[0]["goal"]
    assert deep["reached"] and deep["progress"] > 1 and deep["best"] == pytest.approx(88, abs=.5)
    done = tracker.track(pose("squat", 175), 16, 9, .9)[0]
    assert done["rep"] == 1 and done["goal"]["best"] == pytest.approx(88, abs=.5)
    assert done["lastRepDetail"]["goalAngle"] == 95


def test_goal_gauge_for_rising_exercise():
    tracker = ExerciseTracker("jumping_jack")
    goal = tracker.track(pose("jumping_jack", 90, spread=.2), 16, 9, 0)[0]["goal"]
    assert goal["direction"] == "higher" and goal["target"] == 130
    assert goal["progress"] == pytest.approx((90 - 35) / (130 - 35), abs=.02)


def test_reported_angles_are_accurate_on_known_geometry():
    """The gauge shows the same angle the geometry defines, within 1°, at any aspect/mirror."""
    for angle in (60, 90, 120, 150, 175):
        for aspect in (16/9, 4/3, 9/16):
            for mirror in (False, True):
                result = ExerciseTracker("squat").track(pose("squat", angle, aspect=aspect, mirror=mirror), 1, 1 / aspect * 1, 0)[0]
                assert result["goal"]["current"] == pytest.approx(angle, abs=1), (angle, aspect, mirror)
