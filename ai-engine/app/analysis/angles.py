import math
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

def calculate_angle_2d(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """
    Calculate the 2D planar angle at vertex b (in degrees: 0 to 180).
    Points: a, b (vertex), c.
    """
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    c = np.array(c, dtype=np.float64)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360.0 - angle

    return float(angle)


def calculate_angle_3d(a: Tuple[float, float, float], b: Tuple[float, float, float], c: Tuple[float, float, float]) -> float:
    """
    Calculate the 3D angle at vertex b using vector dot product.
    """
    va = np.array([a[0] - b[0], a[1] - b[1], a[2] - b[2]], dtype=np.float64)
    vc = np.array([c[0] - b[0], c[1] - b[1], c[2] - b[2]], dtype=np.float64)

    norm_va = np.linalg.norm(va)
    norm_vc = np.linalg.norm(vc)

    if norm_va < 1e-6 or norm_vc < 1e-6:
        return 0.0

    cosine = np.dot(va, vc) / (norm_va * norm_vc)
    cosine = np.clip(cosine, -1.0, 1.0)
    angle_rad = np.arccos(cosine)
    return float(np.degrees(angle_rad))


def calculate_distance_2d(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculate Euclidean distance in 2D normalized coordinate space."""
    return float(math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2))


def calculate_distance_3d(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
    """Calculate Euclidean distance in 3D space."""
    return float(math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2))


def calculate_vertical_angle(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculates angle of segment (p1->p2) relative to the vertical Y-axis.
    Useful for torso tilt, spine alignment, shin angle.
    0 deg = perfectly vertical.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    radians = math.atan2(abs(dx), abs(dy))
    return float(math.degrees(radians))


def calculate_horizontal_angle(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculates angle of segment relative to the horizontal X-axis.
    Useful for shoulder level, hip symmetry.
    0 deg = perfectly horizontal.
    """
    dx = abs(p2[0] - p1[0])
    dy = abs(p2[1] - p1[1])
    radians = math.atan2(dy, dx) if dx > 1e-6 else math.pi / 2
    return float(math.degrees(radians))


def calculate_velocity(p_current: Tuple[float, float], p_prev: Tuple[float, float], dt: float) -> float:
    """Calculates instantaneous speed (distance / time)."""
    if dt <= 0:
        return 0.0
    dist = calculate_distance_2d(p_current, p_prev)
    return float(dist / dt)


def smooth_point_ema(current: Tuple[float, float, float], previous: Optional[Tuple[float, float, float]], alpha: float = 0.65) -> Tuple[float, float, float]:
    """Exponential Moving Average (EMA) smoothing for jitter reduction."""
    if previous is None:
        return current
    return (
        alpha * current[0] + (1 - alpha) * previous[0],
        alpha * current[1] + (1 - alpha) * previous[1],
        alpha * current[2] + (1 - alpha) * previous[2],
    )
