"""NatureQuest local HTTP API. Photos only transit to your configured Ollama."""
import base64
import io
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError

try:
    from . import brain
except ImportError:
    import brain

app = FastAPI(title="NatureQuest AI", version="1.0.0", docs_url=None, redoc_url=None)
WEB = Path(__file__).resolve().parent.parent / "web"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_000_000


@app.get("/api/status")
async def status():
    return await brain.ready()


@app.post("/api/mission")
async def mission(options: brain.MissionOptions):
    prompt = (
        "Create an outdoor micro-adventure that encourages a person to close their phone. "
        "Keep tasks accessible, observational, realistic, and safe. Never recommend touching, "
        "picking, tasting, or handling unknown plants, insects, or animals. No GPS required. "
        "Return ONLY JSON with strings title, subtitle, closing, and an array steps containing "
        "exactly three brief, different actions. Context: place=" + options.place +
        ", mood=" + options.mood + ", duration=" + str(options.minutes) + " minutes."
    )
    try:
        result = await brain.chat([{"role": "user", "content": prompt}])
        steps = result.get("steps")
        if (not brain.verify_text(result, ("title", "subtitle", "closing"), 180)
                or not isinstance(steps, list) or len(steps) != 3
                or not all(isinstance(s, str) and 8 <= len(s) <= 220 for s in steps)):
            raise ValueError("Invalid model mission format")
        return {
            "title": result["title"], "subtitle": result["subtitle"],
            "steps": steps, "closing": result["closing"],
            "minutes": options.minutes, "source": "gemma3",
        }
    except (HTTPException, ValueError):
        return brain.curated(options)


@app.post("/api/observe")
async def observe(photo: UploadFile = File(...)):
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Only JPEG, PNG, and WebP images are supported.")
    payload = await photo.read(MAX_UPLOAD_BYTES + 1)
    if not payload:
        raise HTTPException(400, "Your photo is empty.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Your photo must be 8 MB or smaller.")
    try:
        with Image.open(io.BytesIO(payload)) as original:
            if original.width * original.height > MAX_IMAGE_PIXELS:
                raise HTTPException(413, "Image resolution exceeds the safety limit.")
            if original.format not in ("JPEG", "PNG", "WEBP"):
                raise HTTPException(415, "Image format does not match supported formats.")
            picture = ImageOps.exif_transpose(original).convert("RGB")
            picture.thumbnail((1024, 1024))
            buffer = io.BytesIO()
            picture.save(buffer, format="JPEG", quality=80, optimize=True)
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "We could not read that image.") from exc
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    prompt = (
        "You are a cautious nature-observation companion, not a species-identification expert. "
        "Describe ONLY visible evidence. You may suggest a broad category but do not assert "
        "a species identity unless obvious, and never guarantee an identification. "
        "If the image has no clear nature subject, say so. Never give medical, edible, "
        "foraging, poisonous/non-poisonous, or handling assurances. "
        "Return ONLY JSON with five strings: title (3-8 words), observation (1-2 grounded "
        "sentences), look_for (one detail to observe outdoors next), uncertainty "
        "(honest limitation), safety (one sentence about observing without disturbing nature)."
    )
    output = await brain.chat([{"role": "user", "content": prompt, "images": [encoded]}])
    fields = ("title", "observation", "look_for", "uncertainty", "safety")
    if not brain.verify_text(output, fields):
        raise HTTPException(502, "The local model returned an incomplete observation. Retry.")
    return {key: output[key] for key in fields} | {"model": brain.MODEL}


@app.get("/")
def index():
    return FileResponse(WEB / "index.html")


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(WEB / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def worker():
    return FileResponse(WEB / "sw.js", media_type="text/javascript", headers={"Service-Worker-Allowed": "/"})


@app.get("/{path:path}")
def assets(path: str):
    # Whitelist keeps the application from serving server code or host files.
    if path in {"app.js", "styles.css", "hero.svg", "icon.svg", "favicon.svg"}:
        return FileResponse(WEB / path)
    raise HTTPException(404, "Not found")
