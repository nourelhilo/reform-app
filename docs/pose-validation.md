# Pose validation

Reform reports inclusion angles in the camera plane. A straight knee or elbow is 180° in Reform and 0° of flexion in many studies. Subtract Reform's reading from 180° to compare with flexion. The engine corrects for video aspect ratio before measuring. [MediaPipe documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).

| Exercise | Reference | Counting target in Reform |
| --- | --- | --- |
| Squat | [Goniometer-based squat study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4064719/): 90° knee flexion is above parallel; actual parallel is defined separately. | Knee ≤95° at the bottom and ≥165° at the top. The app does not verify parallel depth or knee valgus. |
| Standard push-up | [NASM](https://www.nasm.org/resource-center/exercise-library/push-up): about 90° elbow bend or chest near the floor. | Elbow ≤95° at the bottom and ≥160° at the top. The app checks the shoulder–hip–ankle line; it does not measure chest clearance. |
| Single-arm curl | [Elbow-flexor research](https://pmc.ncbi.nlm.nih.gov/articles/PMC8489980/): full-range protocols used up to 130° flexion, equivalent to a 50° inclusion angle. | Same elbow ≤55° at peak and ≥160° on return. |
| Forward lunge | [Forward lunge biomechanics](https://doi.org/10.2519/jospt.2017.6336): measured roughly 90–100° of lead-knee flexion. | Lead knee ≤95° in a split stance; then return toward extension with feet back in. |
| Jumping jack | [NASM](https://www.nasm.org/workout-exercise-guidance/how-to-jumping-jacks): arms overhead and feet apart, then return; no degree cutoff. | Both upper arms ≥150° relative to the torso, wrists above shoulders and feet apart, then back in. These are app settings; airtime is not measured. |

These targets are for counting standard movements. A form estimate of 100% means that none of the configured visual cues fired. It does not verify complete form or injury risk. New records use pose rule version 2; older scores are not directly comparable.

- **Automated checks:** 27 geometry and exercise tests cover wide and tall frames, mirroring, partial reps, pauses, occlusion and jitter. Four additional tests cover service health, malformed frames, WebSocket origin checks, and a real-person image.
- **Recorded reference:** The 73-frame Kinect deep squat sample `m01_s01_e01` from [UI-PRMD](https://zenodo.org/records/23104965) produced one counted rep. Side-view angles differed from 3D inclusion angles computed from the same reconstructed joints by 7.9° on average and 38.4° at the worst frame. This is a projection check for one motion and does not measure webcam accuracy.
- **Pose service smoke test:** The WebSocket decoded a [real-person MediaPipe sample](https://storage.googleapis.com/mediapipe-assets/pose.jpg) and returned 33 landmarks. That confirms the image-to-pose path works for the sample.

To reproduce the squat replay, extract **UI-PRMD Visualize.zip** from the dataset record, then run `python datasets/check_reference_squat.py "/path/to/UI-PRMD Visualize"` from `ai-engine`.

To validate live accuracy, record labeled sets for all five exercises across people, cameras, views and lighting. Include partial reps and tracking loss. Compare with synchronized independent angle measurements, report angle error and rep precision/recall by exercise, and tune against a separate set. [A published MediaPipe comparison with optical motion capture](https://pmc.ncbi.nlm.nih.gov/articles/PMC10781343/) is useful for designing the check.
