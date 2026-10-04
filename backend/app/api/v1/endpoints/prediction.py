from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import get_current_user
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
