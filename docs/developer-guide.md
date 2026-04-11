# Developer Guide

## Recommended local startup order

1. Start local dependencies:
   - `npm run services`
2. Start `Kiroku.API`
3. Start the frontend Vite app

In development, `Kiroku.API` will also try to auto-start `Kiroku.Chat` if the chat health endpoint is not already up.

## One-time chat setup

From `backend/Kiroku.Chat`:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Current startup helpers

### `scripts/start-dev-services.ps1`

Responsibilities:

- start Ollama if needed
- verify or pull `llama3.1:8b`
- start Redis locally or via Docker fallback

### API console logging

`Kiroku.API` now logs:

- development startup entry
- chat health checks
- chat auto-start attempts
- chat process id
- repeated wait attempts
- healthy or failed final state

These logs are intended to make chat startup issues obvious in the backend console.

## Documentation maintenance rules

- Update `docs/pages.md` when routes or shared page responsibilities change.
- Update `docs/services.md` when ports, health endpoints, service boundaries, or startup behavior change.
- Update `docs/developer-guide.md` when local setup or automation changes.
- When recommendation logic changes, update both the recommendation endpoint notes in `services.md` and the profile behavior notes in `pages.md`.
