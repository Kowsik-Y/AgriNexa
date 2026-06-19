import datetime
import io
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.db.session import db
from app.schemas.agri_flow import (
    PlanCreateRequest,
    RecomputeRequest,
    SoilInput,
    StageModelTestRequest,
    TaskUpdateRequest,
    UpdateFarmingFlowRequest,
)
from app.services.agri_flow_planner_service import planner_service
from app.services.llm_service import LLMService
from app.services.ml_models import stage_flow_model_loader
from app.services.notifications import get_notification_service
from .agri_flow_utils import (
    analyze_weekly_image_safe,
    build_monitoring_pdf,
    build_monitoring_recommendations,
    calculate_trend,
    detect_pest_safe,
    run_pipeline_safe,
)

router = APIRouter(tags=["AgriFlow"])
llm_service = LLMService()


def _parse_user_crops(crops_value: Any) -> list[str]:
    if not crops_value:
        return []
    if isinstance(crops_value, list):
        return [str(c).strip().lower() for c in crops_value if str(c).strip()]
    raw = str(crops_value)
    parts = [token.strip().lower() for token in raw.replace("/", ",").split(",")]
    return [token for token in parts if token]


@router.post("/agri-flow/update-flow")
async def update_farming_flow(
    request: UpdateFarmingFlowRequest,
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    normalized_crop = request.crop.strip().lower()
    normalized_stage = request.flow_stage.strip().lower()
    now = datetime.datetime.utcnow()
    profile = await db.users.find_one({"user_id": current_user}) or {}

    location_meta = {
        "village": profile.get("village"),
        "district": profile.get("district"),
        "state": profile.get("state"),
    }

    plan_payload = {
        "field_name": request.field_name,
        "location": request.location,
        "location_meta": location_meta,
        "soil_type": profile.get("soil_type"),
        "soil_input": {
            "nitrogen": float(profile.get("nitrogen", 80.0)),
            "phosphorus": float(profile.get("phosphorus", 40.0)),
            "potassium": float(profile.get("potassium", 40.0)),
            "ph": float(profile.get("ph", 6.5)),
            "temperature": float(profile.get("temperature", 28.0)),
            "humidity": float(profile.get("humidity", 70.0)),
        },
        "crop": normalized_crop,
    }

    created_plan = await planner_service.create_plan(current_user, plan_payload)
    aligned_plan = await planner_service.align_plan_to_flow_stage(
        user_id=current_user,
        plan_id=created_plan["plan_id"],
        flow_stage=normalized_stage,
        growth_stage_day=request.growth_stage_day,
        notes=request.notes,
    )

    update_doc = {
        "field_name": request.field_name,
        "location": request.location,
        "crop": normalized_crop,
        "flow_stage": normalized_stage,
        "growth_stage_day": request.growth_stage_day,
        "notes": request.notes,
        "plan_id": created_plan.get("plan_id"),
        "applied_stage": (aligned_plan or created_plan).get("last_flow_update", {}).get("flow_stage", normalized_stage),
        "updated_at": now,
    }

    await db.users.update_one(
        {"user_id": current_user},
        {
            "$set": {
                "flow_stage": normalized_stage,
                "crops": normalized_crop,
                "last_flow_update": update_doc,
                "last_flow_updated_at": now,
                "active_plan_id": created_plan.get("plan_id"),
            },
            "$push": {
                "flow_update_history": {
                    "$each": [{**update_doc, "timestamp": now}],
                    "$slice": -100,
                }
            },
        },
        upsert=True,
    )

    await db.agri_flow_updates.insert_one(
        {
            "user_id": current_user,
            **update_doc,
            "location_meta": location_meta,
            "timestamp": now,
        }
    )

    return {
        "status": "success",
        "message": "Farming flow updated and plan synchronized",
        "data": update_doc,
        "plan": aligned_plan or created_plan,
    }


@router.post("/agri-flow/stage-model/test")
async def test_stage_model(
    request: StageModelTestRequest,
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    features = {
        "growth_stage_day": request.growth_stage_day,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "health_score": request.health_score,
        "nitrogen": request.nitrogen,
        "phosphorus": request.phosphorus,
        "potassium": request.potassium,
        "ph": request.ph,
    }

    prediction = stage_flow_model_loader.predict_stage(features)
    model_status = stage_flow_model_loader.get_status()

    explain_prompt = (
        "Explain this farming stage prediction in simple bullet points for a farmer. "
        f"Crop: {request.crop}. Location: {request.location or 'unknown'}. "
        f"Predicted stage: {prediction.get('predicted_stage')}. "
        f"Confidence: {prediction.get('confidence')}. "
        f"Inputs: growth day {request.growth_stage_day}, health score {request.health_score}/5, "
        f"temp {request.temperature}C, humidity {request.humidity}%, "
        f"NPK {request.nitrogen}/{request.phosphorus}/{request.potassium}, pH {request.ph}. "
        "Include: why this stage, what to do in next 3 days, one risk to watch."
    )
    llm_explanation = await llm_service.generate(explain_prompt)

    response_doc = {
        "status": "success",
        "user_id": current_user,
        "model": {
            "runtime": prediction,
            "loader": model_status,
        },
        "explanation": llm_explanation,
    }

    await db.agri_flow_stage_tests.insert_one(
        {
            "user_id": current_user,
            "request": request.dict(),
            "response": response_doc,
            "timestamp": datetime.datetime.utcnow(),
        }
    )

    return response_doc


@router.post("/agri-flow/plans")
async def create_agri_flow_plan(
    request: PlanCreateRequest,
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    payload = request.dict()
    soil_input = payload.get("soil_input")
    if soil_input:
        payload["soil_input"] = soil_input
    return await planner_service.create_plan(current_user, payload)


@router.post("/agri-flow/plans/from-user-crops")
async def create_plans_from_user_crops(current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    profile = await db.users.find_one({"user_id": current_user}) or {}
    crops = _parse_user_crops(profile.get("crops"))
    if not crops:
        raise HTTPException(status_code=400, detail="No crops found in user profile")

    crops = crops[:5]
    payload = {
        "field_name": profile.get("farm_name") or "Primary Field",
        "location": ", ".join(
            [
                str(profile.get("village") or "").strip(),
                str(profile.get("district") or "").strip(),
                str(profile.get("state") or "").strip(),
            ]
        ).strip(", ")
        or str(profile.get("district") or "Unknown location"),
        "location_meta": {
            "village": profile.get("village"),
            "district": profile.get("district"),
            "state": profile.get("state"),
        },
        "soil_type": profile.get("soil_type"),
        "soil_input": {
            "nitrogen": float(profile.get("nitrogen", 80.0)),
            "phosphorus": float(profile.get("phosphorus", 40.0)),
            "potassium": float(profile.get("potassium", 40.0)),
            "ph": float(profile.get("ph", 6.5)),
            "temperature": float(profile.get("temperature", 28.0)),
            "humidity": float(profile.get("humidity", 70.0)),
        },
    }

    plans = await planner_service.create_plans_for_crops(current_user, payload, crops)
    return {
        "status": "success",
        "count": len(plans),
        "plans": plans,
    }


@router.get("/agri-flow/plans/active")
async def get_active_agri_flow_plans(current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    plans = await planner_service.get_active_plans(current_user)
    return {
        "status": "success",
        "count": len(plans),
        "plans": plans,
    }


@router.get("/agri-flow/plans/{plan_id}")
async def get_agri_flow_plan(plan_id: str, current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    plan = await planner_service.get_plan(current_user, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.patch("/agri-flow/tasks/{task_id}")
async def update_agri_flow_task(
    task_id: str,
    request: TaskUpdateRequest,
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    payload = request.dict()
    if payload.get("due_date"):
        payload["due_date"] = payload["due_date"].isoformat()

    updated_task = await planner_service.update_task(current_user, task_id, payload)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "status": "success",
        "task": updated_task,
    }


@router.post("/agri-flow/plans/{plan_id}/recompute")
async def recompute_agri_flow_plan(
    plan_id: str,
    request: RecomputeRequest,
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    updated_plan = await planner_service.recompute_plan(current_user, plan_id, request.dict())
    if not updated_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return updated_plan


@router.post("/agri-flow/photos/analyze")
async def analyze_agri_flow_photo(
    plan_id: str = Query(..., min_length=8),
    crop: str = Query(..., min_length=2),
    growth_stage_day: int = Query(1, ge=1, le=365),
    health_score: int = Query(3, ge=1, le=5),
    notes: Optional[str] = Query(None),
    temperature: Optional[float] = Query(None, ge=-10, le=55),
    humidity: Optional[float] = Query(None, ge=0, le=100),
    file: Optional[UploadFile] = File(None),
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    ai_assessment = None
    if file:
        image_data = await file.read()
        weekly_result = analyze_weekly_image_safe(image_data, crop, growth_stage_day // 7 + 1)
        ai_assessment = {
            "health_status": weekly_result.get("health_status"),
            "health_score": weekly_result.get("health_score", health_score),
            "observations": weekly_result.get("observations", []),
        }

    final_health_score = int((ai_assessment or {}).get("health_score", health_score))
    assessment_payload = {
        "crop": crop,
        "growth_stage_day": growth_stage_day,
        "health_score": final_health_score,
        "notes": notes,
        "temperature": temperature,
        "humidity": humidity,
        "ai_assessment": ai_assessment,
    }

    plan = await planner_service.apply_photo_assessment(current_user, plan_id, assessment_payload)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return {
        "status": "success",
        "assessment": assessment_payload,
        "plan": plan,
        "message": "Photo analyzed and plan updated",
    }


@router.post("/agri-flow/predict")
async def get_farming_plan(soil_input: SoilInput, current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    result = run_pipeline_safe(soil_input)

    plan_record = {
        "user_id": current_user,
        "timestamp": datetime.datetime.utcnow(),
        "input_parameters": soil_input.dict(),
        "farming_plan": result.get("farming_plan", {}),
    }
    await db.farming_plans.insert_one(plan_record)

    return result


@router.get("/agri-flow/latest")
async def get_latest_farming_plan(current_user: str = Depends(get_current_user)) -> Dict[str, Any]:
    plan = await db.farming_plans.find_one({"user_id": current_user}, sort=[("timestamp", -1)])
    if plan:
        plan.pop("_id", None)
        return plan

    profile = await db.users.find_one({"user_id": current_user})
    if profile:
        result = run_pipeline_safe(
            SoilInput(
                nitrogen=float(profile.get("nitrogen", 80.0)),
                phosphorus=float(profile.get("phosphorus", 40.0)),
                potassium=float(profile.get("potassium", 40.0)),
                ph=float(profile.get("ph", 6.5)),
                temperature=float(profile.get("temperature", 28.0)),
                humidity=float(profile.get("humidity", 70.0)),
            )
        )
        return {"farming_plan": result.get("farming_plan", {}), "is_default": True}

    raise HTTPException(status_code=404, detail="No farming plan found for this user")


@router.post("/agri-flow/pest-detection")
async def pest_detection(file: UploadFile = File(...), _: str = Depends(get_current_user)) -> Dict[str, Any]:
    image_bytes = await file.read()
    return detect_pest_safe(image_bytes)


@router.post("/agri-flow/crop-monitoring/weekly")
async def weekly_crop_monitoring(
    crop: str = "Rice",
    week_number: int = 1,
    file: UploadFile = File(...),
    _: str = Depends(get_current_user),
) -> Dict[str, Any]:
    image_bytes = await file.read()
    return analyze_weekly_image_safe(image_bytes, crop, week_number)


@router.post("/agri-flow/daily-monitoring")
async def daily_monitoring_endpoint(
    crop: str = Query(...),
    growth_stage_day: int = Query(..., ge=1, le=365),
    health_score: int = Query(..., ge=1, le=5),
    notes: Optional[str] = Query(None),
    temperature: Optional[float] = Query(None, ge=-10, le=55),
    humidity: Optional[float] = Query(None, ge=0, le=100),
    file: Optional[UploadFile] = File(None),
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    ai_assessment = None

    if file:
        image_data = await file.read()
        weekly_result = analyze_weekly_image_safe(image_data, crop, growth_stage_day // 7 + 1)
        ai_assessment = {
            "health_status": weekly_result.get("health_status"),
            "health_score": weekly_result.get("health_score"),
            "observations": weekly_result.get("observations", []),
        }

    entry = {
        "date": datetime.datetime.utcnow().isoformat(),
        "crop": crop,
        "growth_stage_day": growth_stage_day,
        "health_score": health_score,
        "ai_assessment": ai_assessment,
        "weather_temp": temperature,
        "weather_humidity": humidity,
        "notes": notes,
    }

    await db.users.update_one(
        {"user_id": current_user},
        {
            "$push": {"daily_monitoring_logs": entry},
            "$set": {"last_monitoring_at": datetime.datetime.utcnow()},
        },
    )

    recommendation = "Crop looks healthy. Continue current practices."
    if ai_assessment and ai_assessment.get("health_score", 75) < 50:
        recommendation = "AI detected stress. Inspect leaves and adjust irrigation/fertilization immediately."
    elif health_score <= 2:
        recommendation = "Low manual health score. Check for pests, nutrient deficiency, and water stress."
    elif health_score == 3:
        recommendation = "Moderate health. Increase monitoring and validate nutrient schedule."

    user_doc = await db.users.find_one({"user_id": current_user}, {"expo_push_token": 1})
    expo_push_token = (user_doc or {}).get("expo_push_token")

    should_alert = health_score <= 2 or (
        ai_assessment is not None and ai_assessment.get("health_status") in {"Needs Attention", "Critical"}
    )
    if should_alert and expo_push_token:
        try:
            notification_service = await get_notification_service()
            await notification_service.send_pest_alert(
                user_id=current_user,
                expo_push_token=expo_push_token,
                crop=crop,
                pest_name=ai_assessment.get("health_status", "Crop Stress") if ai_assessment else "Crop Stress",
                risk_level="High" if health_score <= 2 else "Medium",
                recommendation=recommendation,
            )
        except Exception:
            pass

    return {
        "status": "success",
        "date": entry["date"],
        "crop": crop,
        "growth_stage_day": growth_stage_day,
        "farmer_health_score": health_score,
        "ai_assessment": ai_assessment,
        "weather": {
            "temperature": temperature,
            "humidity": humidity,
        },
        "notes": notes,
        "recommendation": recommendation,
        "next_action": "Upload photo again tomorrow for trend analysis",
    }


@router.get("/agri-flow/daily-monitoring/history")
async def get_monitoring_history(
    days: int = Query(7, ge=1, le=90),
    current_user: str = Depends(get_current_user),
) -> Dict[str, Any]:
    user_doc = await db.users.find_one({"user_id": current_user}, {"daily_monitoring_logs": {"$slice": -days}})
    logs = (user_doc or {}).get("daily_monitoring_logs", [])
    logs = sorted(logs, key=lambda item: item.get("date", ""))

    average = 0
    if logs:
        average = round(sum([entry.get("health_score", 0) for entry in logs]) / len(logs), 2)

    return {
        "status": "success",
        "user_id": current_user,
        "period_days": days,
        "history": logs,
        "summary": {
            "monitoring_count": len(logs),
            "average_health_score": average,
            "trend": calculate_trend(logs),
            "last_photo_date": logs[-1].get("date") if logs else None,
        },
        "recommendations": build_monitoring_recommendations(logs),
    }


@router.post("/notifications/register-token")
async def register_notification_token(
    expo_push_token: str = Body(..., embed=True),
    current_user: str = Depends(get_current_user),
) -> Dict[str, str]:
    await db.users.update_one(
        {"user_id": current_user},
        {
            "$set": {
                "expo_push_token": expo_push_token,
                "notification_token_updated_at": datetime.datetime.utcnow(),
            }
        },
    )
    return {"status": "success"}


@router.get("/agri-flow/report/pdf")
async def export_monitoring_report_pdf(
    days: int = Query(30, ge=7, le=180),
    current_user: str = Depends(get_current_user),
):
    user_doc = await db.users.find_one({"user_id": current_user}, {"daily_monitoring_logs": {"$slice": -days}})
    logs = (user_doc or {}).get("daily_monitoring_logs", [])
    logs = sorted(logs, key=lambda item: item.get("date", ""))

    pdf_bytes = build_monitoring_pdf(current_user, days, logs)
    filename = f"agrinexa_report_{current_user}_{datetime.datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
