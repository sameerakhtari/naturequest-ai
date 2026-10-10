---
title: "NatureQuest: I Built an AI That Wants Me to Close My Laptop"
published: false
tags: devchallenge, hf26challenge, opensource, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05).*

## What I Built

NatureQuest is a field guide with a strange success metric: **how quickly can it get me away from the screen?**

Instead of another feed, there's one question: where would you like to wander? Pick a nearby park, a city street, your backyard, a trail, or the coast. Pick a mood and twenty minutes. NatureQuest hands you three tiny things to notice, then effectively says: **go outside, I'll be here when you return**.

When you come back, you can photograph a leaf, a flower, an unexpected texture, or anything else that caught your eye. A locally running Gemma 3 vision model gives you an observation based on visible details, mentions uncertainty, and suggests one more thing to look for next time. You can save the photograph and your own notes in a private, local field journal.

Three decisions shaped the project:

1. A mission has **three small prompts**, not an infinitely scrolling list.
2. AI helps you *look closer*; it never claims to be a reliable species-identification or food-safety tool.
3. If the model is unavailable, **curated offline missions still work**. The app doesn't pretend an API call succeeded.

This is for anyone who wants technology to prompt a small real-world adventure rather than compete for another hour of attention.

## Demo

**[REPLACE WITH YOUR REAL VIDEO DEMO URL BEFORE PUBLISHING]**

My demo will show choosing a mission, checking off three field prompts, taking an outdoor photo, getting a Gemma description, and saving the result in a field journal. I will also deliberately disconnect the model to show that curated missions still work.

**[AFTER ACTUAL TESTING: add a short honest paragraph explaining where you went, what you noticed, and whether the mission made you put your phone away. Include a real screenshot or photograph if you choose.]**

## Code

GitHub: https://github.com/sameerakhtari/naturequest-ai

The repository includes local run instructions, the Ollama bridge, the PWA frontend, Docker Compose, a privacy-focused photo pipeline, and tests. There is no GitHub Actions workflow.

## How I Built It

The AI core is **Gemma 3 4B**, Google's open-weight multimodal model, served by Ollama. Gemma handles two jobs:

**Mission generation.** FastAPI sends a compact description of the location, mood, and duration to the model in JSON mode and validates the output as exactly three field prompts. If the local inference service isn't available, a curated mission is generated without any model or internet connection.

**Field observations.** The browser sends a user-selected picture to the local Python server. Pillow checks the file and pixel limits, removes orientation metadata, converts it to JPEG, and resizes it in memory. FastAPI submits that picture to the configured Ollama chat endpoint. The prompt asks for observable evidence, a candid uncertainty statement, a gentle next step, and a safety reminder. It explicitly avoids edible/poisonous or handling assurances.

The rest of the application is intentionally small: vanilla JavaScript, accessible HTML, responsive CSS, IndexedDB for photos and journal entries, and a service worker that caches only the app shell. It is designed to run on a laptop with no proprietary AI API key.

I chose an installable web app rather than building a mobile native app. The same UI works across laptops and phones when served by a reachable local host. The AI runtime stays under the operator's control.

## Why Does Open Innovation Matter?

A hosted vision API would have made this easier in some ways, but it would have changed what NatureQuest is.

A photograph can reveal location clues, people, or private details. Here, the default setup keeps inference between my own application server and my own Ollama instance. The journal is stored in my browser, and there are no accounts, analytics, or tracking requests.

Open-weight models make the AI **replaceable and inspectable as a component**. I can change the model, see the prompt, adjust output constraints, and run it on my hardware. Most importantly, I can design the product to *stop asking for attention*. A successful NatureQuest session means putting the device away.

There are tradeoffs: a local multimodal model takes disk space and can be slower, especially without GPU acceleration. Its answers are not guaranteed to be correct. That is why the app uses conservative observation language and graceful offline behavior rather than treating AI as an authority.

## My Agent Session

This project was built with AI-assisted coding. A DevRelay recording is optional for this challenge and is not attached here. **[If you capture a real session, insert the actual link here; otherwise remove this section.]**

## Prize Categories

- **Best Use of Gemma** — The Gemma 3 open-weight model powers both mission generation and image-grounded nature observation, and its local deployability is fundamental to the project's privacy design.

---

NatureQuest isn't trying to turn every walk into data. It's an invitation to notice something, keep a memory if you want, and go back outside.

**Before publishing:** replace the demo placeholder, add real outdoor testing evidence, run and verify the model locally, and use the official challenge submission template/tags. Do not present planned tests as completed.
