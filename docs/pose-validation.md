# Pose validation

Reform reports inclusion angles in the camera plane. A straight knee or elbow is 180° in Reform and 0° of flexion in many studies. Subtract Reform's reading from 180° to compare with flexion. The engine corrects for video aspect ratio before measuring. [MediaPipe documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).

| Exercise | Reference | Counting target in Reform |
| --- | --- | --- |
| Squat | [Goniometer-based squat study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4064719/): 90° knee flexion is above parallel; actual parallel is defined separately. | Knee ≤95° at the bottom and ≥165° at the top. The app does not verify parallel depth or knee valgus. |
| Standard push-up | [NASM](https://www.nasm.org/resource-center/exercise-library/push-up): about 90° elbow bend or chest near the floor. | Elbow ≤100° at the bottom and ≥150° at the top (filmed lockouts read 152–157°). The app checks the shoulder–hip–ankle line; it does not measure chest clearance. |
| Forward lunge | [Forward lunge biomechanics](https://doi.org/10.2519/jospt.2017.6336): measured roughly 90–100° of lead-knee flexion. | Lead knee ≤95° in a split stance; then return toward extension with feet back in. |
| Plank (timed) | Straight body line. | Shoulder–hip–ankle line 160–180°; time counts only inside that band. |

These targets are for counting standard movements. A form estimate of 100% means that none of the configured visual cues fired. It does not verify complete form or injury risk. New records use pose rule version 2; older scores are not directly comparable.

- **Automated checks:** 27 geometry and exercise tests cover wide and tall frames, mirroring, partial reps, pauses, occlusion and jitter. Four additional tests cover service health, malformed frames, WebSocket origin checks, and a real-person image.
- **Recorded reference:** The 73-frame Kinect deep squat sample `m01_s01_e01` from [UI-PRMD](https://zenodo.org/records/23104965) produced one counted rep. Side-view angles differed from 3D inclusion angles computed from the same reconstructed joints by 7.9° on average and 38.4° at the worst frame. This is a projection check for one motion and does not measure webcam accuracy.
- **Pose service smoke test:** The WebSocket decoded a [real-person MediaPipe sample](https://storage.googleapis.com/mediapipe-assets/pose.jpg) and returned 33 landmarks. That confirms the image-to-pose path works for the sample.

To reproduce the squat replay, extract **UI-PRMD Visualize.zip** from the dataset record, then run `python datasets/check_reference_squat.py "/path/to/UI-PRMD Visualize"` from `ai-engine`.

## Real-video check (November 2026)

Each exercise was streamed through the live pose service from openly licensed Wikimedia Commons videos, frame by frame, as a webcam would send them. True reps were counted from the angle trace and the footage.

| Exercise | Clips | Result | Status |
| --- | --- | --- | --- |
| Squat | *Squat – exercise demonstration*; *Muscle Strengthening at Home – Half squat* | 2 of 2 full squats counted; 0 of 7 half squats (102–132°) counted, as intended | Offered |
| Push-up | *Interval Push-ups*; *Muscle Strengthening at Home – Push-ups* | 6 of 6 and every full rep on the second clip, after lowering the lockout to 150° (was 0 of 4) | Offered |
| Forward lunge | *Forward lunge training* (two encodings) | 2 counted on both; tracking dropped mid-rep elsewhere and that rep was not counted | Offered |
| Plank | *Naval Station Rota Navy 250 Plank Challenge* | Holding only when a planking body was tracked (body line 165–179°); no hold on standing people | Offered |
| Jumping jack | *Jumping jacks and burpees* | 1 of ~8 counted, before and after a fix | Retired |
| Shoulder press | *Overhead Push Press*, *Overhead Press*, two more | 1 of 3 presses counted; landmarks unreliable when arms overhead | Retired |
| Bicep curl | *Bicep Curls*, *EZ Bar Curl*, *CURL BÍCEPS* | 0 counted; elbow angles jumped to impossible 3–11° readings | Retired |
| Lateral raise, glute bridge, side plank, wall sit | none found | Not validated | Retired |

Retired exercises keep their rules and tests in `ai-engine` but the live service, setup screen and save API do not accept them. Their names still display in older history. To bring one back, add it to `ACTIVE` in `ai-engine/app/exercises/tracking.py`, `frontend/src/services/exercises.js` and `backend/src/config/exercises.js` once it passes a real-video check like the one above.

To validate live accuracy further, record labeled sets for every offered exercise across people, cameras, views and lighting. Include partial reps and tracking loss. Compare with synchronized independent angle measurements, report angle error and rep precision/recall by exercise, and tune against a separate set. [A published MediaPipe comparison with optical motion capture](https://pmc.ncbi.nlm.nih.gov/articles/PMC10781343/) is useful for designing the check.
