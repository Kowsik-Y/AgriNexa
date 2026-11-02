from __future__ import annotations

from typing import Any, Dict, Optional
from app.services.ml_models.yield_predictor import predict_crop_yield
from app.services.llm_agri_tools import get_genai_agri_intelligence


async def run_yield_prediction_tool(
    crop: str,
    area: float,
    area_unit: str = "acres",
    season: Optional[str] = None,
    soil_type: Optional[str] = None,
    irrigation_type: Optional[str] = None,
    fertilizer_level: Optional[str] = None,
    location: Optional[str] = None,
    language: str = "English",
) -> Dict[str, Any]:
    """
    Agricultural Tool: Predicts crop harvest yield (quintals) and gross market revenue,
    paired with an AI-generated yield enhancement and risk mitigation plan.
    """
    intel = get_genai_agri_intelligence()
    return await intel.generate_yield_prediction_report(
        crop=crop,
        area=area,
        area_unit=area_unit,
        season=season,
        soil_type=soil_type,
        irrigation_type=irrigation_type,
        fertilizer_level=fertilizer_level,
        location=location,
        language=language,
    )
