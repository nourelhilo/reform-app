import time
import pytest
from app.exercises.squat import SquatAnalyzer, SquatState
from app.exercises.pushup import PushupAnalyzer, PushupState
from app.exercises.curl import BicepCurlAnalyzer, CurlState
from app.exercises.lunge import LungeAnalyzer, LungeState
from app.exercises.jumping_jack import JumpingJackAnalyzer, JumpingJackState
from app.pose.landmarks import PoseLandmark

def create_mock_landmarks(overrides=None):
    landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.95} for _ in range(33)]
    # Default standing posture
    landmarks[PoseLandmark.LEFT_SHOULDER] = {"x": 0.45, "y": 0.25, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_SHOULDER] = {"x": 0.55, "y": 0.25, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.LEFT_HIP] = {"x": 0.45, "y": 0.50, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_HIP] = {"x": 0.55, "y": 0.50, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.LEFT_KNEE] = {"x": 0.45, "y": 0.70, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_KNEE] = {"x": 0.55, "y": 0.70, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.LEFT_ANKLE] = {"x": 0.45, "y": 0.90, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_ANKLE] = {"x": 0.55, "y": 0.90, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.LEFT_ELBOW] = {"x": 0.40, "y": 0.40, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_ELBOW] = {"x": 0.60, "y": 0.40, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.LEFT_WRIST] = {"x": 0.40, "y": 0.60, "z": 0.0, "visibility": 0.95}
    landmarks[PoseLandmark.RIGHT_WRIST] = {"x": 0.60, "y": 0.60, "z": 0.0, "visibility": 0.95}

    if overrides:
        for idx, val in overrides.items():
            landmarks[idx] = val
    return landmarks

def test_squat_rep_counting_state_machine():
    analyzer = SquatAnalyzer()
    analyzer.MIN_REP_DURATION = 0.01  # fast test duration

    # 1. Standing (180 deg knee)
    standing = create_mock_landmarks()
    res1 = analyzer.analyze(standing)
    assert res1["phase"] == SquatState.STANDING.value
    assert res1["rep"] == 0

    # 2. Descending (knee bent to ~130 deg)
    descending = create_mock_landmarks({
        PoseLandmark.LEFT_KNEE: {"x": 0.38, "y": 0.65, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_KNEE: {"x": 0.62, "y": 0.65, "z": 0.0, "visibility": 0.95},
        PoseLandmark.LEFT_HIP: {"x": 0.45, "y": 0.58, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_HIP: {"x": 0.55, "y": 0.58, "z": 0.0, "visibility": 0.95},
    })
    res2 = analyzer.analyze(descending)
    assert res2["phase"] in [SquatState.DESCENDING.value, SquatState.BOTTOM.value]

    # 3. Bottom depth (knee bent to ~90 deg)
    bottom = create_mock_landmarks({
        PoseLandmark.LEFT_KNEE: {"x": 0.35, "y": 0.65, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_KNEE: {"x": 0.65, "y": 0.65, "z": 0.0, "visibility": 0.95},
        PoseLandmark.LEFT_HIP: {"x": 0.45, "y": 0.65, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_HIP: {"x": 0.55, "y": 0.65, "z": 0.0, "visibility": 0.95},
    })
    res3 = analyzer.analyze(bottom)
    assert res3["phase"] == SquatState.BOTTOM.value

    # 4. Ascending
    time.sleep(0.02)
    res4 = analyzer.analyze(descending)
    assert res4["phase"] == SquatState.ASCENDING.value

    # 5. Returned to standing -> Rep counted!
    res5 = analyzer.analyze(standing)
    assert res5["rep"] == 1
    assert res5["repCompleted"] is True
    assert res5["lastRepDetail"]["repNumber"] == 1

def test_bicep_curl_state_machine():
    analyzer = BicepCurlAnalyzer()
    analyzer.MIN_REP_DURATION = 0.01

    # 1. Extended arms (straight 180 deg)
    extended = create_mock_landmarks({
        PoseLandmark.LEFT_WRIST: {"x": 0.40, "y": 0.60, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_WRIST: {"x": 0.60, "y": 0.60, "z": 0.0, "visibility": 0.95},
    })
    res1 = analyzer.analyze(extended)
    assert res1["phase"] == CurlState.EXTENDED.value

    # 2. Curled up (elbow contracted to ~40 deg)
    curled = create_mock_landmarks({
        PoseLandmark.LEFT_WRIST: {"x": 0.40, "y": 0.28, "z": 0.0, "visibility": 0.95},
        PoseLandmark.RIGHT_WRIST: {"x": 0.60, "y": 0.28, "z": 0.0, "visibility": 0.95},
    })
    res2 = analyzer.analyze(curled)
    assert res2["phase"] in [CurlState.CURLING.value, CurlState.PEAK.value]

    time.sleep(0.02)
    # 3. Lowered back down -> Rep count increments
    res3 = analyzer.analyze(extended)
    assert res3["rep"] == 1
    assert res3["repCompleted"] is True
