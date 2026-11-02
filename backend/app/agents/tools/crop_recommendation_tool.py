from __future__ import annotations

from typing import Any, Dict, Optional
from app.services.ml_models.crop_recommender import recommend_crops
from app.services.llm_agri_tools import get_genai_agri_intelligence


async def run_crop_recommendation_tool(
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    ph: float,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    rainfall: Optional[float] = None,
    season: Optional[str] = None,
    location: Optional[str] = None,
    language: str = "English",
) -> Dict[str, Any]:
    """
    Agricultural Tool: Recommends the top 3 crops based on soil N-P-K, pH, and climate,
    complete with an AI-generated agronomic analysis and planting guidance.
    """
    intel = get_genai_agri_intelligence()
    return await intel.generate_crop_recommendation_report(
        n=nitrogen,
        p=phosphorus,
        k=potassium,
        ph=ph,
        temp=temperature,
        humidity=humidity,
        rainfall=rainfall,
        season=season,
        location=location,
        language=language,
    )
