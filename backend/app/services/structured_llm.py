"""
Structured-output enforcement for LLM calls.

Every JSON-mode call in this codebase used to parse the raw response with a
bare json.loads() and, at best, a manual field-presence check — malformed
output was silently patched with hardcoded fallback values or fell straight
through to a generic canned response, and the model never got a chance to
correct itself. generate_structured() replaces that pattern: it validates the
response against a real Pydantic schema and, on failure, retries with the
validation error fed back into the prompt so the model can fix exactly what
was wrong, before finally giving up.
"""
import json
import logging
import uuid
from typing import Any, Callable, Optional, Type, TypeVar

from pydantic import TypeAdapter, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_gateway_service import LLMGatewayService

logger = logging.getLogger(__name__)

T = TypeVar("T")


class StructuredGenerationError(Exception):
    """
    Raised when the LLM still hasn't produced schema-valid output after all
    retry attempts. Callers are expected to catch this and fall back to their
    existing hardcoded content — the same failure boundary every caller
    already had, just reached only after the model has had a real chance to
    self-correct instead of on the very first malformed response.
    """


async def generate_structured(
    system_prompt: str,
    user_prompt: str,
    schema: Type[T],
    feature: str,
    db: Optional[AsyncSession] = None,
    user_id: Optional[uuid.UUID] = None,
    max_attempts: int = 2,
    preprocess: Optional[Callable[[Any], Any]] = None,
) -> T:
    """
    `schema` can be a BaseModel subclass or a generic type like list[SomeModel]
    — validation goes through TypeAdapter either way. `preprocess` lets a
    caller reshape the raw parsed JSON before validation (e.g. unwrapping a
    `{"challenges": [...]}` wrapper down to the bare list some prompts return
    instead) without that reshaping logic leaking into this shared helper.
    """
    adapter = TypeAdapter(schema)
    prompt = user_prompt
    last_error: Optional[Exception] = None

    for attempt in range(1, max_attempts + 1):
        raw = await LLMGatewayService.generate(
            system_prompt, prompt, feature=feature, json_mode=True, user_id=user_id, db=db
        )
        try:
            data = json.loads(raw)
            if preprocess:
                data = preprocess(data)
            return adapter.validate_python(data)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            if attempt < max_attempts:
                logger.info(
                    "[%s] Structured output failed validation (attempt %s/%s): %s",
                    feature, attempt, max_attempts, e,
                )
            prompt = (
                f"{user_prompt}\n\n"
                f"Your previous response was invalid: {e}\n"
                "Return ONLY valid JSON matching the required schema exactly — "
                "no markdown fences, no commentary, fix every error listed above."
            )

    raise StructuredGenerationError(str(last_error))
