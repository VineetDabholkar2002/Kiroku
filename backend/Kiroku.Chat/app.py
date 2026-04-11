from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import ollama
import json

app = FastAPI(title="Kiroku Chat Service")

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

Anime Name — reason

Anime Name — reason

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

Black Clover — similar underdog + magic fights  
Jujutsu Kaisen — modern animation, strong combat  
Bleach — classic shounen with great arcs  

If you want something more strategic, try Hunter x Hunter.

Are you more into fights or story?"""


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.post("/chat")
async def chat(req: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += req.history
    messages.append({"role": "user", "content": req.message})

    def stream():
        response = ollama.chat(
            model="dolphin-mistral",
            messages=messages,
            stream=True,
        )
        for chunk in response:
            text = chunk["message"]["content"]
            yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/health")
def health():
    return {"status": "ok"}
