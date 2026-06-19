import json
import importlib
import logging
from datetime import datetime
from typing import Any, List, Optional

from .models import FarmerContext, Recommendation, RecommendationSet

logger = logging.getLogger(__name__)


class RecommendationService:
    """Unified recommendation engine combining ML models, RAG, and farmer context."""

    def __init__(self, model_dir: str = "./models"):
        self.model_dir = model_dir
        self.rag_retriever = None
        self.disease_model = None
        self.pest_model = None
        self.yield_model = None
        self._initialize_components()

    def _initialize_components(self):
        try:
            logger.info("Initializing recommendation service components...")

            try:
                rag_module = importlib.import_module("app.rag.retriever")
                rag_retriever_cls = getattr(rag_module, "RAGRetriever", None)
                if rag_retriever_cls is not None:
                    self.rag_retriever = rag_retriever_cls()
                    logger.info("RAG retriever initialized")
                else:
                    logger.warning("RAGRetriever class not available in app.rag.retriever")
            except Exception as e:
                logger.warning(f"RAG initialization failed: {e}. Recommendations will use ML only.")

            try:
                trainer_module = importlib.import_module("backend.ml_training.model_trainer")
                disease_cls = getattr(trainer_module, "DiseaseDetectionTrainer", None)
                pest_cls = getattr(trainer_module, "PestDetectionTrainer", None)
                yield_cls = getattr(trainer_module, "YieldPredictionTrainer", None)

                if disease_cls and pest_cls and yield_cls:
                    self.disease_model = disease_cls(self.model_dir)
                    self.disease_model.load_model()

                    self.pest_model = pest_cls(self.model_dir)
                    self.pest_model.load_model()

                    self.yield_model = yield_cls(self.model_dir)
                    self.yield_model.load_model()

                    logger.info("ML trainer models loaded")
                else:
                    logger.warning("Trainer classes missing; recommendation service running with rule-based logic")
            except Exception as e:
                logger.warning(f"ML trainer initialization skipped: {e}")

        except Exception as e:
            logger.error(f"Error initializing components: {e}")

    def get_fertilizer_recommendation(self, context: FarmerContext) -> Recommendation:
        logger.info(f"Generating fertilizer recommendation for {context.crop} in {context.location}")

        rag_sources = []
        if self.rag_retriever:
            try:
                rag_docs = self.rag_retriever.get_fertilizer_recommendations(
                    crop=context.crop,
                    soil_type=context.soil_type,
                    current_soil_test=context.soil_data,
                )
                rag_sources = [doc.metadata.get("source", "Knowledge Base") for doc in rag_docs]
            except Exception as e:
                logger.warning(f"Error getting RAG fertilizer guidance: {e}")

        nitrogen = context.soil_data.get("nitrogen", 0)
        phosphorus = context.soil_data.get("phosphorus", 0)
        potassium = context.soil_data.get("potassium", 0)

        deficiencies = []
        if nitrogen < 150:
            deficiencies.append("nitrogen")
        if phosphorus < 25:
            deficiencies.append("phosphorus")
        if potassium < 150:
            deficiencies.append("potassium")

        if not deficiencies:
            action = f"Maintain current nutrient levels for {context.crop}"
            details = (
                f"Soil has adequate nitrogen ({nitrogen} ppm), phosphorus ({phosphorus} ppm), "
                f"and potassium ({potassium} ppm)"
            )
            impact = "Optimal crop nutrition"
            confidence = 0.85
        else:
            action = f"Apply fertilizer to address {', '.join(deficiencies)} deficiency"
            details = f"Based on soil analysis: N={nitrogen} ppm, P={phosphorus} ppm, K={potassium} ppm. "
            details += f"Recommended NPK ratio: {self._get_npk_ratio(context.crop)}"
            impact = f"20-30% yield increase by fixing {len(deficiencies)} deficiency/deficiencies"
            confidence = 0.9

        crop_stages = {
            "rice": ["planting", "tillering", "panicle_initiation"],
            "cotton": ["planting", "square_formation", "flowering"],
            "wheat": ["sowing", "tillering", "boot_stage"],
        }

        stages = crop_stages.get(context.crop, ["planting", "vegetative_growth"])
        next_stage = stages[0] if not context.current_crop_stage else stages[-1]
        timing = f"Apply at {next_stage} stage"

        return Recommendation(
            recommendation_type="fertilizer",
            action=action,
            details=details,
            timing=timing,
            expected_impact=impact,
            confidence_score=confidence,
            data_sources=["Soil test", "Crop database"],
            rag_sources=rag_sources,
            cost_estimate="2000-5000 INR per hectare depending on fertilizer type",
            alternatives=self._get_fertilizer_alternatives(deficiencies),
        )

    def get_irrigation_recommendation(self, context: FarmerContext) -> Recommendation:
        logger.info(f"Generating irrigation recommendation for {context.crop}")

        rag_sources = []
        if self.rag_retriever:
            try:
                rag_docs = self.rag_retriever.get_water_management_guide(
                    crop=context.crop,
                    irrigation_type=context.irrigation_type or "drip",
                    season=context.season,
                )
                rag_sources = [doc.metadata.get("source", "Knowledge Base") for doc in rag_docs]
            except Exception as e:
                logger.warning(f"Error getting RAG irrigation guidance: {e}")

        rainfall = context.weather_data.get("rainfall", 0)
        humidity = context.weather_data.get("humidity", 50)
        temperature = context.weather_data.get("temperature", 25)

        etc = temperature * humidity / 100
        water_needed = max(0, etc - rainfall)

        if water_needed < 10:
            action = "No irrigation needed"
            details = "Recent rainfall sufficient for crop water needs"
            impact = "Water conservation, reduced cost"
            confidence = 0.95
        else:
            irrigation_amount = f"{water_needed:.1f} mm"
            action = f"Irrigate with {irrigation_amount} water"
            details = f"Based on: Temperature={temperature}°C, Humidity={humidity}%, Recent rainfall={rainfall}mm"
            impact = "Optimal crop water availability, 15-20% yield improvement"
            confidence = 0.88

        return Recommendation(
            recommendation_type="irrigation",
            action=action,
            details=details,
            timing="Within next 3-5 days if not watered",
            expected_impact=impact,
            confidence_score=confidence,
            data_sources=["Weather data", "Soil moisture"],
            rag_sources=rag_sources,
            cost_estimate="500-1500 INR per hectare depending on irrigation method",
        )

    def get_disease_prevention(self, context: FarmerContext) -> Recommendation:
        logger.info(f"Generating disease prevention for {context.crop}")

        rag_sources = []
        if self.rag_retriever:
            try:
                rag_docs = self.rag_retriever.get_crop_context(
                    crop=context.crop,
                    region=context.location,
                    soil_type=context.soil_type,
                    season=context.season,
                )
                rag_sources = [doc.metadata.get("source", "Knowledge Base") for doc in rag_docs]
            except Exception as e:
                logger.warning(f"Error getting RAG disease guidance: {e}")

        humidity = context.weather_data.get("humidity", 50)
        temperature = context.weather_data.get("temperature", 25)
        rainfall = context.weather_data.get("rainfall", 0)

        disease_risk = (humidity > 80) and (20 < temperature < 30)

        if disease_risk:
            action = "Increase disease monitoring and preventive sprays"
            details = f"High risk conditions: {humidity}% humidity, {temperature}°C temperature, {rainfall}mm rainfall"
            details += "\nRecommended preventive spray: Mancozeb (1%) or Copper fungicide"
            impact = "Prevent 70-80% of fungal diseases"
            confidence = 0.82
        else:
            action = "Continue regular monitoring"
            details = "Current weather conditions don't favor major disease outbreak"
            impact = "Avoid unnecessary chemical use, cost savings"
            confidence = 0.85

        return Recommendation(
            recommendation_type="disease_management",
            action=action,
            details=details,
            timing="Start preventive spray immediately if humidity >80%",
            expected_impact=impact,
            confidence_score=confidence,
            data_sources=["Weather data", "Regional disease patterns"],
            rag_sources=rag_sources,
            cost_estimate="300-800 INR per spraying depending on chemical type",
        )

    def get_harvest_guidance(self, context: FarmerContext) -> Optional[Recommendation]:
        logger.info(f"Generating harvest guidance for {context.crop}")

        crop_durations = {
            "rice": 120,
            "cotton": 210,
            "wheat": 145,
            "maize": 120,
            "chickpea": 180,
        }

        days_to_harvest = crop_durations.get(context.crop, 150)

        if context.days_since_planting is None or context.days_since_planting < days_to_harvest:
            return None

        rag_sources = []
        if self.rag_retriever:
            try:
                rag_docs = self.rag_retriever.get_harvest_guidance(crop=context.crop, region=context.location)
                rag_sources = [doc.metadata.get("source", "Knowledge Base") for doc in rag_docs]
            except Exception as e:
                logger.warning(f"Error getting RAG harvest guidance: {e}")

        likelihood_days = context.days_since_planting - days_to_harvest

        return Recommendation(
            recommendation_type="harvest",
            action=f"Prepare for {context.crop} harvest",
            details=f"Crop is {likelihood_days} days beyond typical maturity. Check grain moisture and readiness.",
            timing="Begin harvest immediately - delay risks quality loss",
            expected_impact="Minimize post-harvest losses, optimize quality",
            confidence_score=0.9,
            data_sources=["Crop variety duration", "Days since planting"],
            rag_sources=rag_sources,
        )

    def generate_recommendations(self, context: FarmerContext) -> RecommendationSet:
        logger.info(f"Generating recommendations for farmer {context.farmer_id}")

        recommendations = [
            self.get_fertilizer_recommendation(context),
            self.get_irrigation_recommendation(context),
            self.get_disease_prevention(context),
        ]

        harvest_rec = self.get_harvest_guidance(context)
        if harvest_rec:
            recommendations.append(harvest_rec)

        summary = f"Real-time recommendations for {context.crop} in {context.location} ({context.season} season)\n"
        summary += "Based on soil data, weather conditions, and agricultural best practices.\n"
        summary += (
            f"High confidence recommendations ({len([r for r in recommendations if r.confidence_score > 0.85])} "
            f"of {len(recommendations)})"
        )

        rec_set = RecommendationSet(
            farmer_id=context.farmer_id,
            timestamp=datetime.now().isoformat(),
            crop=context.crop,
            location=context.location,
            recommendations=recommendations,
            summary=summary,
            next_review_date=(
                datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp() + 86400 * 3
            ),
        )

        logger.info(f"Generated {len(recommendations)} recommendations")
        return rec_set

    def _get_npk_ratio(self, crop: str) -> str:
        ratios = {
            "rice": "100:50:50 kg/hectare",
            "cotton": "120:60:40 kg/hectare",
            "wheat": "120:60:40 kg/hectare",
            "maize": "150:75:60 kg/hectare",
            "chickpea": "20:50:40 kg/hectare",
        }
        return ratios.get(crop, "Standard NPK nutrition")

    def _get_fertilizer_alternatives(self, deficiencies: List[str]) -> List[str]:
        alternatives = []
        for def_type in deficiencies:
            if def_type == "nitrogen":
                alternatives.extend(["Urea 46%", "DAP (Diammonium Phosphate)", "Neem cake"])
            elif def_type == "phosphorus":
                alternatives.extend(["SSP (Single Super Phosphate)", "DAP", "Rock phosphate"])
            elif def_type == "potassium":
                alternatives.extend(["MOP (Potassium Chloride)", "SOP (Potassium Sulfate)"])
        return list(set(alternatives))[:3]

    def export_to_json(self, rec_set: RecommendationSet) -> str:
        return json.dumps(
            {
                "farmer_id": rec_set.farmer_id,
                "timestamp": rec_set.timestamp,
                "crop": rec_set.crop,
                "location": rec_set.location,
                "summary": rec_set.summary,
                "recommendations": [
                    {
                        "type": r.recommendation_type,
                        "action": r.action,
                        "details": r.details,
                        "timing": r.timing,
                        "expected_impact": r.expected_impact,
                        "confidence": r.confidence_score,
                        "sources": r.rag_sources,
                        "alternatives": r.alternatives,
                    }
                    for r in rec_set.recommendations
                ],
            },
            indent=2,
        )
