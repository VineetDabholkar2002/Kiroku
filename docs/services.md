# Services and Integration

## Active services

### Kiroku.API

- Location: `backend/Kiroku.API`
- Stack: ASP.NET Core / .NET 9
- Role: primary application API for anime data, user list management, recommendations, playlist generation, Spotify flows, and general backend integration.

### Kiroku.Chat

- Location: `backend/Kiroku.Chat`
- Stack: FastAPI + Uvicorn + Ollama Python client
- Role: anime-only streaming chatbot used by `ChatPage`.
- Main endpoints:
  - `POST /chat`
  - `GET /health`

### Redis

- Used by `Kiroku.API` for caching.
- Default expected port: `6379`
- The local startup script prefers native `redis-server`, then falls back to a Docker container named `kiroku-redis`.

### Ollama

- Used by `Kiroku.Chat` for local LLM inference.
- Current model expected by the chat service: `llama3.1:8b`

## Frontend proxying

`frontend/vite.config.js` currently proxies:

- `/api` -> `https://127.0.0.1:7171`
- `/chat-api` -> `http://127.0.0.1:8000`

The chat page posts to `/chat-api/chat` in development.

## Backend auto-start behavior

`backend/Kiroku.API/Program.cs` contains a development-only auto-start path for `Kiroku.Chat`.

Behavior:

1. Check chat health at `http://127.0.0.1:8000/health`
2. If healthy, do nothing
3. If not healthy, start `uvicorn app:app --host 127.0.0.1 --port 8000`
4. Prefer `backend/Kiroku.Chat/.venv/Scripts/python.exe`
5. Fall back to `python` if the virtual environment does not exist

Config lives in `backend/Kiroku.API/appsettings.Development.json` under `ChatService`.

## Chat request flow

1. User submits a message from `ChatPage.jsx`
2. Frontend sends `message` and `history` to `POST /chat`
3. FastAPI builds a message array with the system prompt
4. `ollama.chat(..., stream=True)` yields chunks
5. FastAPI emits SSE packets
6. Frontend appends streamed chunks into the assistant bubble

## User recommendation flow

`Kiroku.API` exposes `GET /api/v1/user/by-username/{username}/recommendations`.

The current recommendation engine is collaborative filtering on the app database:

1. Load the target user's anime list and every other user who has anime list data
2. Convert watch status and user score into weighted preferences
3. Compute user similarity from shared-anime cosine similarity plus overlap ratio
4. Keep the strongest matching users
5. Score unseen anime from those users and boost strong MAL entries
6. Return similar users, overlap metadata, list previews, and anime recommendations

This stays local to the main API and does not require a separate ML serving stack.

## Known operational assumptions

- `Kiroku.Chat` requires its Python packages installed in `.venv`.
- Ollama must be installed locally.
- The `llama3.1:8b` model must exist locally.
- Redis must be reachable either as a native server or a Docker container.
- Recommendation quality depends on multiple users having overlapping anime lists.
