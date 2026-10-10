# 🌿 NatureQuest AI
### Less screen. More sky.

NatureQuest is an offline-first outdoor exploration companion built for **Hacktoberfest 2026 — Week 1: Touch Grass**.

Plan a three-step outdoor micro-adventure, put your phone down, notice something wonderful, and return with a photograph. Google's open-weight Gemma 3 vision model runs through **your own Ollama server** and helps describe the details. A private field journal stores discoveries in your own browser.

[Official challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) · [Gemma 3 model](https://ollama.com/library/gemma3) · [Ollama](https://ollama.com/)

## Features

- **Adventure planner:** Choose park, backyard, city, trail or coast; then a mood and duration. Locally running Gemma creates three outdoor prompts. When the model is unavailable, the app visibly uses a curated offline mission instead.
- **Nature observation:** Upload or photograph a JPEG, PNG, or WebP image under 8 MB. The local server strips metadata, resizes it, and passes it to Gemma 3 vision for a description and uncertainty note.
- **Private field journal:** Save completed adventures or photo discoveries in IndexedDB. Add personal notes, delete entries, or export your journal as JSON. Browser storage is local to your device.
- **Installable, offline-capable PWA:** After an initial load, the app shell, curated missions, and saved journal remain available without internet. AI analysis still requires a reachable local Ollama server.
- **No hosted AI, telemetry, GPS, accounts, or GitHub Actions.**

## Quick start — macOS Apple Silicon (recommended)

Prerequisites: Python 3.10+ and Ollama 0.6+.

1. Install Ollama from https://ollama.com/download/mac. Open the app. Alternatively, use Homebrew to install it and start its server with: brew install ollama; ollama serve
2. Pull the vision-enabled model (approximately 3.4 GB): ollama pull gemma3:4b
3. Clone this new repository: git clone https://github.com/sameerakhtari/naturequest-ai.git
4. Enter its directory: cd naturequest-ai
5. Create your environment: python3 -m venv .venv
6. Activate it: source .venv/bin/activate
7. Install requirements: pip install -r requirements.txt
8. Start the app: python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
9. Visit **http://127.0.0.1:8000**. The AI status should read “Gemma ready · local”.

To use a different port, change the uvicorn --port value. Native Ollama is recommended on an M1 Mac for Apple Silicon acceleration.

## Docker Compose alternative

Docker setup uses CPU inference unless you configure hardware passthrough.

1. Start services: docker compose up -d --build
2. Download the model: docker compose exec ollama ollama pull gemma3:4b
3. Visit **http://127.0.0.1:8000**
4. Stop containers: docker compose down

Ollama's model download remains in the named volume across restarts.

## Run tests locally

Install the test tools: pip install -r requirements-dev.txt

Run: python -m pytest -q

The API tests use a mocked model. No Ollama download, GitHub Actions, or remote API is needed to execute the tests.

## Privacy architecture

**Browser:** Plain HTML, CSS, and JavaScript. Local observations and compressed photos live in IndexedDB. The service worker caches only static app assets, not API responses or photographs.

**FastAPI:** Validates uploaded files, checks pixel and byte limits, normalizes images and removes EXIF metadata in memory. It does not persist uploads to disk.

**Ollama:** The backend uses local Ollama's /api/chat endpoint with the vision-enabled gemma3:4b model. Its default endpoint is http://127.0.0.1:11434 (or the internal service named ollama in Docker). There is no hosted inference fallback. If you point OLLAMA_URL somewhere else, your configured server receives the photos.

**Important limitations:** Model descriptions can be mistaken. Do not rely on the tool to decide if a plant, mushroom, animal, or object is edible, poisonous, medically safe, or safe to handle. AI-generated missions should be reviewed with common sense. Journal entries will be lost if you clear browser site data; export them regularly. There is no authentication or rate limit, so **do not publish the backend to the public internet**. A screen recording is the recommended competition demo.

Gemma model files are not included and are independently governed by Google's Gemma Terms of Use. The NatureQuest code is MIT licensed.

## Project layout

    server/main.py       FastAPI endpoints and file validation
    server/brain.py      Local Ollama integration and offline missions
    web/index.html       Accessible interface
    web/styles.css       Responsive design
    web/app.js           Adventures, photo upload, IndexedDB
    web/hero.svg         Original outdoor illustration
    web/sw.js            Offline app-shell cache
    tests/test_api.py    Local mocked API tests
    compose.yaml        Container deployment
    SUBMISSION_DRAFT.md  DEV article draft
    DEMO_CHECKLIST.md    Manual validation and recording guide

## Contest submission

The [Hacktoberfest 2026 Week 1 rules](https://dev.to/page/hacktoberfest-week1-2026-10-05-contest-rules/) require a project built during October 5–11, an actual demo (deployed link or video), a repository link, an explanation of open innovation, and a DEV post using the required template and tags. The submission deadline is October 11, 2026, at 11:59 PM PDT.

Review DEMO_CHECKLIST.md, record a genuine demonstration with your local model, and customize SUBMISSION_DRAFT.md based on what you actually tested.

Built by **Sameer Akhtari** for Hacktoberfest 2026, with AI-assisted implementation.
