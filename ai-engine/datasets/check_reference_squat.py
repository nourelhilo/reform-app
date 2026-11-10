"""Compare Reform's sagittal angle with a Kinect reference clip (no RGB inference).

Pass the extracted UI-PRMD Visualize directory, available from
https://zenodo.org/records/23104965. The joint hierarchy and ZYX convention
are documented in the authors' Animation.m.
"""
from pathlib import Path
import argparse
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.exercises.tracking import A, H, K, S, ExerciseTracker, Pose


PARENTS = (-1, 0, 1, 2, 2, 4, 2, 6, 7, 8, 2, 10, 11, 12, 0, 14, 15, 16, 0, 18, 19, 20)


def rotation(angles):
    x, y, z = np.radians(angles)
    a, b, c = np.cos((x, y, z))
    u, v, w = np.sin((x, y, z))
    return np.array([
        [b*c, u*v*c-a*w, a*v*c+u*w],
        [b*w, u*v*w+a*c, a*v*w-u*c],
        [-v, u*b, a*b],
    ])


def absolute_positions(offsets, eulers):
    absolute = offsets.copy()
    transforms = [rotation(eulers[0])]
    for joint, parent in enumerate(PARENTS[1:], 1):
        absolute[joint] = absolute[parent] + transforms[parent] @ offsets[joint]
        transforms.append(transforms[parent] @ rotation(eulers[joint]))
    return absolute


def inclusion_angle_3d(hip, knee, ankle):
    a, b = hip-knee, ankle-knee
    return np.degrees(np.arctan2(np.linalg.norm(np.cross(a, b)), a @ b))


def check(directory):
    prefix = directory / "m01_s01_e01"
    offsets, eulers = (np.loadtxt(f"{prefix}_{name}.txt", delimiter=",").reshape(-1, 22, 3)
                       for name in ("positions", "angles"))
    track = np.array([absolute_positions(p, a) for p, a in zip(offsets, eulers, strict=True)])
    # Side camera looks along the lateral axis. Both dimensions get the
    # same scale; width/height normalization is applied afterward.
    side = track[:, :, [2, 1]].copy()
    side[:, :, 1] *= -1
    low, high = side.min(axis=(0, 1)), side.max(axis=(0, 1))
    side = (side - (low + high) / 2) / (max(high - low) * 1.2)
    aspect = 16 / 9
    errors, pairs = [], [[], []]
    tracker = ExerciseTracker("squat")
    for i, joints in enumerate(side):
        points = [{"x": .5, "y": .5, "visibility": 0}] * 33
        for s, mapping in enumerate(((7, 14, 15, 16), (11, 18, 19, 20))):
            for label, idx in zip((S[s], H[s], K[s], A[s]), mapping, strict=True):
                x, y = joints[idx]
                points[label] = {"x": .5 + x/aspect, "y": .5 + y, "visibility": 1}
            measured = Pose(points, 16, 9).angle(H[s], K[s], A[s])
            reference = inclusion_angle_3d(*track[i, list(mapping[1:])])
            errors.append(abs(measured - reference))
            pairs[s].append((measured, reference))
        # The visualizer provides positions without timestamps; replay the
        # segmented trace at the Kinect capture rate for a rule smoke check.
        tracker.track(points, 16, 9, i / 30)
    print(f"{len(track)} frames; one deep squat segment (Kinect joints, no webcam pixels)")
    for name, values in zip(("left", "right"), pairs, strict=True):
        planar, spatial = np.array(values).T
        print(f"{name} knee: 2D {planar.min():.1f}–{planar.max():.1f}°, "
              f"3D {spatial.min():.1f}–{spatial.max():.1f}°")
    print(f"Projection difference across both knees: mean {np.mean(errors):.1f}°, max {max(errors):.1f}°")
    print(f"Reform completed reps from the segmented trace: {tracker.cycle.rep_count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    check(parser.parse_args().directory)
