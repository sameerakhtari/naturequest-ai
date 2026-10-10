"""No network and no GitHub Actions required: pytest tests/test_api.py."""
import base64
import io

from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from server import brain, main

client = TestClient(main.app)


def photo_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), color=(110, 170, 85)).save(buffer, "JPEG")
    return buffer.getvalue()


def test_home_and_static_assets():
    assert client.get("/").status_code == 200
    assert "Less screen." in client.get("/").text
    assert client.get("/styles.css").status_code == 200
    assert client.get("/manifest.webmanifest").status_code == 200
    assert client.get("/sw.js").status_code == 200
    assert client.get("/server/main.py").status_code == 404
    assert client.get("/.env").status_code == 404


def test_offline_mission_fallback(monkeypatch):
    async def unavailable(_):
        raise HTTPException(503, "Ollama unavailable")
    monkeypatch.setattr(brain, "chat", unavailable)
    response = client.post("/api/mission", json={
        "place": "city", "mood": "creative", "minutes": 20
    })
    assert response.status_code == 200
    assert response.json()["source"] == "curated"
    assert len(response.json()["steps"]) == 3


def test_invalid_mission_data():
    assert client.post("/api/mission", json={
        "place": "moon", "mood": "calm", "minutes": 20
    }).status_code == 422
    assert client.post("/api/mission", json={
        "place": "park", "mood": "calm", "minutes": 0
    }).status_code == 422


def test_ai_generated_mission(monkeypatch):
    async def fake(messages):
        assert "outdoor micro-adventure" in messages[0]["content"]
        return {
            "title": "Follow the leaves",
            "subtitle": "Notice the little things.",
            "steps": ["Compare leaf edges under two trees.",
                      "Listen to the trees for one minute.",
                      "Observe a shadow changing shape."],
            "closing": "Now put your phone away."
        }
    monkeypatch.setattr(brain, "chat", fake)
    response = client.post("/api/mission", json={"place":"park","mood":"calm","minutes":20})
    assert response.status_code == 200
    assert response.json()["source"] == "gemma3"


def test_image_rejections():
    invalid = client.post("/api/observe", files={
        "photo":("bad.txt", b"hello", "text/plain")
    })
    assert invalid.status_code == 415
    invalid_image = client.post("/api/observe", files={
        "photo":("fake.jpg", b"not an image", "image/jpeg")
    })
    assert invalid_image.status_code == 400
    too_big = client.post("/api/observe", files={
        "photo":("large.jpg", b"x"*(8*1024*1024+1), "image/jpeg")
    })
    assert too_big.status_code == 413


def test_observe_passes_photo_only_to_local_model(monkeypatch):
    captured = []
    async def fake(messages):
        captured.extend(messages)
        return {
            "title": "Soft green shapes", "observation": "I can see green leaves.",
            "look_for": "Compare their edges next time.",
            "uncertainty": "The photo is insufficient for a species identification.",
            "safety": "Watch from a distance without disturbing anything."
        }
    monkeypatch.setattr(brain, "chat", fake)
    response = client.post("/api/observe", files={
        "photo": ("leaf.jpg", photo_bytes(), "image/jpeg")
    })
    assert response.status_code == 200
    assert response.json()["model"] == brain.MODEL
    assert len(captured) == 1
    data = base64.b64decode(captured[0]["images"][0])
    assert Image.open(io.BytesIO(data)).format == "JPEG"


def test_status_offline(monkeypatch):
    async def fake():
        return {"online":False, "ready":False, "model":brain.MODEL}
    monkeypatch.setattr(brain, "ready", fake)
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json()["ready"] is False
