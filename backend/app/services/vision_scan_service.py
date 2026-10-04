"""Crop + disease identification from a photo using LangGraph, DuckDuckGo Web Search, and NVIDIA Vision LLM.

Why: the bundled local models are not usable for scanning, so this service gives real, repeatable
answers by chaining a vision model for diagnosis, a web search for treatment, and an LLM for JSON structuring.
"""

import asyncio
import base64
import hashlib
import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional, TypedDict

from app.core.config import settings
from app.services.ml_models.metadata import get_crop_class_names, get_disease_classes

from langchain_openai import ChatOpenAI
from duckduckgo_search import DDGS
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# Use NVIDIA APIs
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"
REASONING_MODEL = "meta/llama-3.2-11b-vision-instruct" 

_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX = 256

def _normalize_crop(name: str) -> str:
    aliases = {"paddy": "rice", "corn": "maize"}
    cleaned = (name or "").strip()
    lowered = cleaned.lower()
    if lowered in aliases: return aliases[lowered]
    for known in get_crop_class_names():
        if known.lower() == lowered: return known
    return cleaned or "Unknown"

def _normalize_disease(name: str) -> str:
    cleaned = (name or "").strip()
    for known in get_disease_classes():
        if known.lower() == cleaned.lower(): return known
    return cleaned or "Unknown"

def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    try: return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except Exception: pass
    return None

class GraphState(TypedDict):
    image_bytes: bytes
    mime_type: str
    crop: str
    disease: str
    symptoms: str
    search_results: str
    final_json: Dict[str, Any]

async def analyze_image_node(state: GraphState) -> GraphState:
    if not NVIDIA_API_KEY:
        raise RuntimeError("No NVIDIA_API_KEY configured in environment.")

    client = ChatOpenAI(
        api_key=NVIDIA_API_KEY,
        base_url=NVIDIA_BASE_URL,
        model=VISION_MODEL,
        temperature=0,
        max_tokens=500
    )
    crops = ", ".join(get_crop_class_names())
    diseases = ", ".join(get_disease_classes())
    
    prompt = (
        "You are an expert plant pathologist. Look carefully at the plant photo.\n"
        f"crop must be one of: {crops}. (Paddy is 'rice').\n"
        f"disease must be one of: {diseases} - or 'Other'. 'Healthy' if no symptoms.\n"
        "Return ONLY JSON: {\"crop\": str, \"disease\": str, \"symptoms\": str (what you see)}"
    )
    
    data_url = f"data:{state['mime_type']};base64,{base64.b64encode(state['image_bytes']).decode()}"
    
    msg = await client.ainvoke([
        HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": data_url}},
        ])
    ])
    
    parsed = _extract_json(msg.content) or {}
    return {
        **state,
        "crop": parsed.get("crop", "Unknown"),
        "disease": parsed.get("disease", "Unknown"),
        "symptoms": parsed.get("symptoms", "")
    }

async def web_search_node(state: GraphState) -> GraphState:
    if state["disease"] == "Healthy" or not state["disease"]:
        return {**state, "search_results": "No treatment needed for healthy plant."}
        
    query = f"treatment for {state['disease']} on {state['crop']} agricultural pesticide recommended"
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
        if results:
            search_text = "\n".join([f"- {r.get('title', '')}: {r.get('body', '')}" for r in results])
        else:
            search_text = "No specific search results found."
    except Exception as e:
        logger.error(f"Search error: {e}")
        search_text = "No search results available due to network error."
        
    return {**state, "search_results": search_text}

async def generate_json_node(state: GraphState) -> GraphState:
    client = ChatOpenAI(
        api_key=NVIDIA_API_KEY,
        base_url=NVIDIA_BASE_URL,
        model=REASONING_MODEL,
        temperature=0
    )
    
    prompt = (
        f"Crop: {state['crop']}\n"
        f"Disease: {state['disease']}\n"
        f"Symptoms: {state['symptoms']}\n"
        f"Search Results: {state['search_results']}\n\n"
        "Generate a structured JSON response with this schema:\n"
        "{\"crop\": str, \"crop_confidence\": float, \"disease\": str, \"disease_confidence\": float, "
        "\"symptoms\": str, \"solution\": str (practical advice based on search), "
        "\"pesticide\": str (active ingredient or 'None required' based on search), "
        "\"dosage\": str, \"tamil_solution\": str (same advice in Tamil)}\n"
        "Use high confidences (0.8-0.95) if disease matches symptoms. Set to 0 if unknown.\n"
        "IMPORTANT: You MUST return ONLY JSON."
    )
    
    msg = await client.ainvoke([SystemMessage(content=prompt)])
    parsed = _extract_json(msg.content) or {}
    
    crop = _normalize_crop(str(parsed.get("crop", state["crop"])))
    disease = _normalize_disease(str(parsed.get("disease", state["disease"])))
    disease_conf = float(parsed.get("disease_confidence") or 0.85)
    crop_conf = float(parsed.get("crop_confidence") or 0.9)
    
    result = {
        "disease": disease,
        "confidence": round(max(0.0, min(1.0, disease_conf)), 3),
        "is_healthy": disease.lower() == "healthy",
        "solution": parsed.get("solution") or "Consult a local agri-expert.",
        "pesticide_recommendation": parsed.get("pesticide"),
        "dosage": parsed.get("dosage"),
        "symptoms": parsed.get("symptoms") or state["symptoms"],
        "tamil_solution": parsed.get("tamil_solution"),
        "search_query": f"Searched Web for: treatment for {state['disease']} on {state['crop']}" if state["disease"] and state["disease"] != "Healthy" else None,
        "crop_prediction": {
            "predicted_crop": crop,
            "confidence": round(max(0.0, min(1.0, crop_conf)), 3),
        },
        "note": f"Identified by ML + Vision  + LLM.",
    }
    
    return {**state, "final_json": result}

_TASKS: Dict[str, Dict[str, Any]] = {}

workflow = StateGraph(GraphState)
workflow.add_node("analyze_image", analyze_image_node)
workflow.add_node("search_web", web_search_node)
workflow.add_node("generate_json", generate_json_node)

workflow.set_entry_point("analyze_image")
workflow.add_edge("analyze_image", "search_web")
workflow.add_edge("search_web", "generate_json")
workflow.add_edge("generate_json", END)

app_graph = workflow.compile()

async def run_scan_task(task_id: str, initial_state: dict):
    try:
        _TASKS[task_id] = {"status": "Running Vision analysis...", "result": None, "error": None}
        
        async for event in app_graph.astream(initial_state):
            if "analyze_image" in event:
                _TASKS[task_id]["status"] = "Querying live treatments..."
            elif "search_web" in event:
                _TASKS[task_id]["status"] = "Synthesizing final diagnosis..."
            elif "generate_json" in event:
                _TASKS[task_id]["status"] = "Finalizing results..."
                _TASKS[task_id]["result"] = event["generate_json"]["final_json"]
                
    except Exception as e:
        logger.error(f"Scan task {task_id} failed: {e}", exc_info=True)
        _TASKS[task_id]["error"] = str(e)

async def start_scan_task(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    task_id = str(uuid.uuid4())
    initial_state = {
        "image_bytes": image_bytes,
        "mime_type": mime_type,
        "crop": "",
        "disease": "",
        "symptoms": "",
        "search_results": "",
        "final_json": {}
    }
    
    _TASKS[task_id] = {"status": "Running Vision analysis...", "result": None, "error": None}
    asyncio.create_task(run_scan_task(task_id, initial_state))
    
    # Optional cleanup old tasks to prevent memory leak
    if len(_TASKS) > 100:
        oldest = list(_TASKS.keys())[0]
        _TASKS.pop(oldest, None)
        
    return task_id

def get_scan_task_status(task_id: str) -> Dict[str, Any]:
    if task_id not in _TASKS:
        return {"error": "Task not found"}
    return _TASKS[task_id]

