import uuid
import time
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.llm_client import call_llm_with_fallback
from app.models.admin import LLMUsageLog
from app.core.logging import logger


def _best_guess_provider_and_model() -> tuple[str, str]:
    """
    call_llm_with_fallback() returns only a string, not which tier actually
    served the request, so this can't be exact — but it's a real improvement
    over the previous hardcoded ("gemini", "gemini-3.6-flash") log entry that
    was wrong whenever Groq or the local fallback tier actually served the
    request. Reflects which tier the cascade would try first given current
    config, which is the best available signal without changing
    call_llm_with_fallback's return contract (other callers depend on it
    returning a plain string).
    """
    if settings.AI_API_KEY and len(settings.AI_API_KEY.strip()) > 5:
        return "gemini", (settings.GEMINI_MODEL or "gemini-flash-latest")
    if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY.strip()) > 5:
        return "groq", "openai/gpt-oss-120b"
    return "local-fallback", "built-in"


class LLMGatewayService:
    @staticmethod
    async def generate(
        system_prompt: str,
        user_prompt: str,
        feature: str = "general",
        json_mode: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[AsyncSession] = None
    ) -> str:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        provider, model_name = _best_guess_provider_and_model()
        status = "success"
        error_type = None

        try:
            response = await call_llm_with_fallback(system_prompt, user_prompt, json_mode=json_mode)
            latency_ms = int((time.time() - start_time) * 1000)

            if db:
                try:
                    log = LLMUsageLog(
                        id=uuid.uuid4(),
                        provider=provider,
                        model=model_name,
                        feature=feature,
                        user_id=user_id,
                        request_id=request_id,
                        input_tokens=len(system_prompt + user_prompt) // 4,
                        output_tokens=len(response) // 4,
                        total_tokens=(len(system_prompt + user_prompt) + len(response)) // 4,
                        latency_ms=latency_ms,
                        status=status,
                        error_type=error_type
                    )
                    db.add(log)
                    await db.commit()
                except Exception as log_err:
                    logger.warning(f"Failed to save LLMUsageLog: {log_err}")

            return response
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            status = "error"
            error_type = type(e).__name__

            if db:
                try:
                    log = LLMUsageLog(
                        id=uuid.uuid4(),
                        provider=provider,
                        model=model_name,
                        feature=feature,
                        user_id=user_id,
                        request_id=request_id,
                        latency_ms=latency_ms,
                        status=status,
                        error_type=error_type
                    )
                    db.add(log)
                    await db.commit()
                except Exception:
                    pass

            raise e
