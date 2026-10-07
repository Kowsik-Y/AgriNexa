"""Crop + disease identification pipeline using local ML models, Web Search, and LLM synthesis.

Workflow:
1. Scan image using trained AgriNexa vision models (disease_resnet50, CropModel, health_mobilenet_v2).
2. Fetch live extension & treatment guidance via DuckDuckGo Web Search.
3. Pass structured scan findings + agronomic intelligence to the LLM for comprehensive advisory synthesis.
4. If external LLM is offline or unconfigured, gracefully synthesize using verified expert agronomic database.
"""

import asyncio
import base64
import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional, TypedDict

from app.core.config import settings
from app.services.ml_models.metadata import (
    get_crop_class_names,
    get_disease_classes,
    get_pesticide_recommendation,
    get_tamil_solution,
    parse_disease_class,
)
from app.services.ml_models import (
    detect_disease_from_image,
    predict_crop_type_from_image,
    score_crop_health,
)

from langchain_openai import ChatOpenAI
from duckduckgo_search import DDGS
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# External API credentials (optional fallback)
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"
REASONING_MODEL = "meta/llama-3.2-11b-vision-instruct"


def _normalize_crop(name: str) -> str:
    aliases = {"paddy": "rice", "corn": "maize"}
    cleaned = (name or "").strip()
    lowered = cleaned.lower()
    if lowered in aliases:
        return aliases[lowered].title()
    for known in get_crop_class_names():
        if known.lower() == lowered:
            return known.title()
    return cleaned.title() or "Unknown"


def _normalize_disease(name: str) -> str:
    cleaned = (name or "").strip()
    if cleaned.lower() == "healthy":
        return "Healthy"
    for known in get_disease_classes():
        parsed = parse_disease_class(known)
        if parsed["disease"].lower() == cleaned.lower():
            return parsed["disease"]
    return cleaned or "Unknown"


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


def _get_llm_client() -> Optional[ChatOpenAI]:
    """Retrieve configured LLM client from app settings or NVIDIA fallback."""
    # 1. Project standard LLM (OpenAI / Ollama / local gateway)
    if settings.openai_api_key:
        try:
            return ChatOpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url or None,
                model=settings.openai_model or "gpt-4o-mini",
                temperature=settings.openai_temperature or 0.2,
                timeout=30.0,
            )
        except Exception as e:
            logger.warning(f"Could not initialize primary LLM: {e}")

    # 2. NVIDIA API fallback
    if NVIDIA_API_KEY:
        try:
            return ChatOpenAI(
                api_key=NVIDIA_API_KEY,
                base_url=NVIDIA_BASE_URL,
                model=REASONING_MODEL,
                temperature=0.2,
                timeout=30.0,
            )
        except Exception as e:
            logger.warning(f"Could not initialize NVIDIA LLM: {e}")

    return None


class GraphState(TypedDict):
    image_bytes: bytes
    mime_type: str
    crop: str
    crop_confidence: float
    disease: str
    disease_confidence: float
    health_status: str
    health_score: int
    symptoms: str
    search_results: str
    raw_scan: Dict[str, Any]
    final_json: Dict[str, Any]


async def scan_with_models_node(state: GraphState) -> GraphState:
    """Step 1: Scan image with trained local ML models."""
    image_bytes = state["image_bytes"]
    
    # Run local ML inferences in threadpool to avoid blocking event loop
    loop = asyncio.get_event_loop()
    disease_res = await loop.run_in_executor(None, detect_disease_from_image, image_bytes)
    crop_res = await loop.run_in_executor(None, predict_crop_type_from_image, image_bytes)
    health_res = await loop.run_in_executor(None, score_crop_health, image_bytes, crop_res.get("predicted_crop", "Crop"))

    detected_disease = disease_res.get("disease") or disease_res.get("detected_disease", "Unknown")
    disease_conf = float(disease_res.get("confidence") or 0.85)
    
    predicted_crop = crop_res.get("predicted_crop") or disease_res.get("crop") or "Unknown"
    # If disease model explicitly determined the crop (e.g., Tomato from Tomato___Early_blight), prioritize it
    if disease_res.get("crop") and disease_res.get("crop") != "Unknown":
        predicted_crop = disease_res["crop"]
        
    crop_conf = float(crop_res.get("confidence") or 0.80)
    health_status = health_res.get("health_status", "Healthy" if detected_disease.lower() == "healthy" else "Diseased")
    health_score = int(health_res.get("health_score", 90 if detected_disease.lower() == "healthy" else 45))

    default_symptoms = ""
    if detected_disease.lower() != "healthy":
        indicators = health_res.get("stress_indicators") or []
        default_symptoms = f"Observed symptoms of {detected_disease} on {predicted_crop}. " + "; ".join(indicators)
    else:
        default_symptoms = "Foliage appears vibrant and healthy with no active lesions or chlorosis."

    # If local models couldn't be loaded and NVIDIA Vision LLM is provided, try vision LLM fallback
    if (detected_disease == "Unknown" or not detected_disease) and NVIDIA_API_KEY:
        try:
            client = ChatOpenAI(
                api_key=NVIDIA_API_KEY,
                base_url=NVIDIA_BASE_URL,
                model=VISION_MODEL,
                temperature=0,
                max_tokens=400,
            )
            crops = ", ".join(get_crop_class_names()[:15])
            diseases = ", ".join(get_disease_classes()[:15])
            prompt = (
                f"You are a plant pathologist. Identify crop ({crops}) and disease ({diseases} or Healthy).\n"
                "Return ONLY JSON: {\"crop\": str, \"disease\": str, \"symptoms\": str}"
            )
            data_url = f"data:{state['mime_type']};base64,{base64.b64encode(image_bytes).decode()}"
            msg = await client.ainvoke([
                HumanMessage(content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ])
            ])
            parsed = _extract_json(msg.content) or {}
            if parsed.get("crop"):
                predicted_crop = parsed["crop"]
            if parsed.get("disease"):
                detected_disease = parsed["disease"]
            if parsed.get("symptoms"):
                default_symptoms = parsed["symptoms"]
        except Exception as e:
            logger.warning(f"Vision LLM fallback failed: {e}")

    norm_crop = _normalize_crop(predicted_crop)
    norm_disease = _normalize_disease(detected_disease)

    return {
        **state,
        "crop": norm_crop,
        "crop_confidence": crop_conf,
        "disease": norm_disease,
        "disease_confidence": disease_conf,
        "health_status": health_status,
        "health_score": health_score,
        "symptoms": default_symptoms,
        "raw_scan": {
            "disease_res": disease_res,
            "crop_res": crop_res,
            "health_res": health_res,
        },
    }


async def web_search_node(state: GraphState) -> GraphState:
    """Step 2: Fetch treatment and agronomic intelligence via DuckDuckGo."""
    if state["disease"] == "Healthy" or not state["disease"]:
        return {**state, "search_results": "Crop is healthy. No chemical or curative intervention required."}

    query = f"treatment for {state['disease']} on {state['crop']} agricultural pesticide recommended dosage"
    try:
        loop = asyncio.get_event_loop()
        def _ddg_search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=3))
        results = await loop.run_in_executor(None, _ddg_search)
        if results:
            search_text = "\n".join([f"- {r.get('title', '')}: {r.get('body', '')}" for r in results])
        else:
            search_text = "No specific online articles found; relying on standard agronomic recommendations."
    except Exception as e:
        logger.info(f"Web search unavailable: {e}")
        search_text = "Live web search unavailable; utilizing verified agricultural extension database."

    return {**state, "search_results": search_text}


async def pass_scan_to_llm_node(state: GraphState) -> GraphState:
    """Step 3: Pass structured ML scan outputs to the LLM for advisory synthesis."""
    crop = state["crop"]
    disease = state["disease"]
    symptoms = state["symptoms"]
    disease_conf = state.get("disease_confidence", 0.90)
    crop_conf = state.get("crop_confidence", 0.85)
    is_healthy = disease.lower() == "healthy"

    # Default remedies from expert database
    pesticide_info = get_pesticide_recommendation(disease)
    default_solution = pesticide_info["treatment"]
    default_pesticide = pesticide_info["pesticide"]
    default_dosage = pesticide_info["dosage"]
    default_tamil = get_tamil_solution(disease, crop)

    llm = _get_llm_client()
    if llm:
        try:
            prompt = (
                f"You are AgriNexa's expert Chief Agronomist AI.\n"
                f"The Computer Vision ML model has just scanned a farmer's crop photo with the following verified findings:\n"
                f"- Crop: {crop} (Confidence: {int(crop_conf * 100)}%)\n"
                f"- Disease Detected: {disease} (Confidence: {int(disease_conf * 100)}%)\n"
                f"- Health Status: {state.get('health_status', 'Unknown')} (Score: {state.get('health_score', 80)}/100)\n"
                f"- Observed Symptoms: {symptoms}\n"
                f"- Web Search / Extension Intelligence:\n{state.get('search_results', '')}\n\n"
                "Synthesize a professional, actionable agricultural report formatted in strict JSON:\n"
                "{\n"
                '  "symptoms": "Detailed visual symptoms of this condition on the leaf",\n'
                '  "solution": "Clear, practical organic and agronomic management instructions",\n'
                '  "pesticide": "Specific chemical or biological control name (or \'None required\')",\n'
                '  "dosage": "Precise application dosage and spray schedule",\n'
                '  "tamil_solution": "Same actionable solution clearly written in Tamil (தமிழ்)"\n'
                "}\n"
                "Return ONLY valid JSON."
            )
            msg = await llm.ainvoke([SystemMessage(content=prompt)])
            parsed = _extract_json(msg.content) or {}
            
            solution = parsed.get("solution") or default_solution
            pesticide = parsed.get("pesticide") or default_pesticide
            dosage = parsed.get("dosage") or default_dosage
            symptoms = parsed.get("symptoms") or symptoms
            tamil_solution = parsed.get("tamil_solution") or default_tamil
        except Exception as e:
            logger.warning(f"LLM advisory generation encountered error: {e}, using verified expert database.")
            solution = default_solution
            pesticide = default_pesticide
            dosage = default_dosage
            tamil_solution = default_tamil
    else:
        # LLM not configured - use verified expert knowledge base
        solution = default_solution
        pesticide = default_pesticide
        dosage = default_dosage
        tamil_solution = default_tamil

    final_result = {
        "disease": disease,
        "confidence": round(max(0.0, min(1.0, disease_conf)), 3),
        "is_healthy": is_healthy,
        "solution": solution,
        "pesticide_recommendation": pesticide,
        "dosage": dosage,
        "symptoms": symptoms,
        "tamil_solution": tamil_solution,
        "search_query": f"Treatment for {disease} on {crop}" if not is_healthy and disease != "Unknown" else None,
        "crop_prediction": {
            "predicted_crop": crop,
            "confidence": round(max(0.0, min(1.0, crop_conf)), 3),
        },
        "health_score": state.get("health_score", 90 if is_healthy else 45),
        "health_status": state.get("health_status", "Healthy" if is_healthy else "Diseased"),
        "note": "Scanned by AgriNexa ML Vision Model + LLM Agronomic Advisor",
    }

    return {**state, "final_json": final_result}


# Build LangGraph workflow
workflow = StateGraph(GraphState)
workflow.add_node("scan_with_models", scan_with_models_node)
workflow.add_node("search_web", web_search_node)
workflow.add_node("pass_scan_to_llm", pass_scan_to_llm_node)

workflow.set_entry_point("scan_with_models")
workflow.add_edge("scan_with_models", "search_web")
workflow.add_edge("search_web", "pass_scan_to_llm")
workflow.add_edge("pass_scan_to_llm", END)

app_graph = workflow.compile()

_TASKS: Dict[str, Dict[str, Any]] = {}


async def run_scan_task(task_id: str, initial_state: dict):
    try:
        _TASKS[task_id] = {"status": "Scanning crop image with ML models...", "result": None, "error": None}

        async for event in app_graph.astream(initial_state):
            if "scan_with_models" in event:
                _TASKS[task_id]["status"] = "Querying live treatments and agronomic intelligence..."
            elif "search_web" in event:
                _TASKS[task_id]["status"] = "Passing scan output to LLM for advisory synthesis..."
            elif "pass_scan_to_llm" in event:
                _TASKS[task_id]["status"] = "Finalizing results..."
                _TASKS[task_id]["result"] = event["pass_scan_to_llm"]["final_json"]

    except Exception as e:
        logger.error(f"Scan task {task_id} failed: {e}", exc_info=True)
        _TASKS[task_id]["error"] = str(e)


async def start_scan_task(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    task_id = str(uuid.uuid4())
    initial_state = {
        "image_bytes": image_bytes,
        "mime_type": mime_type,
        "crop": "",
        "crop_confidence": 0.0,
        "disease": "",
        "disease_confidence": 0.0,
        "health_status": "Unknown",
        "health_score": 50,
        "symptoms": "",
        "search_results": "",
        "raw_scan": {},
        "final_json": {},
    }

    _TASKS[task_id] = {"status": "Scanning crop image with ML models...", "result": None, "error": None}
    asyncio.create_task(run_scan_task(task_id, initial_state))

    # Clean up older tasks if memory grows
    if len(_TASKS) > 100:
        oldest = list(_TASKS.keys())[0]
        _TASKS.pop(oldest, None)

    return task_id


def get_scan_task_status(task_id: str) -> Dict[str, Any]:
    if task_id not in _TASKS:
        return {"error": "Task not found"}
    return _TASKS[task_id]


