"""Growth-stage prediction API endpoints."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.ml_models.growth_stage_loader import growth_stage_model_loader

router = APIRouter(tags=["Growth Stage"])


# ── Request Schemas ──────────────────────────────────────────────────────

class GrowthStageRequest(BaseModel):
    """Full-featured request for the multi-class stage model (Seedling/Vegetative/Flowering)."""
    crop: str = Field(default="Rice", description="Crop name (label feature)")
    N: float = Field(default=80, description="Nitrogen (mg/kg)")
    P: float = Field(default=40, description="Phosphorus (mg/kg)")
    K: float = Field(default=40, description="Potassium (mg/kg)")
    temperature: float = Field(default=28, description="Temperature in °C")
    humidity: float = Field(default=70, description="Humidity %")
    ph: float = Field(default=6.5, description="Soil pH")


class GrowthMilestoneRequest(BaseModel):
    """Request for the binary growth milestone model."""
    Soil_Type: str = Field(default="Loamy", description="Soil type")
    Sunlight_Hours: float = Field(default=6.0, description="Daily sunlight hours")
    Water_Frequency: str = Field(default="Daily", description="Watering frequency")
    Fertilizer_Type: str = Field(default="Chemical", description="Fertilizer type")
    Temperature: float = Field(default=28, description="Temperature in °C")
    Humidity: float = Field(default=70, description="Humidity %")


class GrowthStageAllRequest(BaseModel):
    """Run all models with combined features."""
    # Stage model features
    crop: str = Field(default="Rice", alias="label")
    N: float = Field(default=80)
    P: float = Field(default=40)
    K: float = Field(default=40)
    temperature: float = Field(default=28)
    humidity: float = Field(default=70)
    ph: float = Field(default=6.5)
    # Milestone model features
    Soil_Type: str = Field(default="Loamy")
    Sunlight_Hours: float = Field(default=6.0)
    Water_Frequency: str = Field(default="Daily")
    Fertilizer_Type: str = Field(default="Chemical")

    class Config:
        populate_by_name = True


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/growth-stage/predict")
async def predict_growth_stage(
    request: GrowthStageRequest,
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Predict crop growth stage (Seedling / Vegetative / Flowering)."""
    features = {
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "label": request.crop,
    }
    result = growth_stage_model_loader.predict_stage(features)
    recommendations = growth_stage_model_loader.get_stage_recommendations(
        result.get("predicted_stage", ""), request.crop
    )
    return {
        **result,
        "crop": request.crop,
        "recommendations": recommendations,
        "input_features": features,
    }


@router.post("/growth-stage/milestone")
async def predict_growth_milestone(
    request: GrowthMilestoneRequest,
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Predict growth milestone reached (binary 0/1)."""
    features = request.dict()
    result = growth_stage_model_loader.predict_milestone(features)
    return {**result, "input_features": features}


@router.post("/growth-stage/pytorch")
async def predict_growth_pytorch(
    request: GrowthMilestoneRequest,
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Predict growth milestone using the PyTorch GrowthStageNet."""
    features = request.dict()
    result = growth_stage_model_loader.predict_pytorch(features)
    return {**result, "input_features": features}


@router.post("/growth-stage/predict-all")
async def predict_growth_all(
    request: GrowthStageAllRequest,
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Run all three growth-stage models and return combined results."""
    features = {
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "label": request.crop,
        "Temperature": request.temperature,
        "Humidity": request.humidity,
        "Soil_Type": request.Soil_Type,
        "Sunlight_Hours": request.Sunlight_Hours,
        "Water_Frequency": request.Water_Frequency,
        "Fertilizer_Type": request.Fertilizer_Type,
    }
    results = growth_stage_model_loader.predict_all(features)

    stage = results["stage"].get("predicted_stage", "")
    recommendations = growth_stage_model_loader.get_stage_recommendations(
        stage, request.crop
    )

    return {
        "results": results,
        "crop": request.crop,
        "primary_stage": stage,
        "recommendations": recommendations,
    }


@router.get("/growth-stage/status")
async def growth_stage_status(
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Check which growth-stage models are loaded."""
    return growth_stage_model_loader.get_status()


@router.post("/growth-stage/reload")
async def growth_stage_reload(
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Reload all growth-stage models."""
    return growth_stage_model_loader.reload()
