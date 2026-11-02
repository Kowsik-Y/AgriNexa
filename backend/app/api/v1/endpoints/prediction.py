from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import get_current_user
from app.schemas.prediction import CropRecommendationRequest, YieldPredictionRequest
from app.services.prediction_service import PredictionService

router = APIRouter()
service = PredictionService()


@router.post("/scan/start")
async def scan_crop_start(file: UploadFile = File(...), _: str = Depends(get_current_user)):
    """Identify crop + disease using LangGraph (starts a background task)."""
    from app.services.vision_scan_service import start_scan_task

    image_bytes = await file.read()
    try:
        task_id = await start_scan_task(image_bytes, file.content_type or "image/jpeg")
        return {"task_id": task_id}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Scan unavailable: {exc}")

@router.get("/scan/status/{task_id}")
async def scan_crop_status(task_id: str, _: str = Depends(get_current_user)):
    """Get the live status/result of a LangGraph scan task."""
    from app.services.vision_scan_service import get_scan_task_status
    
    status_data = get_scan_task_status(task_id)
    if status_data.get("error") == "Task not found":
        raise HTTPException(status_code=404, detail="Task not found")
    return status_data


@router.post("/")
async def predict_disease(file: UploadFile = File(...), _: str = Depends(get_current_user)):
    image_bytes = await file.read()
    result = await service.predict_disease(image_bytes)

    disease = result.get("detected_disease") or result.get("disease", "Unknown")
    solution = result.get("treatment_steps") or result.get("solution", "Consult a local agri-expert.")
    confidence = result.get("confidence", 0.0)

    return {
        "disease": disease,
        "confidence": confidence,
        "solution": solution,
        "pesticide_recommendation": result.get("pesticide_recommendation"),
        "dosage": result.get("dosage"),
        "application_frequency": result.get("application_frequency"),
        "is_healthy": result.get("is_healthy", False),
        "top_3_predictions": result.get("top_3_predictions", []),
        "note": result.get("note", ""),
    }


@router.post("/crop")
async def predict_crop(file: UploadFile = File(...), _: str = Depends(get_current_user)):
    image_bytes = await file.read()
    result = await service.predict_crop(image_bytes)
    return {
        "predicted_crop": result.get("predicted_crop", "Unknown"),
        "confidence": result.get("confidence", 0.0),
        "top_3_predictions": result.get("top_3_predictions", []),
        "note": result.get("note", ""),
    }


@router.post("/crop-recommendation")
async def recommend_crops_endpoint(
    payload: CropRecommendationRequest,
    _: str = Depends(get_current_user),
):
    """Machine learning crop recommendation with GenAI agronomic report."""
    from app.services.llm_agri_tools import get_genai_agri_intelligence

    intel = get_genai_agri_intelligence()
    return await intel.generate_crop_recommendation_report(
        n=payload.nitrogen,
        p=payload.phosphorus,
        k=payload.potassium,
        ph=payload.ph,
        temp=payload.temperature,
        humidity=payload.humidity,
        rainfall=payload.rainfall,
        location=payload.location,
        season=payload.season,
        language=payload.language or "English",
    )


@router.post("/yield-prediction")
async def predict_yield_endpoint(
    payload: YieldPredictionRequest,
    _: str = Depends(get_current_user),
):
    """Machine learning crop yield & revenue prediction with GenAI yield plan."""
    from app.services.llm_agri_tools import get_genai_agri_intelligence

    intel = get_genai_agri_intelligence()
    return await intel.generate_yield_prediction_report(
        crop=payload.crop,
        area=payload.area,
        area_unit=payload.area_unit or "acres",
        season=payload.season,
        soil_type=payload.soil_type,
        irrigation_type=payload.irrigation_type,
        fertilizer_level=payload.fertilizer_level,
        location=payload.location,
        language=payload.language or "English",
    )


@router.get("/tools/meta")
async def get_tools_metadata(_: str = Depends(get_current_user)):
    """Metadata for frontend crop recommendation & yield prediction tools."""
    from app.services.ml_models.crop_recommender import CROP_DATASETS
    from app.services.ml_models.yield_predictor import CROP_YIELD_BENCHMARKS

    crops = [
        {"id": k, "name": k, "tamil_name": v.get("tamil_name", k)}
        for k, v in CROP_YIELD_BENCHMARKS.items()
    ]
    seasons = ["Kharif", "Rabi", "Zaid / Summer", "Whole Year"]
    soils = ["Alluvial", "Black Soil", "Red Soil", "Clay Loam", "Sandy Loam", "Laterite"]
    irrigation_types = ["Drip / Micro-irrigation", "Sprinkler", "Canal / Flood", "Borewell / Open Well", "Rainfed"]
    fertilizer_levels = ["Balanced / Soil-test Based", "High / Intensive", "Low / Organic"]

    soil_presets = [
        {"label": "Delta Alluvial", "n": 90, "p": 45, "k": 40, "ph": 6.8, "soil": "Alluvial"},
        {"label": "Black Cotton", "n": 120, "p": 50, "k": 25, "ph": 7.2, "soil": "Black Soil"},
        {"label": "Red Sandy Loam", "n": 35, "p": 30, "k": 35, "ph": 6.2, "soil": "Red Soil"},
        {"label": "Vegetable Garden", "n": 100, "p": 60, "k": 60, "ph": 6.5, "soil": "Sandy Loam"},
    ]

    return {
        "crops": crops,
        "seasons": seasons,
        "soils": soils,
        "irrigation_types": irrigation_types,
        "fertilizer_levels": fertilizer_levels,
        "soil_presets": soil_presets,
    }
