from typing import Optional

from app.core.config import settings
from app.services.llm import RAG_ASSISTANT_SYSTEM_PROMPT
from app.services.llm_service import LLMService


class RAGService:
    """RAG orchestration service."""

    def __init__(self) -> None:
        self.llm_service = LLMService()

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        # Lightweight approximation for safety budgeting.
        return max(1, (len(text) + 3) // 4)

    def _build_bounded_context(
        self,
        context_items: list[str],
        max_items: Optional[int] = None,
        max_total_chars: Optional[int] = None,
        max_item_chars: Optional[int] = None,
    ) -> str:
        if not context_items:
            return "No context found."

        resolved_max_items = max(1, max_items or settings.rag_max_context_items)
        resolved_max_total_chars = max(400, max_total_chars or settings.rag_max_context_chars)
        resolved_max_item_chars = max(120, max_item_chars or settings.rag_max_item_chars)

        selected: list[str] = []
        used = 0

        for raw in context_items[:resolved_max_items]:
            text = " ".join(str(raw).split())
            if not text:
                continue

            clipped = text[:resolved_max_item_chars]
            if len(text) > resolved_max_item_chars:
                clipped = clipped.rstrip() + "..."

            bullet = f"- {clipped}"
            projected = used + len(bullet) + (1 if selected else 0)
            if projected > resolved_max_total_chars:
                break

            selected.append(bullet)
            used = projected

        if not selected:
            return "No context found."

        return "\n".join(selected)

    async def answer(self, query: str) -> str:
        from app.rag.pipeline import run_pipeline

        query_clean = " ".join(query.split())[: settings.openai_max_user_prompt_chars]
        result = run_pipeline("knowledge_base", query_clean)
        context_items = result.get("context", [])
        context = self._build_bounded_context(context_items)

        suffix = "Answer clearly for a farmer. Include practical next steps when useful."

        prompt = (
            f"Question:\n{query_clean}\n\n"
            f"Retrieved Context:\n{context}\n\n"
            f"{suffix}"
        )

        max_tokens = None
        estimated_tokens = self._estimate_tokens(f"{RAG_ASSISTANT_SYSTEM_PROMPT}\n{prompt}")
        if estimated_tokens > settings.openai_estimated_input_token_budget:
            context = self._build_bounded_context(
                context_items,
                max_items=min(2, settings.rag_max_context_items),
                max_total_chars=min(900, settings.rag_max_context_chars),
                max_item_chars=min(280, settings.rag_max_item_chars),
            )
            short_suffix = (
                "Answer in under 120 words. Focus only on the top actions a farmer should take now."
            )
            prompt = (
                f"Question:\n{query_clean[:1000]}\n\n"
                f"Retrieved Context:\n{context}\n\n"
                f"{short_suffix}"
            )
            max_tokens = settings.openai_short_mode_output_tokens

        if not self.llm_service.client.is_configured:
            return (
                "RAG retrieved context, but LLM is not configured. "
                "Set OPENAI_API_KEY and optionally OPENAI_BASE_URL and OPENAI_MODEL in backend/.env."
            )

        try:
            output = await self.llm_service.client.complete(
                user_prompt=prompt,
                system_prompt=RAG_ASSISTANT_SYSTEM_PROMPT,
                max_tokens=max_tokens,
            )
            if output:
                return output
        except Exception:
            pass

        return "I am unable to generate a retrieval-based answer right now. Please try again."
