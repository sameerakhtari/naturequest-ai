"""Local Ollama inference and safety-oriented prompt helpers."""
import json
import logging
import os

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
log = logging.getLogger("naturequest")


class MissionOptions(BaseModel):
    place: str = Field(default="park", pattern="^(park|backyard|city|trail|coast)$")
    mood: str = Field(default="curious", pattern="^(curious|calm|active|creative)$")
    minutes: int = Field(default=20, ge=10, le=90)


def curated(options: MissionOptions) -> dict:
    settings = {
        "park": ("A pocket safari", "A nearby park becomes a tiny wilderness."),
        "backyard": ("Your miniature wild", "Discover life just outside your door."),
        "city": ("Nature between buildings", "Find life making room in the city."),
        "trail": ("The slow trail", "Explore a familiar path with unfamiliar eyes."),
        "coast": ("At the water's edge", "Watch land, water, and wildlife meet."),
    }
    steps = {
        "curious": [
            "Find three different leaf shapes and compare them.",
            "Watch a small living thing from a respectful distance for a minute.",
            "Photograph one detail you would usually pass by.",
        ],
        "calm": [
            "Listen quietly for a minute and count layers of sound.",
            "Find three different natural textures without disturbing them.",
            "Notice how wind or light changes in one spot.",
        ],
        "active": [
            "Walk briskly for five minutes, then slow down and look closer.",
            "Notice three different places where plants are growing.",
            "Return by a new route and spot one landscape change.",
        ],
        "creative": [
            "Find a repeating pattern in the natural world.",
            "Photograph an unexpected close-up composition.",
            "Give the scene a three-word title without picking anything.",
        ],
    }
    title, subtitle = settings[options.place]
    return {
        "title": title, "subtitle": subtitle, "steps": steps[options.mood],
        "minutes": options.minutes, "source": "curated",
        "closing": "Put your phone away. The best part happens out there.",
    }


async def ready() -> dict:
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            response = await client.get(URL + "/api/tags")
            response.raise_for_status()
            names = [
                m.get("name") for m in response.json().get("models", [])
                if isinstance(m, dict)
            ]
        return {"online": True, "ready": MODEL in names, "model": MODEL}
    except (httpx.HTTPError, TypeError, ValueError):
        return {"online": False, "ready": False, "model": MODEL}


async def chat(messages: list[dict]) -> dict:
    # The project has NO remote/cloud inference fallback.
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(100.0, connect=3.0)
        ) as client:
            response = await client.post(
                URL + "/api/chat",
                json={
                    "model": MODEL,
                    "messages": messages,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.3, "num_predict": 440},
                },
            )
            response.raise_for_status()
            raw = response.json()["message"]["content"].strip()
        fence = chr(96) * 3
        if raw.startswith(fence):
            raw = raw.removeprefix(fence + "json").removeprefix(fence)
            raw = raw.removesuffix(fence).strip()
        output = json.loads(raw)
        if not isinstance(output, dict):
            raise ValueError("Expected a JSON object")
        return output
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        log.warning("Ollama request failed: %s", type(exc).__name__)
        raise HTTPException(
            503, "Local Gemma unavailable or returned invalid JSON. Check Ollama and retry."
        ) from exc


def verify_text(response: dict, keys: tuple[str, ...], limit: int = 600) -> bool:
    return all(
        isinstance(response.get(key), str)
        and 3 <= len(response[key].strip()) <= limit
        for key in keys
    )
