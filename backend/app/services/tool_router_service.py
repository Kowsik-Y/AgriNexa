from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, Field

from app.services.llm_service import LLMService


_ALLOWED_TOOLS = {"weather", "agent", "rag", "llm"}
_ALLOWED_INTENTS = {"weather", "market", "soil", "pest", "irrigation", "crop"}


class _RouteDecisionModel(BaseModel):
    tool: str = "llm"
    intents: list[str] = Field(default_factory=lambda: ["crop"])
    location: str | None = None
    reason: str = ""


class ToolRouterService:
    """LLM-based tool routing and intent inference service."""

    def __init__(self) -> None:
        self.llm = LLMService()

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        if not text:
            return {}

        raw = text.strip()
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            return {}

        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    @staticmethod
    def _normalize_intents(intents: Any) -> list[str]:
        if not isinstance(intents, list):
            return ["crop"]
        normalized = [str(item).strip().lower() for item in intents if str(item).strip().lower() in _ALLOWED_INTENTS]
        return normalized or ["crop"]

    @staticmethod
    def _normalize_tool(tool: Any, use_rag: bool) -> str:
        candidate = str(tool or "").strip().lower()
        if candidate in _ALLOWED_TOOLS:
            return candidate
        return "rag" if use_rag else "llm"

    @classmethod
    def _validate_route_payload(cls, payload: dict[str, Any], use_rag: bool) -> dict[str, Any]:
        validated = _RouteDecisionModel.model_validate(payload)
        location = None
        if isinstance(validated.location, str):
            cleaned = " ".join(validated.location.split()).strip()
            location = cleaned or None

        return {
            "tool": cls._normalize_tool(validated.tool, use_rag=use_rag),
            "intents": cls._normalize_intents(validated.intents),
            "location": location,
            "reason": str(validated.reason or "").strip(),
        }

    async def route_chat(
        self,
        query: str,
        recent_user_messages: list[str],
        use_rag: bool,
    ) -> dict[str, Any]:
        if not self.llm.client.is_configured:
            return {
                "tool": "rag" if use_rag else "llm",
                "intents": ["crop"],
                "location": None,
                "reason": "llm_unavailable",
            }

        history_block = "\n".join(f"- {msg}" for msg in recent_user_messages[:4]) or "- none"
        prompt = (
            "Select the best backend tool for this farmer message.\n"
            "Return JSON only with keys: tool, intents, location, reason.\n"
            "tool must be one of: weather, agent, rag, llm.\n"
            "intents must be from: weather, market, soil, pest, irrigation, crop.\n"
            "location should be null if not present.\n"
            "Use 'agent' for multi-factor planning/execution tasks.\n"
            "Use 'weather' for weather-only requests.\n"
            "Use 'rag' for knowledge retrieval questions.\n"
            "Use 'llm' for general conversation.\n\n"
            f"Recent user messages:\n{history_block}\n\n"
            f"Current user message:\n{query}"
        )
        raw = await self.llm.generate(prompt)
        parsed = self._extract_json(raw)
        return self._validate_route_payload(parsed, use_rag=use_rag)

    async def infer_intents(self, task: str) -> list[str]:
        if not self.llm.client.is_configured:
            return ["crop"]

        prompt = (
            "Infer agricultural intents for this task. Return JSON only with key 'intents'.\n"
            "Allowed intents: weather, market, soil, pest, irrigation, crop.\n"
            "Example: {\"intents\":[\"weather\",\"soil\"]}\n\n"
            f"Task:\n{task}"
        )
        raw = await self.llm.generate(prompt)
        parsed = self._extract_json(raw)
        validated = _RouteDecisionModel.model_validate(parsed)
        return self._normalize_intents(validated.intents)
