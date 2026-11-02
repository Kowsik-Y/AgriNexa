from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel


class PredictionRequest(BaseModel):
    payload: dict


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float = 0.0
    meta: dict[str, Any] = {}


class CropRecommendationRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None
    season: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = "English"


class YieldPredictionRequest(BaseModel):
    crop: str
    area: float
    area_unit: Optional[str] = "acres"
    season: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    fertilizer_level: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = "English"
