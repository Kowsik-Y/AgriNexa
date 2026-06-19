from fastapi import APIRouter, Depends, File, UploadFile

from app.core.security import get_current_user
from app.services.prediction_service import PredictionService

router = APIRouter()
service = PredictionService()


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
