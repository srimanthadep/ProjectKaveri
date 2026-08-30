"""
Minimal Gemini REST client for the floating assistant. No SDK dependency —
a plain HTTPS call, matching the pattern already used by the WhatsApp
concierge service in whatsapp-service/src/bot/geminiClient.js.
"""
import json
from typing import Any
import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL

GEMINI_ENDPOINT_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
)


class GeminiError(RuntimeError):
    pass


def build_system_prompt(context: dict[str, Any]) -> str:
    return (
        "You are the AI concierge for Kaveri Stays, a luxury boutique hospitality "
        "brand with three properties: Kaveri Riverside (Coorg), Kaveri Hilltop (Ooty), "
        "and Kaveri Backwater (Alleppey).\n\n"
        "CALLER CONTEXT (the ONLY data you may reference about this specific caller):\n"
        f"{json.dumps(context, indent=2)}\n\n"
        "RULES:\n"
        "1. STRICT FACTS ONLY. Never invent booking dates, room numbers, prices, or "
        "occupancy figures. Only use what is in CALLER CONTEXT.\n"
        "2. NO OTHER GUESTS OR PROPERTIES beyond what CALLER CONTEXT exposes for this role.\n"
        "3. Be warm, concise (2-4 sentences unless asked for a list), and helpful.\n"
        "4. If asked something outside your knowledge (e.g. specific pricing not in "
        "context), say so plainly rather than guessing.\n"
        "5. You may suggest relevant sections of the app (Bookings, Reports, Guests) "
        "when it helps the caller's request."
    )


async def call_gemini(*, system_prompt: str, history: list[dict], message: str) -> str:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY is not configured on the server.")

    contents = [
        {"role": turn["role"] if turn["role"] == "user" else "model", "parts": [{"text": turn["content"]}]}
        for turn in history
    ]
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 500,
        },
    }

    url = GEMINI_ENDPOINT_TEMPLATE.format(model=GEMINI_MODEL, key=GEMINI_API_KEY)

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            res = await client.post(url, json=payload)
        except httpx.RequestError as exc:
            raise GeminiError(f"Failed to reach Gemini API: {exc}") from exc

    if res.status_code != 200:
        raise GeminiError(f"Gemini API error ({res.status_code}): {res.text[:300]}")

    data = res.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise GeminiError("Gemini returned an unexpected response shape.") from exc

    if not text or not text.strip():
        raise GeminiError("Gemini returned an empty response.")

    return text.strip()
