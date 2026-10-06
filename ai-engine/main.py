import os
import json
import base64
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.api.websocket import WorkoutSessionManager
from app.models.exercise_classifier import ExerciseClassifier

app = FastAPI(
    title="Reform - Vision & Kinematics Engine",
    description="Real-time human pose estimation, rep counting, and form coaching service using MediaPipe & OpenCV.",
    version="1.0.0"
)

# CORS Configuration
origins = os.getenv("AI_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    metrics_path = os.path.join(os.path.dirname(__file__), "datasets", "evaluation_metrics.json")
    has_metrics = os.path.exists(metrics_path)
    
    return {
        "status": "online",
        "service": "reform-ai-engine",
        "frameworks": {
            "mediapipe": "Pose 33 Landmarks",
            "opencv": "4.x",
            "classifier": "Scikit-Learn Random Forest",
        },
        "modelTrained": has_metrics,
    }

@app.get("/api/evaluation")
def get_evaluation_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "datasets", "evaluation_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {
        "message": "Evaluation metrics not yet computed. Run train_model.py to generate."
    }

@app.websocket("/ws/workout")
async def workout_websocket_endpoint(
    websocket: WebSocket,
    exercise: str = Query("squat"),
    auto_detect: bool = Query(False)
):
    await websocket.accept()
    session = WorkoutSessionManager()
    session.set_exercise(exercise, auto_detect=auto_detect)
    print(f"[WebSocket] Client connected for exercise: {exercise} (auto_detect={auto_detect})")

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"]:
                result = session.process_image_frame(message["bytes"])
                await websocket.send_text(json.dumps(result))

            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type", "frame")

                if msg_type == "frame":
                    frame_base64 = data.get("frame", "")
                    if "," in frame_base64:
                        frame_base64 = frame_base64.split(",")[1]
                    img_bytes = base64.b64decode(frame_base64)
                    result = session.process_image_frame(img_bytes)
                    await websocket.send_text(json.dumps(result))

                elif msg_type == "set_exercise":
                    new_ex = data.get("exercise", "squat")
                    auto = data.get("auto_detect", False)
                    session.set_exercise(new_ex, auto_detect=auto)
                    await websocket.send_text(json.dumps({
                        "type": "exercise_changed",
                        "exercise": new_ex,
                        "auto_detect": auto
                    }))

                elif msg_type == "reset":
                    session.reset_session()
                    await websocket.send_text(json.dumps({
                        "type": "reset_confirmed"
                    }))

    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected.")
    except Exception as e:
        print(f"[WebSocket Notice] {e}")
    finally:
        session.close()

if __name__ == "__main__":
    host = os.getenv("AI_HOST", "0.0.0.0")
    port = int(os.getenv("AI_PORT", 8000))
    print(f"Starting Reform Vision Engine on {host}:{port}...")
    uvicorn.run("main:app", host=host, port=port, reload=False)
