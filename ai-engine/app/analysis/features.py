import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from app.pose.landmarks import PoseLandmark
from app.analysis.angles import calculate_angle_2d, calculate_distance_2d, calculate_vertical_angle

def extract_normalized_features(landmarks: List[Dict[str, float]]) -> np.ndarray:
    """
    Extracts scale- and translation-invariant spatial features from 33 body landmarks.
    Normalizes coordinates relative to the midpoint between left & right hip,
    and scales by the torso height (distance between shoulder mid and hip mid).
    """
    if not landmarks or len(landmarks) < 33:
        return np.zeros(64, dtype=np.float32)

    l_hip = np.array([landmarks[PoseLandmark.LEFT_HIP]["x"], landmarks[PoseLandmark.LEFT_HIP]["y"]], dtype=np.float32)
    r_hip = np.array([landmarks[PoseLandmark.RIGHT_HIP]["x"], landmarks[PoseLandmark.RIGHT_HIP]["y"]], dtype=np.float32)
    l_sh = np.array([landmarks[PoseLandmark.LEFT_SHOULDER]["x"], landmarks[PoseLandmark.LEFT_SHOULDER]["y"]], dtype=np.float32)
    r_sh = np.array([landmarks[PoseLandmark.RIGHT_SHOULDER]["x"], landmarks[PoseLandmark.RIGHT_SHOULDER]["y"]], dtype=np.float32)

    hip_mid = (l_hip + r_hip) / 2.0
    sh_mid = (l_sh + r_sh) / 2.0
    torso_scale = float(np.linalg.norm(sh_mid - hip_mid))
    if torso_scale < 1e-4:
        torso_scale = 1.0

    # Key landmark positions normalized
    key_indices = [
        PoseLandmark.NOSE,
        PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
        PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
        PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
        PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
        PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
        PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE
    ]

    normalized_coords = []
    for idx in key_indices:
        pt = np.array([landmarks[idx]["x"], landmarks[idx]["y"]], dtype=np.float32)
        norm_pt = (pt - hip_mid) / torso_scale
        normalized_coords.extend([norm_pt[0], norm_pt[1]])

    # Joint Angles
    pt_dict = {idx: (landmarks[idx]["x"], landmarks[idx]["y"]) for idx in key_indices}
    
    l_knee_angle = calculate_angle_2d(pt_dict[PoseLandmark.LEFT_HIP], pt_dict[PoseLandmark.LEFT_KNEE], pt_dict[PoseLandmark.LEFT_ANKLE]) / 180.0
    r_knee_angle = calculate_angle_2d(pt_dict[PoseLandmark.RIGHT_HIP], pt_dict[PoseLandmark.RIGHT_KNEE], pt_dict[PoseLandmark.RIGHT_ANKLE]) / 180.0
    l_elbow_angle = calculate_angle_2d(pt_dict[PoseLandmark.LEFT_SHOULDER], pt_dict[PoseLandmark.LEFT_ELBOW], pt_dict[PoseLandmark.LEFT_WRIST]) / 180.0
    r_elbow_angle = calculate_angle_2d(pt_dict[PoseLandmark.RIGHT_SHOULDER], pt_dict[PoseLandmark.RIGHT_ELBOW], pt_dict[PoseLandmark.RIGHT_WRIST]) / 180.0
    l_arm_angle = calculate_angle_2d(pt_dict[PoseLandmark.LEFT_HIP], pt_dict[PoseLandmark.LEFT_SHOULDER], pt_dict[PoseLandmark.LEFT_WRIST]) / 180.0
    r_arm_angle = calculate_angle_2d(pt_dict[PoseLandmark.RIGHT_HIP], pt_dict[PoseLandmark.RIGHT_SHOULDER], pt_dict[PoseLandmark.RIGHT_WRIST]) / 180.0
    torso_angle = calculate_vertical_angle(tuple(hip_mid), tuple(sh_mid)) / 90.0

    # Distances
    ankle_sep = calculate_distance_2d(pt_dict[PoseLandmark.LEFT_ANKLE], pt_dict[PoseLandmark.RIGHT_ANKLE]) / torso_scale
    wrist_sep = calculate_distance_2d(pt_dict[PoseLandmark.LEFT_WRIST], pt_dict[PoseLandmark.RIGHT_WRIST]) / torso_scale
    knee_sep = calculate_distance_2d(pt_dict[PoseLandmark.LEFT_KNEE], pt_dict[PoseLandmark.RIGHT_KNEE]) / torso_scale

    angles_and_distances = [
        l_knee_angle, r_knee_angle,
        l_elbow_angle, r_elbow_angle,
        l_arm_angle, r_arm_angle,
        torso_angle,
        ankle_sep, wrist_sep, knee_sep
    ]

    feature_vector = np.array(normalized_coords + angles_and_distances, dtype=np.float32)
    return feature_vector
