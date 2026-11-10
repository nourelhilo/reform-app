# Reform

**What we verified about the workout angles:** Reform passed 27 automated angle and rep checks across five exercises. A recorded University of Idaho deep squat produced one counted rep. For that clip, the side-view knee estimate differed from the 3D angle calculated from the same joints by **7.9° on average**, with a **38.4°** worst frame. The exercise targets were checked against published guidance. Live-camera accuracy still needs filmed validation. See the [angle references and validation results](docs/pose-validation.md).

Reform is a webcam workout coach for squats, standard floor push-ups, single-arm curls, forward lunges, and jumping jacks. MediaPipe estimates body landmarks, and exercise-specific rules count reps. Reform must see the starting position, target, and return; pause or loss of tracking cancels the unfinished rep.

## Run locally

Use Node.js 20+ and 64-bit Python 3.11 or 3.12.

In one terminal, start the pose service:

```powershell
cd ai-engine
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

On macOS or Linux, use `.venv/bin/python` for the last two commands. In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), choose **Start a workout**, and allow camera access. The pose service listens on port 8000 and uses the included model. Guest workouts work without Firebase or MongoDB. For sign-in and saved history, copy the relevant settings from `.env.example` into `frontend/.env` and `backend/.env`, enable your Firebase providers, then run `npm ci` and `npm start` in `backend/`.

For hosting, serve the frontend over HTTPS, set `VITE_AI_ENGINE_WS_URL` to a secure WebSocket endpoint, and set `AI_CORS_ORIGINS` on the pose process to the exact frontend origin. Camera frames go to the pose service; workout history stores session statistics.

## Resume here

See the [handoff](docs/handoff.md) for the pastel design references, what to test next, and the future **Workout Tracker** section. The UI on this branch is an initial draft.

Run `python -m pytest -q` from `ai-engine` and `npm run build` from `frontend`. The experimental classifier is disabled for workouts. Its old score at `/api/evaluation` is labeled as a synthetic training-set result.
