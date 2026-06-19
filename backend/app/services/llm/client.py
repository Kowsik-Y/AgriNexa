from typing import Optional

from app.core.config import settings


class OpenAIClient:
    def __init__(self) -> None:
        api_key = settings.openai_api_key or "not-required"
        base_url = settings.openai_base_url.strip() or None

        self._model = settings.openai_model
        self._temperature = settings.openai_temperature
        self._max_output_tokens = settings.openai_max_output_tokens
        self._configured = bool(settings.openai_api_key or settings.openai_base_url)
        self._client = None

        try:
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        except ModuleNotFoundError:
            # Package missing: keep service disabled without crashing app startup.
            self._configured = False

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def complete(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        if self._client is None:
            return ""

        resolved_max_tokens = max_tokens if max_tokens is not None else self._max_output_tokens

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=self._temperature,
            max_tokens=resolved_max_tokens,
        )

        message = response.choices[0].message.content if response.choices else ""
        return (message or "").strip()
