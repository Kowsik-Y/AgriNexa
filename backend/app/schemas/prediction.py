from pydantic import BaseModel
from typing import Any


class PredictionRequest(BaseModel):
    payload: dict


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float = 0.0
    meta: dict[str, Any] = {}
