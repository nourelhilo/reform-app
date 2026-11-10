"""Exercise the wire protocol without needing a physical webcam."""
import os
from pathlib import Path

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api import websocket as session_module
from main import app


LOCAL_ORIGIN = {"origin": "http://localhost:5173"}


class EmptyDetector:
    def process_frame(self, frame):
        return None, 0.0

    def close(self):
        pass


def test_health_and_classifier_scope():
    client = TestClient(app)
    assert client.get("/health").json()["poseModelAvailable"] is True
    metrics = client.get("/api/evaluation").json()
    assert metrics["usedInWorkouts"] is False
    assert metrics["realWorldValidated"] is False


def test_socket_rejects_unknown_origin_or_exercise():
    client = TestClient(app)
    for url, headers in (
        ("/ws/workout", {"origin": "https://example.invalid"}),
        ("/ws/workout?exercise=unknown", LOCAL_ORIGIN),
    ):
        with pytest.raises(WebSocketDisconnect) as denied:
            with client.websocket_connect(url, headers=headers):
                pytest.fail("unexpected workout connection")
        assert denied.value.code == 1008


def test_bad_frames_do_not_crash_or_advance_session(monkeypatch):
    monkeypatch.setattr(session_module, "PoseDetector", EmptyDetector)
    client = TestClient(app)
    valid_jpeg = cv2.imencode(".jpg", np.zeros((48, 64, 3), np.uint8))[1].tobytes()

    with client.websocket_connect("/ws/workout?exercise=curl", headers=LOCAL_ORIGIN) as socket:
        socket.send_text("invalid json")
        assert socket.receive_json()["visibility"]["status"] == "error"
        socket.send_bytes(b"not an image")
        result = socket.receive_json()
        assert result["rep"] == 0 and result["formScore"] is None
        assert not result["visibility"]["is_valid"]
        socket.send_bytes(valid_jpeg)
        assert socket.receive_json()["visibility"]["status"] == "no_person"
        socket.send_json({"type": "pause"})
        socket.send_json({"type": "reset"})
        assert socket.receive_json()["type"] == "reset_confirmed"


def test_real_person_through_mediapipe_socket():
    sample = os.getenv("REFORM_TEST_IMAGE")
    if not sample:
        pytest.skip("Set REFORM_TEST_IMAGE to the MediaPipe pose.jpg test image")
    client = TestClient(app)
    with client.websocket_connect("/ws/workout?exercise=lunge", headers=LOCAL_ORIGIN) as socket:
        socket.send_bytes(Path(sample).read_bytes())
        result = socket.receive_json()
        assert len(result["landmarks"]) == 33
        assert result["rep"] == 0
