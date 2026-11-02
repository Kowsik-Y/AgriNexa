from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.llm.client import OpenAIClient
from app.services.ml_models.crop_recommender import recommend_crops
from app.services.ml_models.yield_predictor import predict_crop_yield

logger = logging.getLogger(__name__)


class GenAIAgriIntelligence:
    """GenAI LLM service for agricultural crop recommendation and yield prediction."""

    def __init__(self) -> None:
        self.llm_client = OpenAIClient()

    async def generate_crop_recommendation_report(
        self,
        n: float,
        p: float,
        k: float,
        ph: float,
        temp: Optional[float] = None,
        humidity: Optional[float] = None,
        rainfall: Optional[float] = None,
        location: Optional[str] = None,
        season: Optional[str] = None,
        language: str = "English",
    ) -> Dict[str, Any]:
        """Runs ML crop recommendation and generates a GenAI agronomic report."""
        ranked_crops = recommend_crops(
            n=n, p=p, k=k, ph=ph,
            temp=temp, humidity=humidity, rainfall=rainfall,
            season=season, top_k=3,
        )

        top_crop = ranked_crops[0]["crop"] if ranked_crops else "Rice"
        top_score = ranked_crops[0]["score"] if ranked_crops else 85.0

        ai_summary = ""
        if self.llm_client.is_configured:
            system_prompt = (
                "You are an expert Chief Agronomist and Soil Scientist for Indian agriculture.\n"
                f"The farmer prefers responses in language: '{language}'. "
                "Provide a direct, practical, and highly actionable analysis based on soil test parameters and ML predictions.\n"
                "Cover:\n"
                "1. Why the top crop is ideal for this specific soil N-P-K and pH.\n"
                "2. Specific recommended high-yielding seed varieties for Indian conditions.\n"
                "3. Fertilizer schedule (basal dose vs split top dressings) to correct deficits.\n"
                "4. Critical irrigation stages and pest cautions.\n"
                "Keep formatting clean with bullet points. Tone should be encouraging and professional."
            )

            crops_summary = "\n".join(
                f"- #{i+1} {c['crop']} ({c['tamil_name']}): {c['score']}% match, {c['suitability']}. Soil notes: {', '.join(c['nutrient_notes'])}"
                for i, c in enumerate(ranked_crops)
            )

            user_prompt = (
                f"Soil Test Results: N={n} kg/ha, P={p} kg/ha, K={k} kg/ha, pH={ph}\n"
                f"Environment: Location={location or 'Tamil Nadu / South India'}, Season={season or 'Current Season'}, "
                f"Temp={temp or 26}°C, Humidity={humidity or 65}%, Rainfall={rainfall or 90}mm\n\n"
                f"Machine Learning Ranked Crops:\n{crops_summary}\n\n"
                f"Please generate the complete Agronomic Recommendation Report in {language}."
            )

            try:
                ai_summary = await self.llm_client.complete(
                    user_prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=700,
                )
            except Exception as e:
                logger.warning(f"GenAI crop recommendation report failed: {e}")

        if not ai_summary:
            ai_summary = (
                f"Based on your soil test (N: {n}, P: {p}, K: {k}, pH: {ph}), "
                f"**{top_crop}** is your #1 recommended crop with a {top_score}% match. "
                f"Ensure balanced application of basal nutrients, maintain proper drainage, and select certified hybrid seeds for maximum productivity."
            )

        return {
            "status": "success",
            "soil_input": {"n": n, "p": p, "k": k, "ph": ph},
            "environment_input": {"temperature": temp, "humidity": humidity, "rainfall": rainfall, "location": location, "season": season},
            "top_crop": top_crop,
            "top_score": top_score,
            "recommendations": ranked_crops,
            "ai_agronomist_report": ai_summary,
            "language": language,
        }

    async def generate_yield_prediction_report(
        self,
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
        """Runs ML yield prediction and generates a GenAI yield enhancement plan."""
        ml_prediction = predict_crop_yield(
            crop_name=crop,
            area=area,
            area_unit=area_unit,
            season=season,
            soil_type=soil_type,
            irrigation_type=irrigation_type,
            fertilizer_level=fertilizer_level,
        )

        ai_plan = ""
        if self.llm_client.is_configured:
            system_prompt = (
                "You are an agricultural economist and crop production specialist.\n"
                f"The farmer prefers responses in language: '{language}'. "
                "Provide a structured, data-driven Yield Optimization Plan.\n"
                "Cover:\n"
                "1. Expected yield analysis compared to regional benchmarks.\n"
                "2. 3 essential practices to reach the maximum potential yield range.\n"
                "3. Revenue enhancement: harvesting at optimal moisture and storage advice.\n"
                "4. Major climate/pest risks during the growth cycle.\n"
                "Keep bullet points concise, practical, and farmer-friendly."
            )

            user_prompt = (
                f"Farm Parameters:\n"
                f"- Crop: {ml_prediction['crop']}\n"
                f"- Land Area: {area} {area_unit} ({ml_prediction['calculated_acres']} acres)\n"
                f"- Season: {season or 'Kharif/Rabi'}\n"
                f"- Soil: {soil_type or 'Loam'}\n"
                f"- Irrigation: {irrigation_type or 'Standard'}\n"
                f"- Location: {location or 'India'}\n\n"
                f"ML Yield Projections:\n"
                f"- Expected Yield per Acre: {ml_prediction['yield_per_acre']['expected_quintals']} Quintals "
                f"(Range: {ml_prediction['yield_per_acre']['min_quintals']} - {ml_prediction['yield_per_acre']['max_quintals']} Q)\n"
                f"- Total Expected Production: {ml_prediction['total_production']['expected_quintals']} Quintals\n"
                f"- Expected Gross Market Revenue: {ml_prediction['financial_forecast']['formatted_revenue']} "
                f"(Range: {ml_prediction['financial_forecast']['revenue_range_inr']})\n\n"
                f"Please generate the Yield Enhancement & Risk Mitigation Plan in {language}."
            )

            try:
                ai_plan = await self.llm_client.complete(
                    user_prompt=user_prompt,
                    system_prompt=system_prompt,
                    max_tokens=650,
                )
            except Exception as e:
                logger.warning(f"GenAI yield prediction plan failed: {e}")

        if not ai_plan:
            total_q = ml_prediction['total_production']['expected_quintals']
            rev = ml_prediction['financial_forecast']['formatted_revenue']
            ai_plan = (
                f"For your {area} {area_unit} of {ml_prediction['crop']}, estimated harvest is **{total_q} Quintals**, "
                f"generating a projected gross revenue of **{rev}**. "
                f"To reach the upper yield boundary, ensure timely irrigation at flowering and apply micronutrients (Zinc/Boron) at 35-45 days."
            )

        ml_prediction["ai_yield_plan"] = ai_plan
        ml_prediction["language"] = language
        ml_prediction["status"] = "success"
        return ml_prediction


_genai_agri_intel: Optional[GenAIAgriIntelligence] = None


def get_genai_agri_intelligence() -> GenAIAgriIntelligence:
    global _genai_agri_intel
    if _genai_agri_intel is None:
        _genai_agri_intel = GenAIAgriIntelligence()
    return _genai_agri_intel
