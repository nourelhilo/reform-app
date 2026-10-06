import pytest
import numpy as np
from app.analysis.angles import (
    calculate_angle_2d,
    calculate_angle_3d,
    calculate_distance_2d,
    calculate_vertical_angle,
    calculate_horizontal_angle,
    calculate_velocity,
    smooth_point_ema
)

def test_calculate_angle_2d_right_angle():
    # 90-degree right angle (0,1) - (0,0) - (1,0)
    a = (0.0, 1.0)
    b = (0.0, 0.0)
    c = (1.0, 0.0)
    angle = calculate_angle_2d(a, b, c)
    assert abs(angle - 90.0) < 1e-4

def test_calculate_angle_2d_straight_line():
    # 180-degree straight line (0,0) - (1,0) - (2,0)
    a = (0.0, 0.0)
    b = (1.0, 0.0)
    c = (2.0, 0.0)
    angle = calculate_angle_2d(a, b, c)
    assert abs(angle - 180.0) < 1e-4

def test_calculate_angle_3d():
    a = (0.0, 1.0, 0.0)
    b = (0.0, 0.0, 0.0)
    c = (1.0, 0.0, 0.0)
    angle = calculate_angle_3d(a, b, c)
    assert abs(angle - 90.0) < 1e-4

def test_calculate_distance_2d():
    p1 = (0.0, 0.0)
    p2 = (3.0, 4.0)
    dist = calculate_distance_2d(p1, p2)
    assert abs(dist - 5.0) < 1e-4

def test_calculate_vertical_angle():
    # Vertical segment (0,0) to (0,1) -> 0 degrees from vertical
    p1 = (0.5, 0.2)
    p2 = (0.5, 0.8)
    v_angle = calculate_vertical_angle(p1, p2)
    assert abs(v_angle - 0.0) < 1e-4

def test_calculate_velocity():
    p1 = (0.0, 0.0)
    p2 = (0.3, 0.4)
    dt = 0.5
    vel = calculate_velocity(p1, p2, dt)
    assert abs(vel - 1.0) < 1e-4

def test_smooth_point_ema():
    curr = (1.0, 2.0, 3.0)
    prev = (0.0, 0.0, 0.0)
    smoothed = smooth_point_ema(curr, prev, alpha=0.5)
    assert abs(smoothed[0] - 0.5) < 1e-4
    assert abs(smoothed[1] - 1.0) < 1e-4
    assert abs(smoothed[2] - 1.5) < 1e-4
