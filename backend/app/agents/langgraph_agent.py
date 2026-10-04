from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from app.core.config import settings
from app.db.session import db
from app.services.llm import FARMER_ASSISTANT_SYSTEM_PROMPT
from app.services.market import get_market_service
from app.services.weather import get_weather_service
from app.agents.crew import (
    _resolve_location_coords,
    _extract_location_name,
    _extract_crop,
    _extract_crop_stage,
    _build_fallback_summary,
)

logger = logging.getLogger(__name__)


class AgriAgentState(TypedDict, total=False):
    query: str
    language: str
    user_id: Optional[str]
    conversation_id: Optional[str]
    recent_messages: List[Dict[str, Any]]
    farmer_profile: Optional[Dict[str, Any]]

    intents: List[str]
    crop: Optional[str]
    crop_stage: Optional[str]
    location: Optional[str]

    weather_data: Optional[Dict[str, Any]]
    market_data: Optional[Dict[str, Any]]
    rag_context: Optional[str]

    answer: str
    source: str


def get_langchain_chat_model(temperature: float = 0.3) -> Optional[ChatOpenAI]:
    """Initialize LangChain ChatOpenAI with Groq or OpenAI credentials."""
    api_key = settings.openai_api_key
    if not api_key:
        return None
    try:
        return ChatOpenAI(
            api_key=api_key,
            base_url=settings.openai_base_url or None,
            model=settings.openai_model or "openai/gpt-oss-120b",
            temperature=temperature,
            timeout=30.0,
        )
    except Exception as e:
        logger.warning(f"Could not initialize LangChain ChatOpenAI: {e}")
        return None


# ─────────────────────────────────────────────────────────────
# Graph Nodes
# ─────────────────────────────────────────────────────────────

async def analyze_and_route_node(state: AgriAgentState) -> Dict[str, Any]:
    """Analyze query with LangChain to classify intents and extract entities."""
    query = state.get("query", "").strip()
    profile = state.get("farmer_profile") or {}
    history = state.get("recent_messages") or []

    # Default entities from profile if present
    default_crop = profile.get("crops") or None
    default_loc = profile.get("district") or profile.get("village") or profile.get("state") or None
    default_stage = profile.get("flow_stage") or None

    extracted_crop = _extract_crop(query) or default_crop
    extracted_loc = _extract_location_name(query) or default_loc
    extracted_stage = _extract_crop_stage(query) or default_stage

    intents: List[str] = []
    chat_llm = get_langchain_chat_model(temperature=0.1)

    if chat_llm:
        history_summary = "\n".join(
            f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history[-3:]
        )
        prompt = (
            "You are an agricultural intent classifier for Indian farmers.\n"
            "Analyze the farmer's query and output JSON with keys:\n"
            "- intents: list of zero or more from ['weather', 'market', 'rag', 'plan', 'general']\n"
            "- crop: string or null\n"
            "- location: string or null\n"
            "- crop_stage: string or null\n\n"
            f"Context Profile: crop={default_crop}, location={default_loc}, stage={default_stage}\n"
            f"Recent conversation:\n{history_summary or 'None'}\n\n"
            f"Farmer query: {query}\n"
            "Return valid JSON only."
        )
        try:
            res = await chat_llm.ainvoke([HumanMessage(content=prompt)])
            raw_text = str(res.content).strip()
            match = re.search(r"\{[\s\S]*\}", raw_text)
            if match:
                parsed = json.loads(match.group(0))
                detected_intents = parsed.get("intents")
                if isinstance(detected_intents, list) and detected_intents:
                    intents = [str(i).lower() for i in detected_intents]
                if parsed.get("crop") and not extracted_crop:
                    extracted_crop = str(parsed["crop"])
                if parsed.get("location") and not extracted_loc:
                    extracted_loc = str(parsed["location"])
                if parsed.get("crop_stage") and not extracted_stage:
                    extracted_stage = str(parsed["crop_stage"])
        except Exception as e:
            logger.warning(f"LangChain intent classification failed: {e}")

    # Fallback heuristic intent detection
    if not intents:
        lower_q = query.lower()
        if any(w in lower_q for w in ["weather", "rain", "temperature", "forecast", "humidity", "monsoon"]):
            intents.append("weather")
        if any(w in lower_q for w in ["price", "market", "mandi", "rate", "cost", "sell", "apmc"]):
            intents.append("market")
        if any(w in lower_q for w in ["pest", "disease", "spray", "fungicide", "fertilizer", "nutrient", "soil", "npk", "blight", "borer"]):
            intents.append("rag")
        if any(w in lower_q for w in ["plan", "schedule", "routine", "guide", "steps", "harvest"]):
            intents.append("plan")
        if not intents:
            intents.append("general")

    return {
        "intents": intents,
        "crop": extracted_crop,
        "location": extracted_loc,
        "crop_stage": extracted_stage,
    }


async def fetch_weather_node(state: AgriAgentState) -> Dict[str, Any]:
    """Fetch live or regional agro-weather using AgriNexa WeatherService."""
    location_name = state.get("location")
    coords = None
    if location_name:
        resolved_name, coords = await _resolve_location_coords(location_name.lower())
        if resolved_name:
            location_name = resolved_name

    weather_data: Dict[str, Any] = {}
    try:
        weather_service = await get_weather_service()
        if coords:
            weather_data = await weather_service.get_weather(
                latitude=coords[0],
                longitude=coords[1],
                location_name=location_name,
            )
        elif location_name:
            # Fallback coordinate lookup
            resolved_name, fallback_coords = await _resolve_location_coords("coimbatore")
            weather_data = await weather_service.get_weather(
                latitude=fallback_coords[0] if fallback_coords else 11.0168,
                longitude=fallback_coords[1] if fallback_coords else 76.9558,
                location_name=location_name,
            )
    except Exception as e:
        logger.warning(f"Error fetching weather in LangGraph node: {e}")

    return {"weather_data": weather_data}


async def fetch_market_node(state: AgriAgentState) -> Dict[str, Any]:
    """Fetch mandi prices and storage intelligence using AgriNexa MarketService."""
    crop_name = state.get("crop") or "Rice"
    market_data: Dict[str, Any] = {}
    try:
        market_service = await get_market_service()
        market_data = await market_service.get_market_prices(crop_name=crop_name)
        if market_data.get("current_price"):
            storage_info = await market_service.get_storage_recommendations(
                crop_name=crop_name,
                current_price=float(market_data["current_price"]),
            )
            market_data["storage"] = storage_info
    except Exception as e:
        logger.warning(f"Error fetching market data in LangGraph node: {e}")

    return {"market_data": market_data}


async def fetch_rag_node(state: AgriAgentState) -> Dict[str, Any]:
    """Fetch agricultural knowledge and agronomy recommendations."""
    query = state.get("query", "")
    rag_context = ""
    try:
        from app.services.rag_service import RAGService
        rag_svc = RAGService()
        rag_context = await rag_svc.answer(query)
    except Exception as e:
        logger.warning(f"Error in RAG node: {e}")

    return {"rag_context": rag_context}


async def synthesize_advisory_node(state: AgriAgentState) -> Dict[str, Any]:
    """Synthesize farmer-centric response using LangChain ChatOpenAI."""
    query = state.get("query", "")
    language = state.get("language") or "English"
    intents = state.get("intents") or ["general"]
    weather_data = state.get("weather_data")
    market_data = state.get("market_data")
    rag_context = state.get("rag_context")
    crop = state.get("crop")
    crop_stage = state.get("crop_stage")
    location = state.get("location")
    profile = state.get("farmer_profile") or {}

    chat_llm = get_langchain_chat_model(temperature=0.25)
    source = "agrinexa"
    if "weather" in intents and len(intents) == 1:
        source = "weather"
    elif "market" in intents and len(intents) == 1:
        source = "market"
    elif "rag" in intents and len(intents) == 1:
        source = "rag"

    if chat_llm:
        system_instruction = (
            f"{FARMER_ASSISTANT_SYSTEM_PROMPT}\n\n"
            f"CRITICAL: The farmer prefers the response in language: '{language}'. "
            f"If the language is not English (e.g., Tamil, Hindi, Telugu), translate and output fluent, natural phrasing in that language. "
            f"Keep advice practical, step-by-step, actionable, and emphasize safety, dosage, and irrigation timing."
        )

        context_blocks = []
        if crop:
            context_blocks.append(f"- Focused Crop: {crop} (Stage: {crop_stage or 'Active'})")
        if location:
            context_blocks.append(f"- Farmer Location: {location}")
        if profile.get("nitrogen") or profile.get("ph"):
            context_blocks.append(
                f"- Soil Parameters: N={profile.get('nitrogen')}, P={profile.get('phosphorus')}, K={profile.get('potassium')}, pH={profile.get('ph')}"
            )
        if weather_data:
            summary = weather_data.get("summary") or weather_data.get("description") or "Normal weather"
            temp = weather_data.get("temperature", "")
            rain_prob = weather_data.get("rain_probability", "")
            context_blocks.append(f"- Weather Insight: {summary}, Temp: {temp}°C, Rain chance: {rain_prob}%")
        if market_data:
            price = market_data.get("current_price") or market_data.get("modal_price")
            trend = market_data.get("trend") or "Stable"
            context_blocks.append(f"- Mandi Market: Current price ₹{price}/quintal, Trend: {trend}")
        if rag_context:
            context_blocks.append(f"- Agronomic Knowledge Findings:\n{rag_context}")

        context_str = "\n".join(context_blocks) if context_blocks else "Standard agronomic practices."

        user_prompt = (
            f"Farmer Question: {query}\n\n"
            f"Available Farm & Real-Time Context:\n{context_str}\n\n"
            "Please provide a complete, direct, and structured agricultural recommendation for the farmer."
        )

        try:
            response = await chat_llm.ainvoke([
                SystemMessage(content=system_instruction),
                HumanMessage(content=user_prompt),
            ])
            answer = str(response.content).strip()
            if answer:
                return {"answer": answer, "source": source}
        except Exception as e:
            logger.warning(f"Error in LangChain advisory synthesis: {e}")

    # Fallback generation if LLM is unavailable
    if rag_context:
        answer = rag_context
    elif weather_data:
        temp = weather_data.get("temperature", "--")
        summary = weather_data.get("summary", "clear conditions")
        answer = f"Current weather in {location or 'your area'}: {temp}°C with {summary}. Suitable for general farm operations."
    elif market_data:
        price = market_data.get("current_price") or market_data.get("modal_price", "--")
        answer = f"Market price for {crop or 'crop'}: ₹{price} per quintal. Advised to monitor trends before bulk sales."
    else:
        answer = _build_fallback_summary(query, weather_data, market_data)

    return {"answer": answer, "source": source}


# ─────────────────────────────────────────────────────────────
# Graph Routing & Construction
# ─────────────────────────────────────────────────────────────

def determine_data_routes(state: AgriAgentState) -> List[str]:
    """Conditional router based on detected intents."""
    intents = set(state.get("intents") or ["general"])
    routes: List[str] = []

    if "weather" in intents:
        routes.append("fetch_weather")
    if "market" in intents:
        routes.append("fetch_market")
    if "rag" in intents or "plan" in intents:
        routes.append("fetch_rag")

    if not routes:
        # Direct synthesis for general conversations/questions
        routes.append("synthesize_advisory")

    return routes


def build_agri_langgraph():
    """Construct and compile the LangGraph agricultural assistant workflow."""
    workflow = StateGraph(AgriAgentState)

    # Add all agent nodes
    workflow.add_node("analyze_and_route", analyze_and_route_node)
    workflow.add_node("fetch_weather", fetch_weather_node)
    workflow.add_node("fetch_market", fetch_market_node)
    workflow.add_node("fetch_rag", fetch_rag_node)
    workflow.add_node("synthesize_advisory", synthesize_advisory_node)

    # Edges
    workflow.add_edge(START, "analyze_and_route")

    # Conditional branching from analyzer
    workflow.add_conditional_edges(
        "analyze_and_route",
        determine_data_routes,
        {
            "fetch_weather": "fetch_weather",
            "fetch_market": "fetch_market",
            "fetch_rag": "fetch_rag",
            "synthesize_advisory": "synthesize_advisory",
        },
    )

    # Data collection nodes funnel to synthesizer
    workflow.add_edge("fetch_weather", "synthesize_advisory")
    workflow.add_edge("fetch_market", "synthesize_advisory")
    workflow.add_edge("fetch_rag", "synthesize_advisory")

    workflow.add_edge("synthesize_advisory", END)

    return workflow.compile()


# Singleton compiled graph instance
_agri_graph = None


def get_agri_graph():
    global _agri_graph
    if _agri_graph is None:
        _agri_graph = build_agri_langgraph()
    return _agri_graph


async def run_agri_agent(
    query: str,
    language: str = "English",
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    recent_messages: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Execute the LangGraph agricultural assistant pipeline."""
    graph = get_agri_graph()

    # Load farmer profile if user_id is provided
    farmer_profile = None
    if user_id:
        try:
            farmer_profile = await db.users.find_one({"user_id": user_id})
        except Exception as e:
            logger.warning(f"Could not load farmer profile for LangGraph agent: {e}")

    initial_state: AgriAgentState = {
        "query": query,
        "language": language,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "recent_messages": recent_messages or [],
        "farmer_profile": farmer_profile,
    }

    result = await graph.ainvoke(initial_state)

    return {
        "answer": result.get("answer", "I prepared agricultural recommendations for you."),
        "source": result.get("source", "agrinexa"),
        "intents": result.get("intents", []),
        "crop": result.get("crop"),
        "location": result.get("location"),
        "weather_data": result.get("weather_data"),
        "market_data": result.get("market_data"),
    }


async def stream_agri_agent(
    query: str,
    language: str = "English",
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    recent_messages: Optional[List[Dict[str, Any]]] = None,
):
    """Real-time token streaming pipeline for LangGraph/LangChain agricultural assistant."""
    farmer_profile = None
    if user_id:
        try:
            farmer_profile = await db.users.find_one({"user_id": user_id})
        except Exception as e:
            logger.warning(f"Could not load farmer profile for streaming agent: {e}")

    yield {
        "type": "status",
        "stage": "analyzing",
        "text": "Analyzing crop & field context...",
    }

    state: AgriAgentState = {
        "query": query,
        "language": language,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "recent_messages": recent_messages or [],
        "farmer_profile": farmer_profile,
    }

    analysis = await analyze_and_route_node(state)
    state.update(analysis)
    intents = set(state.get("intents") or ["general"])

    yield {
        "type": "status",
        "stage": "gathering_data",
        "text": "Checking agro-weather, mandi rates & crop guides...",
        "intents": list(intents),
        "crop": state.get("crop"),
        "location": state.get("location"),
    }

    # Parallel data gathering
    fetch_tasks = []
    if "weather" in intents:
        fetch_tasks.append(fetch_weather_node(state))
    if "market" in intents:
        fetch_tasks.append(fetch_market_node(state))
    if "rag" in intents or "plan" in intents:
        fetch_tasks.append(fetch_rag_node(state))

    if fetch_tasks:
        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, dict):
                state.update(r)

    # Determine source tag
    source = "agrinexa"
    if "weather" in intents and len(intents) == 1:
        source = "weather"
    elif "market" in intents and len(intents) == 1:
        source = "market"
    elif "rag" in intents and len(intents) == 1:
        source = "rag"

    chat_llm = get_langchain_chat_model(temperature=0.25)
    full_text = ""

    if chat_llm:
        crop = state.get("crop")
        crop_stage = state.get("crop_stage")
        location = state.get("location")
        profile = state.get("farmer_profile") or {}
        weather_data = state.get("weather_data")
        market_data = state.get("market_data")
        rag_context = state.get("rag_context")

        system_instruction = (
            f"{FARMER_ASSISTANT_SYSTEM_PROMPT}\n\n"
            f"CRITICAL: The farmer prefers the response in language: '{language}'. "
            f"If the language is not English (e.g., Tamil, Hindi, Telugu), translate and output fluent, natural phrasing in that language. "
            f"Format response with clean Markdown: use headers (##), bold text, bullet points, checklists, and formatted tables for multi-step schedules. "
            f"Keep advice practical, step-by-step, actionable, and emphasize safety, dosage, and irrigation timing."
        )

        context_blocks = []
        if crop:
            context_blocks.append(f"- Focused Crop: {crop} (Stage: {crop_stage or 'Active'})")
        if location:
            context_blocks.append(f"- Farmer Location: {location}")
        if profile.get("nitrogen") or profile.get("ph"):
            context_blocks.append(
                f"- Soil Parameters: N={profile.get('nitrogen')}, P={profile.get('phosphorus')}, K={profile.get('potassium')}, pH={profile.get('ph')}"
            )
        if weather_data:
            summary = weather_data.get("summary") or weather_data.get("description") or "Normal weather"
            temp = weather_data.get("temperature", "")
            rain_prob = weather_data.get("rain_probability", "")
            context_blocks.append(f"- Weather Insight: {summary}, Temp: {temp}°C, Rain chance: {rain_prob}%")
        if market_data:
            price = market_data.get("current_price") or market_data.get("modal_price")
            trend = market_data.get("trend") or "Stable"
            context_blocks.append(f"- Mandi Market: Current price ₹{price}/quintal, Trend: {trend}")
        if rag_context:
            context_blocks.append(f"- Agronomic Knowledge Findings:\n{rag_context}")

        context_str = "\n".join(context_blocks) if context_blocks else "Standard agronomic practices."
        user_prompt = (
            f"Farmer Question: {query}\n\n"
            f"Available Farm & Real-Time Context:\n{context_str}\n\n"
            "Please provide a complete, direct, and structured agricultural recommendation for the farmer."
        )

        try:
            async for chunk in chat_llm.astream([
                SystemMessage(content=system_instruction),
                HumanMessage(content=user_prompt),
            ]):
                token = str(chunk.content or "")
                if token:
                    full_text += token
                    yield {"type": "token", "token": token}
        except Exception as e:
            logger.warning(f"Streaming token error: {e}")

    # Fallback if no tokens streamed
    if not full_text:
        synth = await synthesize_advisory_node(state)
        full_text = synth.get("answer", "Here are your farming recommendations.")
        yield {"type": "token", "token": full_text}

    yield {
        "type": "done",
        "full_text": full_text,
        "source": source,
        "crop": state.get("crop"),
        "location": state.get("location"),
        "weather_data": state.get("weather_data"),
        "market_data": state.get("market_data"),
    }

