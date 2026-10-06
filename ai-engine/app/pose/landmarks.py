from enum import IntEnum
from typing import Dict, Any, List, Optional, Tuple

class PoseLandmark(IntEnum):
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32

# Key joints required for full-body tracking
CORE_UPPER_BODY = [
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST
]

CORE_LOWER_BODY = [
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE
]

FULL_BODY_REQUIRED = CORE_UPPER_BODY + CORE_LOWER_BODY

def evaluate_body_visibility(landmarks: List[Dict[str, float]], min_visibility: float = 0.5) -> Dict[str, Any]:
    """
    Evaluates whether the person is fully in frame, partially visible, or missing.
    """
    if not landmarks or len(landmarks) < 33:
        return {
            "status": "no_person",
            "is_valid": False,
            "message": "No person detected. Step into frame.",
            "overall_confidence": 0.0,
            "visible_ratio": 0.0
        }

    visibilities = [lm.get("visibility", 0.0) for lm in landmarks]
    avg_confidence = float(sum(visibilities) / len(visibilities))

    # Check key full body points
    full_body_vis = [landmarks[idx].get("visibility", 0.0) for idx in FULL_BODY_REQUIRED]
    visible_count = sum(1 for v in full_body_vis if v >= min_visibility)
    visible_ratio = visible_count / len(FULL_BODY_REQUIRED)

    # Upper body vs Lower body check
    upper_vis = sum(1 for idx in CORE_UPPER_BODY if landmarks[idx].get("visibility", 0.0) >= min_visibility)
    lower_vis = sum(1 for idx in CORE_LOWER_BODY if landmarks[idx].get("visibility", 0.0) >= min_visibility)

    if visible_ratio < 0.3 or avg_confidence < 0.35:
        return {
            "status": "low_confidence",
            "is_valid": False,
            "message": "Having trouble tracking your movement.",
            "overall_confidence": round(avg_confidence, 2),
            "visible_ratio": round(visible_ratio, 2)
        }

    if lower_vis < 3 and upper_vis >= 4:
        return {
            "status": "partial_body",
            "is_valid": False,
            "message": "Move farther back so your full body and legs are visible.",
            "overall_confidence": round(avg_confidence, 2),
            "visible_ratio": round(visible_ratio, 2)
        }

    if upper_vis < 3 and lower_vis >= 4:
        return {
            "status": "partial_body",
            "is_valid": False,
            "message": "Adjust camera so your upper body and head are visible.",
            "overall_confidence": round(avg_confidence, 2),
            "visible_ratio": round(visible_ratio, 2)
        }

    if visible_ratio < 0.75:
        return {
            "status": "partial_body",
            "is_valid": False,
            "message": "Move back so your full body is visible in frame.",
            "overall_confidence": round(avg_confidence, 2),
            "visible_ratio": round(visible_ratio, 2)
        }

    return {
        "status": "ready",
        "is_valid": True,
        "message": "Tracking ready",
        "overall_confidence": round(avg_confidence, 2),
        "visible_ratio": round(visible_ratio, 2)
    }
