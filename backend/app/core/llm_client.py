import httpx
import json
from typing import Optional
from app.core.config import settings
from app.core.logging import logger


async def call_llm_with_fallback(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    timeout: float = 15.0
) -> str:
    """
    Unified multi-provider LLM client:
    1. Primary: Gemini Models (gemini-2.5-flash, gemini-flash-latest, gemini-2.0-flash, gemini-1.5-flash)
    2. Secondary Fallback: Groq API (llama-3.3-70b-versatile, llama-3.1-70b-versatile, mixtral-8x7b-32768)
    """
    last_error: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        # ─────────────────────────────────────────────
        # TIER 1: GOOGLE GEMINI MODELS
        # ─────────────────────────────────────────────
        if settings.AI_API_KEY and len(settings.AI_API_KEY.strip()) > 5:
            configured_model = settings.GEMINI_MODEL.strip() if settings.GEMINI_MODEL else "gemini-3.5-flash"
            gemini_models = list(dict.fromkeys([configured_model, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]))
            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
            }
            if json_mode:
                payload["generationConfig"] = {"response_mime_type": "application/json"}

            for model in gemini_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.AI_API_KEY}"
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                text_result = parts[0]["text"]
                                logger.info(f"[LLM Primary] Response generated using Gemini model: {model}")
                                return text_result
                    logger.warning(f"Gemini model {model} returned status {resp.status_code}: {resp.text[:120]}")
                except Exception as e:
                    last_error = e
                    logger.warning(f"Gemini call to {model} failed: {e}")

        # ─────────────────────────────────────────────
        # TIER 2: GROQ API FALLBACK
        # ─────────────────────────────────────────────
        groq_key = settings.GROQ_API_KEY

        if groq_key and len(groq_key.strip()) > 5:
            logger.info("[LLM Fallback] Switching to Groq AI fallback model...")
            groq_models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "groq/compound-mini", "openai/gpt-oss-20b"]
            groq_headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            }

            groq_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            groq_payload: dict = {
                "messages": groq_messages,
                "temperature": 0.7
            }
            if json_mode:
                groq_payload["response_format"] = {"type": "json_object"}

            for g_model in groq_models:
                groq_payload["model"] = g_model
                try:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=groq_headers,
                        json=groq_payload
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices and "message" in choices[0]:
                            content = choices[0]["message"].get("content", "")
                            if content:
                                logger.info(f"[LLM Fallback] Successfully generated response using Groq model: {g_model}")
                                return content
                    logger.warning(f"Groq model {g_model} returned status {resp.status_code}: {resp.text[:120]}")
                except Exception as e:
                    last_error = e
                    logger.warning(f"Groq call to {g_model} failed: {e}")

    logger.error(f"All LLM providers (Gemini & Groq) failed. Last error: {last_error}")
    raise RuntimeError(f"LLM API providers unavailable: {last_error}")
