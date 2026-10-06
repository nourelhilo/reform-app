<div align="center">

# Reform

**Real-time workout form tracking powered by computer vision.**

[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-BlazePose-FF6F00?logo=google&logoColor=white)](https://mediapipe.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/atlas)

Reform analyzes your body mechanics through your webcam in real time — no wearables, no equipment. It extracts 33 pose landmarks per frame, computes precise joint angles, runs deterministic state machines to count reps, detects form errors, and delivers live audio coaching cues mid-set.

</div>

---

## How it works

```
Webcam → MediaPipe BlazePose → 33 Landmark Coordinates
       → Joint Angle Calculation (2D/3D kinematics)
       → Exercise State Machine (rep counting + phase detection)
       → Form Scoring Engine (real-time deduction model)
       → Audio Coaching (Web Speech API, smart cooldowns)
       → MongoDB (session persistence + analytics)
```

Every rep is validated by a minimum range-of-motion threshold — partial reps are caught and flagged, not silently counted.

---

## Feature Overview

| Feature | Detail |
|---------|--------|
| **Pose Estimation** | MediaPipe BlazePose — 33 landmarks, <20ms inference |
| **Exercise Support** | Squat, Push-Up, Bicep Curl, Lunge, Jumping Jack |
| **Rep Counting** | Deterministic state machines — not heuristic guessing |
| **Form Scoring** | Per-rep score from 0–100 based on joint angle violations |
| **Detected Issues** | Knee cave, torso lean, asymmetric weight distribution, partial ROM |
| **Audio Coaching** | Live spoken feedback with smart cooldown (no spam) |
| **Session Saving** | Full workout saved to MongoDB — reps, scores, duration, per-exercise breakdown |
| **Analytics** | Form score trends, weekly volume, per-exercise improvement tracking |
| **Auth** | Firebase Authentication — Email/Password + Google OAuth |

---

## Tech Stack

### Frontend
- **React 18** + Vite
- **TailwindCSS** — custom dark design system
- **Recharts** — form score trend charts
- **Firebase Auth SDK** — client-side authentication
- **Web Speech API** — browser-native audio coaching

### Backend
- **Node.js** + Express
- **MongoDB Atlas** + Mongoose
- **Firebase Admin SDK** — server-side token verification
- **JWT** via Firebase ID tokens — stateless auth

### AI Engine
- **Python 3.11** + FastAPI + WebSockets
- **MediaPipe BlazePose** — pose landmark extraction
- **OpenCV** — frame decoding
- **Custom kinematic analyzers** — per-exercise angle computation and state machines

---

## Project Structure

```
reform-app/
├── frontend/               # React + Vite web app
│   ├── src/
│   │   ├── pages/          # Landing, Dashboard, Workout, History, Analytics, Profile
│   │   ├── components/     # CameraView, SkeletonOverlay, RepCounter, FormScore, CoachFeedback
│   │   ├── hooks/          # useAuth, useWorkoutSocket
│   │   └── services/       # api.js (REST client), firebase.js
│   └── ...
├── backend/                # Node.js REST API
│   └── src/
│       ├── controllers/    # analyticsController, workoutController, userController
│       ├── models/         # User, Workout (Mongoose schemas)
│       ├── routes/         # /api/users, /api/workouts, /api/analytics, /api/health
│       ├── middleware/      # Firebase auth verification, error handler
│       └── config/         # MongoDB connection, Firebase Admin init
└── ai-engine/              # Python WebSocket server
    └── app/
        ├── pose/           # MediaPipe detector, landmark definitions
        ├── exercises/      # squat.py, pushup.py, curl.py, lunge.py, jumping_jack.py
        ├── analysis/       # Joint angle math (2D/3D), velocity, smoothing
        └── coaching/       # FeedbackManager, speech cue generation
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier works)
- Firebase project with Auth enabled

### 1. Clone

```bash
git clone https://github.com/nourelhilo/reform-app.git
cd reform-app
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/
DATABASE_NAME=reform

FIREBASE_PROJECT_ID=your-firebase-project-id
# Optional: path to service account JSON for full Admin SDK
# FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

```bash
node src/server.js
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_ENGINE_WS_URL=ws://localhost:8000/ws/workout

VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

```bash
npm run dev
```

### 4. AI Engine

```bash
cd ai-engine
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python main.py
```

### 5. Open the app

```
http://localhost:5173
```

> The app runs without the AI engine — the workout page will show DISCONNECTED but all other features (auth, dashboard, history, analytics) work fully.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | — | Service health check |
| `POST` | `/api/users/sync` | ✅ | Sync Firebase user to MongoDB |
| `GET` | `/api/users/profile` | ✅ | Get user profile + preferences |
| `PUT` | `/api/users/profile` | ✅ | Update preferences |
| `POST` | `/api/workouts` | ✅ | Save a completed workout |
| `GET` | `/api/workouts` | ✅ | Paginated workout history |
| `GET` | `/api/workouts/:id` | ✅ | Single workout detail |
| `DELETE` | `/api/workouts/:id` | ✅ | Delete a workout |
| `GET` | `/api/analytics/dashboard` | ✅ | Weekly summary + form trend |
| `GET` | `/api/analytics/progress` | ✅ | Per-exercise breakdown |

All protected endpoints require a Firebase ID token via `Authorization: Bearer <token>`.

---

## Exercise State Machines

Each exercise is a deterministic finite state machine:

```
Squat:    STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING (+1 rep)
Push-Up:  TOP → DESCENDING → BOTTOM → ASCENDING → TOP (+1 rep)
Curl:     EXTENDED → CURLING → PEAK → LOWERING → EXTENDED (+1 rep)
Lunge:    STANDING → STEPPING → DEEP → RETURNING → STANDING (+1 rep)
Jack:     CLOSED → OPENING → OPEN → CLOSING → CLOSED (+1 rep)
```

A rep is only counted when:
1. The full range of motion threshold is reached (e.g. knee angle ≤ 120° for squats)
2. Minimum duration is met (prevents micro-bounce cheat reps)
3. The return to start position is confirmed

---

## Form Scoring

Each rep receives a score (0–100):

- Starts at 100
- Deductions applied per violation detected during the rep:
  - Excessive torso lean → −20
  - Asymmetric weight distribution → −15
  - Knee cave (valgus) → −25
  - Partial range of motion → −15
- Score is floored at 40 (a completed rep always gets credit)
- Session form score = rolling average across all completed reps

---

## Running Tests

```bash
# AI Engine tests
cd ai-engine
.venv\Scripts\activate
pytest tests/ -v
```

```
9 passed in 0.17s
```

---

## Deployment

### Frontend → Vercel / Netlify
1. Set all `VITE_*` env vars in the platform dashboard
2. Update `VITE_API_URL` to your production backend URL
3. Add your production domain to Firebase Authorized Domains

### Backend → Railway / Render / Fly.io
1. Set `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `NODE_ENV=production`, `CLIENT_URL=<frontend-url>`
2. Start command: `node src/server.js`

### MongoDB Atlas
- Add your production server IP to Atlas → Network Access

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
  Built with MediaPipe, React, Node.js, Python, MongoDB, and Firebase
</div>
