from math import cos, radians, sin

import pytest

from app.exercises.tracking import A, E, H, HEEL, K, S, TOE, W, ExerciseTracker


def pose(exercise, angle, *, aspect=16/9, spread=None, other_arm=None, mirror=False):
    """Build landmarks in square-pixel space, then normalize like MediaPipe."""
    points = [{} for _ in range(33)]
    for p in points:
        p.update(x=0.5, y=0.5, z=0, visibility=0)
    def put(joint, x, y):
        x = x * .58 / aspect + 0.5
        points[joint].update(x=1-x if mirror else x, y=.5+(y-.5)*.58, visibility=0.99)

    for i in range(2):
        offset = (i*2-1) * 0.015
        theta = radians(angle)
        if exercise == "squat":
            x = offset
            put(A[i], x, .88)
            put(K[i], x, .66)
            hx, hy = x-.22*sin(theta), .66+.22*cos(theta)
            put(H[i], hx, hy)
            put(S[i], hx+.06, hy-.24)
        elif exercise in ("curl", "pushup"):
            x = offset - (.27 if exercise == "pushup" else 0)
            y = .56 if exercise == "pushup" else .3
            put(S[i], x, y)
            put(E[i], x, y+.15)
            put(W[i], x+.16*sin(theta), y+.15-.16*cos(theta))
            if exercise == "pushup":
                put(H[i], x+.27, y+.02)
                put(A[i], x+.58, y+.10)
            else:
                put(H[i], x, .56)
        elif exercise == "lunge":
            wide = angle < 159
            x = (-.24 if i == 0 else .18) if wide else offset
            put(A[i], x, .87)
            put(HEEL[i], x+.05, .90)
            put(TOE[i], x-.07, .90)
            if i == 0 or not wide:
                put(K[i], x, .67)
                hx, hy = x+.21*sin(theta), .67+.21*cos(theta)
            else:
                # The trail knee bends deeply even on the shallow-lead fixture.
                put(K[i], -.015, .78)
                hx, hy = -.025, .67+.21*cos(theta)
            put(H[i], hx, hy)
            put(S[i], hx+.03, hy-.25)
        else:
            sign = i*2-1
            x = sign*.13
            if other_arm is not None and i:
                theta = radians(other_arm)
            put(S[i], x, .40)
            put(H[i], x, .65)
            put(E[i], x+sign*.15*sin(theta), .40+.15*cos(theta))
            put(W[i], x+sign*.29*sin(theta), .40+.29*cos(theta))
            put(A[i], sign*(spread if spread is not None else (.22 if angle > 45 else .09)), .9)
    return points


@pytest.mark.parametrize("name,angles", [
    ("squat", [177, 135, 88, 128, 174]),
    ("pushup", [177, 132, 91, 132, 173]),
    ("curl", [176, 130, 52, 105, 172]),
    ("lunge", [177, 132, 88, 135, 173]),
    ("jumping_jack", [10, 90, 158, 100, 12]),
])
@pytest.mark.parametrize("aspect,mirror", [(16/9, False), (9/16, True)])
def test_one_full_rep_at_measured_angles(name, angles, aspect, mirror):
    tracker = ExerciseTracker(name)
    results = [tracker.track(pose(name, angle, aspect=aspect, mirror=mirror), aspect, 1, i*.27)[0]
               for i, angle in enumerate(angles)]
    assert [r["rep"] for r in results] == [0, 0, 0, 0, 1]
    assert results[-1]["lastRepDetail"]["maxRomAngle"] == pytest.approx(angles[2], abs=.1)


@pytest.mark.parametrize("name,angles", [
    ("squat", [175, 135, 116, 130, 175]),
    ("pushup", [175, 135, 107, 130, 175]),
    ("curl", [175, 135, 65, 130, 175]),
    ("lunge", [175, 135, 108, 130, 175]),
    ("jumping_jack", [10, 90, 137, 90, 10]),
])
def test_partial_rom_is_not_counted(name, angles):
    tracker = ExerciseTracker(name)
    for i, angle in enumerate(angles):
        result, _ = tracker.track(pose(name, angle), 16, 9, i*.27)
    assert result["rep"] == 0
    assert "Range target missed" in result["feedback"]


def test_bottom_start_occlusion_and_pause_never_complete_unobserved_rep():
    for interruption in ("occlusion", "pause", "gap"):
        tracker = ExerciseTracker("squat")
        def frame(angle, t, hidden=False):
            points = pose("squat", angle)
            if hidden:
                for idx in K:
                    points[idx]["visibility"] = .1
            return tracker.track(points, 16, 9, t)[0]
        frame(88, 0)
        assert frame(175, .4)["rep"] == 0
        frame(132, .6)
        frame(85, .9)
        if interruption == "occlusion":
            assert frame(130, 1.05, hidden=True) is None
        elif interruption == "pause":
            tracker.interrupt()
        assert frame(175, 1.8 if interruption == "gap" else 1.23)["rep"] == 0


def test_jacks_need_both_arms_and_feet_to_close():
    tracker = ExerciseTracker("jumping_jack")
    for t, angle, spread, right in [(0, 10, .09, 10), (.12, 90, .22, 90),
                                   (.24, 162, .22, 110), (.36, 160, .22, 160),
                                   (.48, 10, .22, 10), (.60, 10, .09, 10)]:
        result, _ = tracker.track(pose("jumping_jack", angle, spread=spread, other_arm=right), 16, 9, t)
        assert result["rep"] == int(t == .60)


def test_side_does_not_change_during_a_curl():
    tracker = ExerciseTracker("curl")
    for i, angle in enumerate((175, 130, 50)):
        frame = pose("curl", angle)
        if i:
            frame[W[1]]["visibility"] = 1
        result, _ = tracker.track(frame, 16, 9, i*.25)
        assert W[0] in result["activeJoints"]
        assert W[1] not in result["activeJoints"]


def test_pushup_rejects_standing_curl_pose():
    result, _ = ExerciseTracker("pushup").track(pose("curl", 90), 16, 9, 0)
    assert result is None


def test_fast_jitter_does_not_count():
    tracker = ExerciseTracker("squat")
    for i, angle in enumerate((175, 140, 80, 175)):
        result, _ = tracker.track(pose("squat", angle), 16, 9, i*.05)
    assert result["rep"] == 0
    assert result["formScore"] is None
