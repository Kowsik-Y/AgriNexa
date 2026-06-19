from app.core.config import settings
from app.services.llm import FARMER_ASSISTANT_SYSTEM_PROMPT, OpenAIClient


class LLMService:
    """OpenAI-compatible LLM service."""

    def __init__(self) -> None:
        self.client = OpenAIClient()

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        # Lightweight approximation for safety budgeting.
        return max(1, (len(text) + 3) // 4)

    async def generate(self, prompt: str) -> str:
        if not self.client.is_configured:
            return (
                "LLM is not configured. Set OPENAI_API_KEY and optionally OPENAI_BASE_URL "
                "and OPENAI_MODEL in backend/.env."
            )

        bounded_prompt = " ".join(prompt.split())[: settings.openai_max_user_prompt_chars]
        max_tokens = None

        estimated_tokens = self._estimate_tokens(
            f"{FARMER_ASSISTANT_SYSTEM_PROMPT}\n{bounded_prompt}"
        )
        if estimated_tokens > settings.openai_estimated_input_token_budget:
            bounded_prompt = (
                bounded_prompt[:1200]
                + "\n\nRespond briefly in under 120 words and include only the most useful steps."
            )
            max_tokens = settings.openai_short_mode_output_tokens

        try:
            output = await self.client.complete(
                user_prompt=bounded_prompt,
                system_prompt=FARMER_ASSISTANT_SYSTEM_PROMPT,
                max_tokens=max_tokens,
            )
            if output:
                return output
        except Exception:
            pass

        return "I am unable to generate a response right now. Please try again."
