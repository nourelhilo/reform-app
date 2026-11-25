"""Noisy, realistic motion: reps must still count, and near-misses must not."""
import math
import random

import pytest

from app.exercises.tracking import ExerciseTracker
from test_exercises import pose

RANGES = {"squat": (172, 80), "pushup": (170, 80), "curl": (165, 40)}


def run(exercise, top, bottom, reps, *, fps=12, rep_s=2.0, jitter=3.0, drop=0.0, pause=0.6, seed=0):
    rnd = random.Random(seed)
    tracker, now, last = ExerciseTracker(exercise), 0.0, None

    def step(angle):
        nonlocal now, last
        now += 1 / fps
        if rnd.random() < drop:
            return
        result, _ = tracker.track(pose(exercise, angle + rnd.gauss(0, jitter)), 1280, 720, now)
        last = result or last

    for _ in range(int(pause * fps)):
        step(top)
    for _ in range(reps):
        frames = int(rep_s * fps)
        for k in range(frames + 1):
            step(bottom + (top - bottom) * (1 + math.cos(2 * math.pi * k / frames)) / 2)
        for _ in range(int(pause * fps)):
            step(top)
    return last["rep"] if last else 0


@pytest.mark.parametrize("exercise", RANGES)
@pytest.mark.parametrize("conditions", [
    {}, {"jitter": 6}, {"rep_s": 1.0}, {"rep_s": 5.0}, {"fps": 6}, {"drop": 0.2}, {"pause": 0},
])
def test_counts_every_full_rep(exercise, conditions):
    for seed in range(3):
        assert run(exercise, *RANGES[exercise], 8, seed=seed, **conditions) == 8


@pytest.mark.parametrize("exercise,top,bottom", [("squat", 172, 115), ("pushup", 170, 115), ("curl", 165, 85)])
def test_ignores_partial_reps_and_standing_still(exercise, top, bottom):
    for seed in range(3):
        assert run(exercise, top, bottom, 8, jitter=6, seed=seed) == 0
        assert run(exercise, top, top, 8, jitter=8, seed=seed) == 0


def live_service(exercise, top, bottom, reps, rep_s, seed, hide=None, spread=None):
    """Replies arrive every 0.11-0.36 s (the live service with two frames in flight)."""
    rnd = random.Random(seed)
    tracker, now, last = ExerciseTracker(exercise), 0.0, None

    def angle_at(time):
        k = (time - 1.0) % (rep_s + .3)
        if time < 1.0 or k > rep_s:
            return top
        return bottom + (top - bottom) * (1 + math.cos(2 * math.pi * k / rep_s)) / 2

    while now < reps * (rep_s + .3) + 1.0:
        now += .55 * rnd.choice([.2, .21, .22, .22, .25, .3, .45, .65])
        angle = angle_at(now) + rnd.gauss(0, 3)
        points = pose(exercise, angle, **({"spread": spread(angle)} if spread else {}))
        for joint in (hide(angle, rnd) if hide else ()):
            points[joint]["visibility"] = rnd.uniform(.1, .5)
        result, _ = tracker.track(points, 1280, 720, now)
        last = result or last
    return last["rep"] if last else 0


def test_jumping_jacks_count_with_hands_above_the_frame():
    from app.exercises.tracking import W
    counts = [live_service("jumping_jack", 15, 170, 10, .9, seed, spread=lambda a: .09 + .16 * (a - 15) / 155,
                           hide=lambda a, _: W if a > 140 else ()) for seed in range(6)]
    assert min(counts) >= 9 and max(counts) <= 10, counts


def test_push_ups_count_when_the_ankles_flicker():
    from app.exercises.tracking import A
    counts = [live_service("pushup", 170, 80, 10, 1.4, seed,
                           hide=lambda a, rnd: A if rnd.random() < .4 else ()) for seed in range(6)]
    assert min(counts) >= 9 and max(counts) <= 10, counts
