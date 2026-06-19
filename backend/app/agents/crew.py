from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from typing import Any

import httpx

from app.agents.planner import make_structured_plan
from app.core.config import settings
from app.services.llm_service import LLMService
from app.services.market import get_market_service
from app.services.market.catalog import MOCK_PRICES
from app.services.weather import get_weather_service


# Default geocoding table; can be extended with AGENT_LOCATION_COORDS_JSON.
_DEFAULT_LOCATION_COORDS: dict[str, tuple[float, float]] = {
    "coimbatore": (11.0168, 76.9558),
    "erode": (11.3410, 77.7172),
    "sathyamangalam": (11.5059, 77.2389),
    "salem": (11.6643, 78.1460),
    "madurai": (9.9252, 78.1198),
    "trichy": (10.7905, 78.7047),
    "chennai": (13.0827, 80.2707),
    "bengaluru": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "hyderabad": (17.3850, 78.4867),
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "delhi": (28.6139, 77.2090),
}


_DEFAULT_CROP_ALIASES: dict[str, str] = {
    "paddy": "Rice",
    "rice": "Rice",
    "wheat": "Wheat",
    "maize": "Maize",
    "corn": "Maize",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
    "groundnut": "Groundnut",
    "millet": "Millets",
    "millets": "Millets",
    "pulse": "Pulses",
    "pulses": "Pulses",
    "jute": "Jute",
    "coffee": "Coffee",
}


def _read_json_object_env(var_name: str) -> dict[str, Any]:
    raw = os.getenv(var_name, "").strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _build_location_coords() -> dict[str, tuple[float, float]]:
    coords = dict(_DEFAULT_LOCATION_COORDS)
    overrides = _read_json_object_env("AGENT_LOCATION_COORDS_JSON")
    for city, value in overrides.items():
        if not isinstance(city, str) or not isinstance(value, (list, tuple)) or len(value) != 2:
            continue
        try:
            lat = float(value[0])
            lon = float(value[1])
        except (TypeError, ValueError):
            continue
        coords[city.strip().lower()] = (lat, lon)
    return coords


def _build_crop_aliases() -> dict[str, str]:
    aliases = dict(_DEFAULT_CROP_ALIASES)

    # Auto-register canonical crops from market catalog.
    for canonical in MOCK_PRICES.keys():
        normalized = str(canonical).strip().lower()
        if not normalized:
            continue
        aliases.setdefault(normalized, str(canonical))

    # Optional alias overrides: {"alias": "CanonicalCrop"}
    overrides = _read_json_object_env("AGENT_CROP_ALIASES_JSON")
    for alias, canonical in overrides.items():
        alias_key = str(alias).strip().lower()
        canonical_name = str(canonical).strip()
        if alias_key and canonical_name:
            aliases[alias_key] = canonical_name
    return aliases


_LOCATION_COORDS: dict[str, tuple[float, float]] = _build_location_coords()
_CROP_ALIASES: dict[str, str] = _build_crop_aliases()


def _extract_location_name(task: str) -> str | None:
    cleaned = " ".join(task.split()).strip()
    if not cleaned:
        return None

    match = re.search(r"\b(?:in|at|for|near)\s+([a-zA-Z\s]{2,60})", cleaned, flags=re.IGNORECASE)
    location_name = ""
    if match:
        candidate = re.split(r"\b(?:with|for|to|and|on|using|regarding)\b", match.group(1), maxsplit=1)[0]
        location_name = " ".join(candidate.split()).strip().lower()

    if not location_name:
        for known in sorted(_LOCATION_COORDS.keys(), key=len, reverse=True):
            if known in cleaned.lower():
                location_name = known
                break

    if not location_name:
        return None

    return location_name


async def _resolve_location_coords(location_name: str) -> tuple[str | None, tuple[float, float] | None]:
    if not location_name:
        return None, None

    direct = _LOCATION_COORDS.get(location_name)
    if direct:
        return location_name.title(), direct

    # Optional live geocoding fallback (Nominatim). Disabled when AGENT_GEOCODE_ENABLED=0.
    if os.getenv("AGENT_GEOCODE_ENABLED", "1") != "1":
        return location_name.title(), None

    user_agent = os.getenv("AGENT_GEOCODE_USER_AGENT", "AgriNexaAgent/1.0")
    try:
        async with httpx.AsyncClient(timeout=4.0, headers={"User-Agent": user_agent}) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": location_name,
                    "format": "json",
                    "limit": 1,
                },
            )
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list) and data:
                item = data[0]
                lat = float(item.get("lat"))
                lon = float(item.get("lon"))
                display = str(item.get("display_name") or "").split(",")[0].strip()
                if display:
                    _LOCATION_COORDS[location_name] = (lat, lon)
                    return display, (lat, lon)
                _LOCATION_COORDS[location_name] = (lat, lon)
                return location_name.title(), (lat, lon)
    except Exception:
        # Keep the flow resilient: fall back to unknown coordinates.
        return location_name.title(), None

    return location_name.title(), None


def _extract_crop(task: str) -> str | None:
    lower = task.lower()
    for alias, canonical in sorted(_CROP_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf"\b{re.escape(alias)}\b", lower):
            return canonical
    return None


def _extract_crop_stage(task: str) -> str | None:
    lower = task.lower()
    stage_keywords = {
        "sowing": ("sow", "sowing", "seed", "germination", "nursery", "transplant"),
        "vegetative": ("vegetative", "tillering", "leaf", "branching", "early growth"),
        "flowering": ("flower", "flowering", "booting", "panicle", "fruit set"),
        "harvest": ("harvest", "maturity", "ripening", "post-harvest", "storage"),
    }
    for stage, keywords in stage_keywords.items():
        if any(k in lower for k in keywords):
            return stage
    return None


def _detect_needs_from_intents(intents: list[str]) -> dict[str, bool]:
    intent_set = set(intents)
    return {
        "weather": "weather" in intent_set,
        "market": "market" in intent_set,
        "risk": "pest" in intent_set or "soil" in intent_set or "irrigation" in intent_set,
    }


def _agronomist_agent(task: str, crop_stage: str | None) -> list[str]:
    actions = [
        "Set a 7-day field action list with highest-impact work first.",
        "Split actions into immediate (today), short-term (3 days), and review (7 days).",
        f"Tailor crop operations to task focus: '{task[:80]}'.",
    ]

    stage_actions = {
        "sowing": [
            "Validate seed quality and moisture before sowing/transplanting.",
            "Complete basal nutrient placement and ensure uniform field leveling.",
        ],
        "vegetative": [
            "Prioritize top-dressing and weed control during active vegetative growth.",
            "Track leaf color and vigor to catch nutrient stress early.",
        ],
        "flowering": [
            "Avoid moisture stress during flowering and fruit/panicle setting windows.",
            "Prevent spray operations during high heat or strong wind to protect flowers.",
        ],
        "harvest": [
            "Plan harvest at physiological maturity and avoid delays from forecast rain.",
            "Prepare drying and storage workflow before harvest starts.",
        ],
    }
    if crop_stage and crop_stage in stage_actions:
        actions.extend(stage_actions[crop_stage])
    return actions


def _risk_reviewer_agent(task: str) -> list[str]:
    risk_flags: list[str] = []
    lower = task.lower()
    if any(k in lower for k in ("spray", "pesticide", "disease", "pest")):
        risk_flags.append("Verify pre-harvest interval and label dose before any spray operation.")
    if any(k in lower for k in ("fertilizer", "urea", "dap", "nutrient")):
        risk_flags.append("Apply nutrients in split doses to reduce burn and runoff risk.")
    if any(k in lower for k in ("water", "irrigation", "rain")):
        risk_flags.append("Avoid irrigation overlap with expected rain to prevent waterlogging.")

    if not risk_flags:
        risk_flags.append("Validate local soil, weather, and labor constraints before execution.")
    return risk_flags


def _execution_agent() -> list[str]:
    return [
        "Define measurable checkpoints (field condition, cost, yield proxy).",
        "Capture outcomes after each action and adapt next step.",
        "Escalate to expert agronomist when crop stress intensifies after intervention.",
    ]


def _build_fallback_summary(task: str, weather_data: dict[str, Any], market_data: dict[str, Any]) -> str:
    summary_parts = [f"Task focus: {task}"]
    if weather_data:
        current = weather_data.get("current", {})
        summary_parts.append(
            "Weather now: "
            f"{current.get('temp_c', 'NA')}°C, "
            f"humidity {current.get('humidity', 'NA')}%, "
            f"rainfall {current.get('rainfall_mm', 'NA')} mm."
        )
    if market_data:
        summary_parts.append(
            "Market: "
            f"{market_data.get('crop', 'Crop')} at ₹{market_data.get('current_price', 'NA')} "
            f"{market_data.get('price_unit', '')}, trend {market_data.get('price_trend', 'Unknown')}."
        )
    summary_parts.append("Action: prioritize low-risk operations first and review field response in 48-72 hours.")
    return " ".join(summary_parts)


def _compute_confidence(
    needs: dict[str, bool],
    coords: tuple[float, float] | None,
    weather_data: dict[str, Any],
    market_data: dict[str, Any],
    crop_name: str | None,
    crop_stage: str | None,
) -> dict[str, Any]:
    weather_score = 0.0
    market_score = 0.0
    risk_score = 0.6

    if needs.get("weather"):
        weather_score += 0.4 if coords else 0.0
        weather_score += 0.4 if weather_data.get("current") else 0.0
        weather_score += 0.2 if weather_data.get("forecast_7_days") else 0.0
    else:
        weather_score = 0.7

    if needs.get("market"):
        market_score += 0.25 if crop_name else 0.0
        market_score += 0.5 if market_data.get("current_price") else 0.0
        market_score += 0.25 if market_data.get("source") in {"data_gov_live", "data_gov_market_exact"} else 0.1
    else:
        market_score = 0.7

    if crop_stage:
        risk_score += 0.2
    if needs.get("risk"):
        risk_score += 0.2

    weather_score = round(min(1.0, weather_score), 2)
    market_score = round(min(1.0, market_score), 2)
    risk_score = round(min(1.0, risk_score), 2)

    overall = round((weather_score * 0.4) + (market_score * 0.3) + (risk_score * 0.3), 2)
    label = "high" if overall >= 0.75 else ("medium" if overall >= 0.5 else "low")

    return {
        "overall": overall,
        "label": label,
        "by_block": {
            "weather": weather_score,
            "market": market_score,
            "risk": risk_score,
        },
    }


async def _run_crewai_summary(
    task: str,
    location_name: str | None,
    crop_name: str | None,
    crop_stage: str | None,
    weather_data: dict[str, Any],
    market_data: dict[str, Any],
    risk_flags: list[str],
) -> tuple[str | None, str | None]:

    try:
        from crewai import Agent, Crew, Process, Task  # pyright: ignore[reportMissingImports]
    except Exception as exc:
        return None, f"crewai_import_error:{type(exc).__name__}"

    if settings.openai_api_key and not os.getenv("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
    if settings.openai_base_url and not os.getenv("OPENAI_API_BASE"):
        os.environ["OPENAI_API_BASE"] = settings.openai_base_url

    llm_model = os.getenv("CREWAI_MODEL", settings.openai_model)

    crop_label = crop_name or "unknown crop"
    location_label = location_name or "unknown location"
    stage_label = crop_stage or "unspecified"

    planner = Agent(
        role="Farm Operations Planner",
        goal="Convert farm context into a practical short action plan.",
        backstory="You optimize field operations for small and medium farmers.",
        allow_delegation=False,
        llm=llm_model,
        verbose=False,
    )
    risk_analyst = Agent(
        role="Agri Risk Analyst",
        goal="Identify immediate risks and preventive actions.",
        backstory="You specialize in weather, pest, and field execution risks.",
        allow_delegation=False,
        llm=llm_model,
        verbose=False,
    )
    advisor = Agent(
        role="Farmer Advisory Writer",
        goal="Produce concise, clear recommendations with priorities.",
        backstory="You communicate high-impact farm decisions in plain language.",
        allow_delegation=False,
        llm=llm_model,
        verbose=False,
    )

    planning_task = Task(
        description=(
            "Create a practical 7-day farm action strategy from this context.\n"
            f"Task: {task}\n"
            f"Location: {location_label}\n"
            f"Crop: {crop_label}\n"
            f"Stage: {stage_label}\n"
            f"Weather: {weather_data or 'not available'}\n"
            f"Market: {market_data or 'not available'}"
        ),
        expected_output="Prioritized operations grouped by immediate, 3-day, and 7-day windows.",
        agent=planner,
    )
    risk_task = Task(
        description=(
            "Review the same context and list major operational risks and controls.\n"
            f"Known risk flags: {risk_flags}"
        ),
        expected_output="Top risks and one clear mitigation for each risk.",
        agent=risk_analyst,
    )
    final_task = Task(
        description=(
            "Combine planning and risk analysis into a final farmer-ready recommendation in under 140 words. "
            "Include only concrete actions."
        ),
        expected_output="Single concise recommendation paragraph for a farmer.",
        agent=advisor,
        context=[planning_task, risk_task],
    )

    def _kickoff() -> str:
        crew = Crew(
            agents=[planner, risk_analyst, advisor],
            tasks=[planning_task, risk_task, final_task],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result).strip()

    try:
        summary = await asyncio.to_thread(_kickoff)
        return (summary[:1200] if summary else None), None
    except Exception as exc:
        return None, f"crewai_error:{type(exc).__name__}"


async def run_crew(task: str, intents: list[str] | None = None) -> dict:
    resolved_intents = intents or ["crop"]
    plan = make_structured_plan(task, intents=resolved_intents)
    routed_specialists = sorted({step["owner"] for step in plan})
    needs = _detect_needs_from_intents(resolved_intents)

    location_guess = _extract_location_name(task)
    location_name, coords = await _resolve_location_coords(location_guess) if location_guess else (None, None)
    crop_name = _extract_crop(task)
    crop_stage = _extract_crop_stage(task)

    weather_data: dict[str, Any] = {}
    market_data: dict[str, Any] = {}

    if needs["weather"] and coords:
        weather_service = await get_weather_service()
        weather_data = await weather_service.get_weather(
            latitude=coords[0],
            longitude=coords[1],
            location_name=location_name,
        )

    if needs["market"] and crop_name:
        market_service = await get_market_service()
        market_data = await market_service.get_market_prices(crop_name=crop_name)
        if market_data.get("current_price"):
            storage_info = await market_service.get_storage_recommendations(
                crop_name=crop_name,
                current_price=float(market_data["current_price"]),
            )
            market_data["storage"] = storage_info

    if needs["market"] and not crop_name and MOCK_PRICES:
        crop_name = next(iter(MOCK_PRICES.keys()))

    agronomy_actions = _agronomist_agent(task, crop_stage)
    risk_flags = _risk_reviewer_agent(task)
    execution_protocol = _execution_agent()

    final_summary, crewai_error = await _run_crewai_summary(
        task=task,
        location_name=location_name,
        crop_name=crop_name,
        crop_stage=crop_stage,
        weather_data=weather_data,
        market_data=market_data,
        risk_flags=risk_flags,
    )
    orchestration_engine = "crewai" if final_summary else "native"

    if not final_summary:
        llm = LLMService()
        synthesis_prompt = (
            "You are an agri advisor. Create a concise action plan with immediate and short-term actions. "
            f"User task: {task}\n"
            f"Location: {location_name or 'not provided'}\n"
            f"Crop: {crop_name or 'not provided'}\n"
            f"Crop stage: {crop_stage or 'not provided'}\n"
            f"Weather data: {weather_data or 'not available'}\n"
            f"Market data: {market_data or 'not available'}\n"
            f"Risk flags: {risk_flags}\n"
            "Output in plain text with max 140 words."
        )
        final_summary = await llm.generate(synthesis_prompt)
        if "not configured" in final_summary.lower() or "unable to generate" in final_summary.lower():
            final_summary = _build_fallback_summary(task, weather_data, market_data)

    confidence = _compute_confidence(
        needs=needs,
        coords=coords,
        weather_data=weather_data,
        market_data=market_data,
        crop_name=crop_name,
        crop_stage=crop_stage,
    )

    return {
        "mode": "agentic-orchestration",
        "orchestration_engine": orchestration_engine,
        "crewai": {
            "enabled": os.getenv("AGENT_USE_CREWAI", "1") == "1",
            "used": orchestration_engine == "crewai",
            "error": crewai_error,
            "model": os.getenv("CREWAI_MODEL", settings.openai_model),
        },
        "task": task,
        "context": {
            "location": location_name,
            "crop": crop_name,
            "crop_stage": crop_stage,
            "intents": resolved_intents,
            "needs": needs,
        },
        "routed_specialists": routed_specialists,
        "plan_steps": plan,
        "findings": {
            "agronomy_actions": agronomy_actions,
            "risk_flags": risk_flags,
            "execution_protocol": execution_protocol,
            "weather": weather_data,
            "market": market_data,
        },
        "final_recommendation": final_summary,
        "confidence": confidence,
        "follow_up_questions": [
            "Which crop and growth stage are you managing right now?",
            "What is your location and expected weather in the next 3 days?",
            "Do you want low-cost, medium-cost, or yield-max strategy?",
        ],
    }
