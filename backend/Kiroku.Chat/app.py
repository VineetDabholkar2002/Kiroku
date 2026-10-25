import os
import json
import logging
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

# Load environment variables (.env in current or parent directories)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kiroku-chat")

app = FastAPI(title="Kiroku Chat Service (Multi-Provider with Cloud Fallback)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are Kiroku, an anime expert assistant.

Behavior:
- Answer questions about anime, manga, characters, studios, voice actors, and openings/endings.
- You ARE allowed to give opinions.
- Do NOT avoid answering — take a stance and explain briefly why.

Conversation Style:
- Medium-length responses (3–8 lines).
- Natural conversational tone.

Response Formatting (IMPORTANT):
- Structure answers clearly so they are easy to read.
- Use line breaks between ideas.
- When listing recommendations, format like:

Anime Name: reason

Anime Name: reason

- Do NOT output everything in one block of text.

Tone:
- Friendly, confident, not cringey.

If question is NOT anime-related:
- Lightly redirect to anime.

Avoid:
- One-line answers.
- Huge paragraphs.
- Saying "I can't say".

Example:

User: "Anime like Naruto?"

You:
"Here are some good picks:

Black Clover: similar underdog + magic fights  
Jujutsu Kaisen: modern animation, strong combat  
Bleach: classic shounen with great arcs  

If you want something more strategic, try Hunter x Hunter.

Are you more into fights or story?"""


# Configuration
CHAT_PROVIDER = os.getenv("CHAT_PROVIDER", "auto").lower()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "dolphin-mistral")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


# -----------------------------------------------------------------------------
# 1. Google Gemini Streaming Provider
# -----------------------------------------------------------------------------
async def stream_gemini(req: ChatRequest) -> AsyncGenerator[str, None]:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"

    contents = []
    for h in req.history:
        role = "user" if h.get("role") == "user" else "model"
        text = h.get("content") or h.get("text", "")
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": req.message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024
        }
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0)) as client:
        async with client.stream("POST", url, json=payload, headers={"Content-Type": "application/json"}) as resp:
            if resp.status_code != 200:
                err_text = (await resp.aread()).decode(errors="ignore")
                raise RuntimeError(f"Gemini API error ({resp.status_code}): {err_text}")

            async for line in resp.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if not data_str:
                    continue
                try:
                    chunk = json.loads(data_str)
                    candidates = chunk.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for part in parts:
                            txt = part.get("text", "")
                            if txt:
                                yield txt
                except json.JSONDecodeError:
                    continue


# -----------------------------------------------------------------------------
# 2. Groq Cloud Streaming Provider
# -----------------------------------------------------------------------------
async def stream_groq(req: ChatRequest) -> AsyncGenerator[str, None]:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history:
        role = "user" if h.get("role") == "user" else "assistant"
        text = h.get("content") or h.get("text", "")
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": req.message})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.7,
        "max_tokens": 1024
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0)) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                err_text = (await resp.aread()).decode(errors="ignore")
                raise RuntimeError(f"Groq API error ({resp.status_code}): {err_text}")

            async for line in resp.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    choices = chunk.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                except json.JSONDecodeError:
                    continue


# -----------------------------------------------------------------------------
# 3. Local Ollama Streaming Provider
# -----------------------------------------------------------------------------
async def stream_ollama(req: ChatRequest) -> AsyncGenerator[str, None]:
    import ollama

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history:
        messages.append({
            "role": h.get("role", "user"),
            "content": h.get("content") or h.get("text", "")
        })
    messages.append({"role": "user", "content": req.message})

    client = ollama.AsyncClient(host=OLLAMA_HOST, timeout=httpx.Timeout(20.0, connect=3.0))
    response = await client.chat(
        model=OLLAMA_MODEL,
        messages=messages,
        stream=True,
    )
    async for chunk in response:
        text = chunk.get("message", {}).get("content", "")
        if text:
            yield text


# -----------------------------------------------------------------------------
# 4. Fallback Provider (Informative & Graceful)
# -----------------------------------------------------------------------------
async def stream_fallback(req: ChatRequest, last_error: Exception | None = None) -> AsyncGenerator[str, None]:
    import asyncio

    lines = [
        "Hello! I am **Kiroku**, your personal anime assistant.\n\n",
        "I am currently waiting for an AI provider to be configured. You can enable instant cloud AI responses in under 1 minute:\n\n",
        "• **Google Gemini (Recommended & Free):** Get a free key at [Google AI Studio](https://aistudio.google.com) and add `GEMINI_API_KEY=your_key` to `backend/Kiroku.Chat/.env`.\n\n",
        "• **Groq Cloud (Fastest Free Inference):** Get a key at [Groq Console](https://console.groq.com) and set `GROQ_API_KEY=your_key`.\n\n",
        "• **Local Ollama:** Or run `ollama run dolphin-mistral` locally on port 11434.\n\n",
        f"You asked: *\"{req.message}\"*\n\n",
        "In the meantime, feel free to explore our 30,000+ indexed anime, soundtrack playlist maker, and character rankings across the site!"
    ]

    for part in lines:
        yield part
        await asyncio.sleep(0.04)


# -----------------------------------------------------------------------------
# Provider Chain Resolver
# -----------------------------------------------------------------------------
def resolve_provider_chain():
    """
    Returns an ordered list of (provider_name, provider_function) to attempt.
    """
    provider = os.getenv("CHAT_PROVIDER", "auto").lower()

    if provider == "gemini":
        return [("Gemini", stream_gemini)]
    elif provider == "groq":
        return [("Groq", stream_groq)]
    elif provider == "ollama":
        return [("Ollama", stream_ollama)]
    else:
        # 'auto' mode: Prioritize available Cloud API keys, then Ollama
        chain = []
        if GEMINI_API_KEY:
            chain.append(("Gemini", stream_gemini))
        if GROQ_API_KEY:
            chain.append(("Groq", stream_groq))
        
        # Local Ollama fallback
        chain.append(("Ollama", stream_ollama))

        # If neither cloud key is configured, also keep Gemini & Groq as candidates if keys are set dynamically
        if not chain:
            chain.append(("Gemini", stream_gemini))
            chain.append(("Ollama", stream_ollama))

        return chain


# -----------------------------------------------------------------------------
# Chat SSE Endpoint
# -----------------------------------------------------------------------------
@app.post("/chat")
async def chat(req: ChatRequest):
    async def sse_generator():
        chain = resolve_provider_chain()
        last_error = None

        for name, provider_fn in chain:
            logger.info(f"Attempting response stream via provider: {name}")
            started = False
            try:
                async for chunk in provider_fn(req):
                    started = True
                    yield f"data: {json.dumps({'text': chunk})}\n\n"

                if started:
                    yield "data: [DONE]\n\n"
                    return
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {name} failed: {e}. Cascading to next available provider...")
                if started:
                    # An error occurred mid-stream after tokens were already delivered
                    yield f"data: {json.dumps({'error': f'Stream interrupted: {e}'})}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                continue

        # If all candidates in chain failed, provide graceful fallback
        logger.info("All providers exhausted. Streaming fallback guidance response.")
        async for chunk in stream_fallback(req, last_error):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@app.get("/health")
def health():
    chain = resolve_provider_chain()
    return {
        "status": "ok",
        "chat_provider_mode": CHAT_PROVIDER,
        "active_chain": [name for name, _ in chain],
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_model": GEMINI_MODEL,
        "groq_configured": bool(GROQ_API_KEY),
        "groq_model": GROQ_MODEL,
        "ollama_host": OLLAMA_HOST,
        "ollama_model": OLLAMA_MODEL
    }


@app.get("/providers")
def providers():
    return {
        "providers": [
            {
                "id": "gemini",
                "name": "Google Gemini",
                "configured": bool(GEMINI_API_KEY),
                "model": GEMINI_MODEL,
                "free_tier": True,
                "recommended": True
            },
            {
                "id": "groq",
                "name": "Groq Cloud",
                "configured": bool(GROQ_API_KEY),
                "model": GROQ_MODEL,
                "free_tier": True,
                "speed": "~500 tokens/sec"
            },
            {
                "id": "ollama",
                "name": "Local Ollama",
                "configured": True,
                "host": OLLAMA_HOST,
                "model": OLLAMA_MODEL
            }
        ]
    }
