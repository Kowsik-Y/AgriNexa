from __future__ import annotations

from typing import TypedDict


class PlanStep(TypedDict):
    id: str
    title: str
    rationale: str
    owner: str


_ALLOWED_INTENTS = {"weather", "market", "soil", "pest", "irrigation", "crop"}


def _normalize_intents(intents: list[str] | None) -> list[str]:
    if not intents:
        return ["crop"]
    normalized = [intent for intent in intents if intent in _ALLOWED_INTENTS]
    return normalized or ["crop"]


def make_structured_plan(goal: str, intents: list[str] | None = None) -> list[PlanStep]:
    resolved_intents = _normalize_intents(intents)
    steps: list[PlanStep] = [
        {
            "id": "discover-context",
            "title": "Collect context from user task",
            "rationale": "Identify location, crop stage, and target outcome before giving advice.",
            "owner": "planner",
        }
    ]

    if "weather" in resolved_intents:
        steps.append(
            {
                "id": "analyze-weather",
                "title": "Analyze weather impact",
                "rationale": "Weather risk directly changes irrigation and spraying decisions.",
                "owner": "weather-analyst",
            }
        )
    if "soil" in resolved_intents:
        steps.append(
            {
                "id": "evaluate-soil",
                "title": "Evaluate soil and nutrient signal",
                "rationale": "Nutrient imbalance and pH drive yield and fertilizer recommendations.",
                "owner": "soil-specialist",
            }
        )
    if "pest" in resolved_intents:
        steps.append(
            {
                "id": "assess-pest-risk",
                "title": "Assess pest and disease risk",
                "rationale": "Early risk scoring helps avoid severe field losses.",
                "owner": "crop-protection-specialist",
            }
        )
    if "market" in resolved_intents:
        steps.append(
            {
                "id": "estimate-market-window",
                "title": "Estimate market timing and price window",
                "rationale": "Timing sales can significantly improve farmer net returns.",
                "owner": "market-analyst",
            }
        )

    steps.extend(
        [
            {
                "id": "compose-actions",
                "title": "Draft prioritized actions",
                "rationale": "Convert analysis into simple, field-ready steps with order.",
                "owner": "agronomist",
            },
            {
                "id": "safety-check",
                "title": "Run safety and feasibility checks",
                "rationale": "Ensure cost, labor, and safety constraints are respected.",
                "owner": "risk-reviewer",
            },
        ]
    )

    return steps


def make_plan(goal: str, intents: list[str] | None = None) -> list[str]:
    """Backward-compatible plain-text plan for API responses."""
    structured = make_structured_plan(goal, intents=intents)
    return [f"{idx + 1}. {step['title']} ({step['owner']})" for idx, step in enumerate(structured)]
