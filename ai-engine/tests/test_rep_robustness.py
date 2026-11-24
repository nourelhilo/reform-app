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


@pytest.mark.parametrize("exercise,top,bottom", [("squat", 172, 115), ("pushup", 170, 115), ("curl", 165, 75)])
def test_ignores_partial_reps_and_standing_still(exercise, top, bottom):
    for seed in range(3):
        assert run(exercise, top, bottom, 8, jitter=6, seed=seed) == 0
        assert run(exercise, top, top, 8, jitter=8, seed=seed) == 0
