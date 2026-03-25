"""
AgriFlow API Router - FastAPI endpoints for the smart farming pipeline.
"""

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel, Field

from .pipeline import run_pipeline
from .pest_detection import detect_pest_from_image
from .crop_monitoring import analyze_weekly_image


# ── Request/Response Models ──

class SoilInput(BaseModel):
    """Input parameters for the farming pipeline."""
    nitrogen: float = Field(..., ge=0, le=300, description="Nitrogen level in soil (kg/ha)")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus level in soil (kg/ha)")
    potassium: float = Field(..., ge=0, le=300, description="Potassium level in soil (kg/ha)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH value")
    temperature: float = Field(..., ge=-10, le=55, description="Current temperature in °C")
    humidity: float = Field(..., ge=0, le=100, description="Current humidity in %")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nitrogen": 90,
                    "phosphorus": 42,
                    "potassium": 43,
                    "ph": 6.5,
                    "temperature": 25.0,
                    "humidity": 80.0,
                }
            ]
        }
    }


class WeeklyImageInput(BaseModel):
    """Metadata for weekly crop image analysis."""
    crop: str = Field(..., description="Crop name")
    week_number: int = Field(..., ge=1, le=52, description="Week number since sowing")


# ── Router ──

router = APIRouter(prefix="/agri-flow", tags=["AgriFlow - Smart Farming"])


@router.post("/predict", summary="Get Complete Farming Plan",
             description="Provide 6 soil/weather parameters and get a complete farming plan covering all 8 stages.")
async def predict_farming_plan(soil_input: SoilInput):
    """
    Main endpoint: Takes 6 soil/weather inputs and returns the complete farming plan.

    **Stages covered:**
    1. Land Preparation (soil analysis + suggestions)
    2. Crop Prediction (best crop for conditions)
    3. Seed Selection (varieties for predicted crop)
    4. Irrigation Management (schedule + method)
    5. Fertilizer Recommendation (NPK-based)
    6. Pest & Disease Risks (known pests + prevention)
    7. Crop Monitoring (growth stages + alerts)
    8. Harvest Prediction (timing + yield estimate)
    9. Storage & Marketing (storage tips + market prices)
    """
    result = run_pipeline(
        nitrogen=soil_input.nitrogen,
        phosphorus=soil_input.phosphorus,
        potassium=soil_input.potassium,
        ph=soil_input.ph,
        temperature=soil_input.temperature,
        humidity=soil_input.humidity,
    )
    return result


@router.post("/pest-detection", summary="Detect Pest/Disease from Image",
             description="Upload a crop image to detect pests or diseases using AI.")
async def pest_detection_endpoint(file: UploadFile = File(...)):
    """Upload a crop leaf/plant image for AI-based pest/disease detection."""
    image_bytes = await file.read()
    result = detect_pest_from_image(image_bytes)
    return result


@router.post("/crop-monitoring/weekly", summary="Weekly Crop Image Analysis",
             description="Upload a weekly crop image for health check and monitoring.")
async def weekly_monitoring_endpoint(
    crop: str = "Rice",
    week_number: int = 1,
    file: UploadFile = File(...),
):
    """Upload weekly crop image for AI-based health assessment."""
    image_bytes = await file.read()
    result = analyze_weekly_image(image_bytes, crop, week_number)
    return result
