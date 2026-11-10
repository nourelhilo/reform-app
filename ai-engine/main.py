import base64
import binascii
import json
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.api.websocket import MAX_FRAME_BYTES, WorkoutSessionManager
from app.exercises.tracking import RULES
from app.pose.detector import MODEL_PATH

app = FastAPI(title="Reform pose tracking", version="1.1.0")
origins = {url.strip() for url in os.getenv(
    "AI_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if url.strip()}
for key in ("VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
    if hostname := os.getenv(key):
        origins.add(f"https://{hostname}")


@app.get("/health")
def health():
    return {"status": "online", "service": "reform-ai-engine",
            "poseModelAvailable": MODEL_PATH.is_file(), "exerciseSelection": "manual"}


@app.get("/api/evaluation")
def get_evaluation_metrics():
    path = Path(__file__).parent / "datasets" / "evaluation_metrics.json"
    return {
        "scope": "Experimental classifier scored on the same synthetic poses used for training",
        "usedInWorkouts": False,
        "realWorldValidated": False,
        "trainingMetrics": json.loads(path.read_text()) if path.is_file() else None,
    }


@app.websocket("/ws/workout")
async def workout_websocket_endpoint(websocket: WebSocket, exercise: str = Query("squat")):
    origin = websocket.headers.get("origin")
    if (origin and origin not in origins) or exercise not in RULES:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    session = None
    try:
        session = await run_in_threadpool(WorkoutSessionManager, exercise)
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            if message.get("bytes") is not None:
                result = await run_in_threadpool(session.process_image_frame, message["bytes"])
                await websocket.send_json(result)
                continue
            try:
                data = json.loads(message.get("text") or "")
                if not isinstance(data, dict):
                    raise ValueError
                kind = data.get("type", "frame")
                if kind == "frame":
                    frame = data.get("frame", "")
                    if not isinstance(frame, str) or len(frame) > MAX_FRAME_BYTES * 4 // 3 + 64:
                        raise ValueError
                    raw = base64.b64decode(frame.split(",")[-1], validate=True)
                    await websocket.send_json(await run_in_threadpool(session.process_image_frame, raw))
                elif kind == "pause":
                    session.pause()
                elif kind == "reset":
                    session.reset_session()
                    await websocket.send_json({"type": "reset_confirmed"})
                elif kind == "set_exercise" and isinstance(data.get("exercise"), str) and session.set_exercise(data["exercise"]):
                    await websocket.send_json({"type": "exercise_changed", "exercise": session.exercise})
                else:
                    raise ValueError
            except (ValueError, binascii.Error):
                await websocket.send_json(session.unavailable("error", "Could not read that camera message."))
    except WebSocketDisconnect:
        pass
    finally:
        if session:
            await run_in_threadpool(session.close)


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("AI_HOST", "127.0.0.1"),
                port=int(os.getenv("AI_PORT", "8000")), ws_max_size=768 * 1024)
