# NatureQuest — manual QA and completed demo submission checklist

## Recorded demo

- Video link provided on October 11, 2026: https://youtu.be/JD7JUCscFDk
- YouTube playback and the video's exact contents have not been independently verified here.
- The user previously supplied a journal screenshot showing a saved night-sky photograph with a Gemma-labeled observation and a completed Urban Observation entry.
- The actual **DEV contest post still must be published**. A YouTube upload by itself is not an entry.

## Before filming (reference for any retakes)

1. Follow README.md to install requirements and start Ollama.
2. Run the model download command: ollama pull gemma3:4b (about 3.4 GB).
3. Start the FastAPI server on 127.0.0.1:8000.
4. Run: python -m pytest -q
5. Open the app. Confirm the top-right pill reads “Gemma ready · local”.
6. Check the browser console for red errors and inspect the layout on a narrow viewport.
7. Use a real outdoor photograph that you took yourself. If it includes a person, get permission or choose a different photo.

## Manual acceptance checks

- [ ] Refreshing / loads the original design and all SVG/CSS assets.
- [ ] No .github/workflows folder; no GitHub Actions run.
- [ ] /api/status reflects Gemma installed and running.
- [ ] Park + curious + 20 minutes produces a three-step card.
- [ ] Completing all 3 steps enables “Log adventure”, which adds an entry to the journal.
- [ ] JPEG/PNG/WebP upload shows a preview; text files and >8 MB files are rejected.
- [ ] “Ask local AI” produces a grounded observation and explicit uncertainty.
- [ ] “Save to journal” retains a picture and any personal notes on page refresh.
- [ ] Delete entry works after confirmation.
- [ ] Export downloads a JSON file containing journal entries.
- [ ] Stop Ollama, refresh, confirm “Offline field mode” and curated missions.
- [ ] With the PWA shell cached, switch off the network in browser developer tools; curated missions and journal still function.
- [ ] Confirm server is bound to loopback; do not expose without authentication and rate limits.

## Original recording plan (reference if a retake is needed)

0–10s: Show hero screen and sentence: “What if the best AI app was the one that asked you to close it?”

10–30s: Choose a park, calm mood, and 20-minute mission. Show three Gemma-generated activities.

30–50s: Insert a genuine photograph/video clip of an outdoor observation. Mention you stepped away from the screen.

50–80s: Upload your real photo. Run local Gemma vision; point out visible details, the next observation, and the uncertainty note.

80–95s: Save the photo and notes to the journal. Refresh the page to demonstrate persistence and export JSON.

95–110s: Stop Ollama, show a curated offline mission; explain that your photos are not shipped to a hosted AI provider.

Final frame: GitHub URL and “Hacktoberfest 2026 — Touch Grass”.

## Contest reminders

- Publish on DEV through the official Week 1 challenge template: https://dev.to/challenges/hacktoberfest-week1-2026-10-05
- [x] A YouTube demo URL has been supplied and added to SUBMISSION_DRAFT.md: https://youtu.be/JD7JUCscFDk
- [ ] Open the video in an incognito window and confirm playback works without signing in.
- [x] A DEV article URL has been supplied: https://dev.to/sameerakhtari/naturequest-ai-less-screen-more-sky-a-local-gemma-powered-outdoor-companion-26dj
- [ ] Open the published DEV article while signed out; confirm it is publicly readable.
- [ ] Verify the required tags `devchallenge` and `hf26challenge` appear on the live article.
- [ ] Verify the YouTube embed plays on the live article, including while signed out.
- [ ] Verify the GitHub repo link works, the **Best Use of Gemma** category is named, and the actual article contains the required challenge headings.
- [ ] Retain the published URL and a screenshot as your submission record.
- [ ] Confirm eligibility and employer policy; the official general rules restrict some sponsor-affiliated people and employers may have policies governing competition entries.
- Eligible partner category: Best Use of Gemma (once the live model has been tested).
- Deadline: October 11, 2026, 11:59 PM PDT, equal to October 12, 2026, 11:59 AM PKT.
- Contest eligibility and any employment restrictions should be checked directly against the general rules.
- Do not claim offline AI vision if Ollama is inaccessible; only the shell, curated missions, and local journal operate without the inference service.
