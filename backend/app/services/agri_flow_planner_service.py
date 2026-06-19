import datetime
import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.db.session import db
from app.services.llm_service import LLMService


CROP_STAGE_BLUEPRINTS: Dict[str, List[Tuple[str, int, str]]] = {
    "rice": [
        ("land_preparation", 14, "Field leveling and basal nutrient prep"),
        ("sowing", 14, "Seed treatment and early irrigation"),
        ("vegetative", 35, "Nitrogen top-dressing and weed control"),
        ("flowering", 30, "Moisture management and pest watch"),
        ("harvest", 18, "Maturity checks and harvest planning"),
        ("post_harvest", 10, "Drying, storage, and market timing"),
    ],
    "wheat": [
        ("land_preparation", 12, "Bed prep and residue handling"),
        ("sowing", 10, "Line sowing and starter nutrition"),
        ("vegetative", 35, "Irrigation interval and nutrient split"),
        ("flowering", 24, "Rust and pest scouting"),
        ("harvest", 16, "Moisture checks and combine readiness"),
        ("post_harvest", 8, "Storage moisture and sale planning"),
    ],
    "maize": [
        ("land_preparation", 10, "Seedbed and drainage setup"),
        ("sowing", 8, "Seed spacing and emergence checks"),
        ("vegetative", 30, "Top-dress nitrogen and weed control"),
        ("flowering", 25, "Pollination safety and irrigation timing"),
        ("harvest", 15, "Cob maturity checks"),
        ("post_harvest", 8, "Drying and storage"),
    ],
    "cotton": [
        ("land_preparation", 14, "Soil preparation and bed layout"),
        ("sowing", 10, "Seed placement and germination checks"),
        ("vegetative", 40, "Canopy and nutrient management"),
        ("flowering", 30, "Pest scouting and spray windows"),
        ("harvest", 35, "Picking rounds and contamination control"),
        ("post_harvest", 8, "Bale handling and marketing"),
    ],
}

DEFAULT_STAGE_BLUEPRINT = CROP_STAGE_BLUEPRINTS["rice"]


class AgriFlowPlannerService:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    def _normalize_crop(self, crop: Optional[str]) -> Optional[str]:
        if not crop:
            return None
        return crop.strip().lower()

    @staticmethod
    def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
        if not text:
            return None
        candidate = text.strip()
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

        match = re.search(r"\{[\s\S]*\}", candidate)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except Exception:
            return None
        return None

    async def _generate_unified_llm_plan(
        self,
        crop: str,
        location: str,
        soil_type: Optional[str],
    ) -> Dict[str, Any]:
        prompt = (
            "You are an agronomy planner. Return ONLY JSON with keys: "
            "'stages' (array of objects with 'stage_name' snake_case string, 'duration_days' integer, 'focus' string), "
            "'summary' (string), 'stage_guidance' (object: stage_name -> array of short actions), "
            "'next_7_days' (array of short actions), 'risk_alerts' (array of short alerts). "
            f"Crop: {crop}. Location: {location}. Soil type: {soil_type or 'unknown'}. "
            "Keep actions practical for farmers. Ensure duration_days are integer values."
        )

        llm_text = await self.llm_service.generate(prompt)
        parsed = self._extract_json_object(llm_text)

        if not parsed:
            return {}

        return parsed

    def _coerce_stage_blueprint(self, crop: str) -> List[Tuple[str, int, str]]:
        return CROP_STAGE_BLUEPRINTS.get(crop, DEFAULT_STAGE_BLUEPRINT)

    def recommend_crops(
        self,
        location: str,
        soil_type: Optional[str],
        soil_input: Optional[Dict[str, float]],
    ) -> List[Dict[str, Any]]:
        location_l = (location or "").lower()
        soil_l = (soil_type or "").lower()
        ph = (soil_input or {}).get("ph", 6.8)
        humidity = (soil_input or {}).get("humidity", 65.0)

        candidates = {
            "rice": 0.5,
            "wheat": 0.5,
            "maize": 0.5,
            "cotton": 0.4,
            "millet": 0.45,
            "groundnut": 0.45,
        }

        if "clay" in soil_l or "alluvial" in soil_l:
            candidates["rice"] += 0.2
            candidates["wheat"] += 0.1
        if "loam" in soil_l:
            candidates["maize"] += 0.15
            candidates["groundnut"] += 0.1
        if "sandy" in soil_l:
            candidates["millet"] += 0.2
            candidates["groundnut"] += 0.15

        if ph < 5.8:
            candidates["millet"] += 0.1
            candidates["groundnut"] += 0.05
        elif ph > 7.8:
            candidates["cotton"] += 0.1
            candidates["wheat"] += 0.05

        if humidity > 75:
            candidates["rice"] += 0.15
        if "tamil" in location_l or "cauvery" in location_l or "delta" in location_l:
            candidates["rice"] += 0.1
            candidates["cotton"] += 0.05

        ranked = sorted(candidates.items(), key=lambda item: item[1], reverse=True)[:3]
        return [
            {
                "crop": crop,
                "score": round(score, 2),
                "reason": "Matched on soil, pH, humidity, and regional suitability",
            }
            for crop, score in ranked
        ]

    def _build_stages_and_tasks(
        self,
        crop: str,
        planting_date: datetime.date,
        custom_blueprint: Optional[List[Tuple[str, int, str]]] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        stages: List[Dict[str, Any]] = []
        tasks: List[Dict[str, Any]] = []
        weekly_plan: List[Dict[str, Any]] = []

        day_cursor = 0
        week_cursor = 1
        stage_blueprint = custom_blueprint if custom_blueprint else self._coerce_stage_blueprint(crop)

        for idx, (stage_name, duration_days, focus) in enumerate(stage_blueprint, start=1):
            stage_start = planting_date + datetime.timedelta(days=day_cursor)
            stage_end = planting_date + datetime.timedelta(days=day_cursor + duration_days - 1)
            stage_id = f"stg_{uuid.uuid4().hex[:8]}"
            stages.append(
                {
                    "stage_id": stage_id,
                    "sequence": idx,
                    "stage_name": stage_name,
                    "start_date": stage_start.isoformat(),
                    "end_date": stage_end.isoformat(),
                    "duration_days": duration_days,
                    "focus": focus,
                    "status": "upcoming" if idx > 1 else "in_progress",
                    "progress_percent": 0,
                }
            )

            weeks_in_stage = max(1, (duration_days + 6) // 7)
            for week_offset in range(weeks_in_stage):
                weekly_plan.append(
                    {
                        "week_number": week_cursor,
                        "stage": stage_name,
                        "goal": focus,
                        "window_start": (stage_start + datetime.timedelta(days=week_offset * 7)).isoformat(),
                        "window_end": (
                            min(stage_end, stage_start + datetime.timedelta(days=week_offset * 7 + 6))
                        ).isoformat(),
                    }
                )
                week_cursor += 1

            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": stage_id,
                    "task_type": "stage_gate",
                    "title": f"Start {stage_name.replace('_', ' ').title()} checklist",
                    "due_date": stage_start.isoformat(),
                    "status": "pending",
                    "priority": "high" if idx <= 2 else "medium",
                    "guidance": focus,
                    "source": "stage_planner",
                }
            )
            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": stage_id,
                    "task_type": "monitoring",
                    "title": f"Weekly crop health check - {stage_name.replace('_', ' ')}",
                    "due_date": (stage_start + datetime.timedelta(days=min(6, duration_days - 1))).isoformat(),
                    "status": "pending",
                    "priority": "medium",
                    "guidance": "Capture crop photo and update health score",
                    "source": "stage_planner",
                }
            )
            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": stage_id,
                    "task_type": "irrigation",
                    "title": f"Irrigation schedule check - {stage_name.replace('_', ' ')}",
                    "due_date": (stage_start + datetime.timedelta(days=min(3, duration_days - 1))).isoformat(),
                    "status": "pending",
                    "priority": "medium",
                    "guidance": "Validate irrigation timing using moisture and heat stress signals",
                    "source": "weather_sensitive",
                }
            )
            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": stage_id,
                    "task_type": "plant_protection",
                    "title": f"Spray feasibility check - {stage_name.replace('_', ' ')}",
                    "due_date": (stage_start + datetime.timedelta(days=min(5, duration_days - 1))).isoformat(),
                    "status": "pending",
                    "priority": "medium",
                    "guidance": "Review rain window and disease risk before spraying",
                    "source": "weather_sensitive",
                }
            )

            day_cursor += duration_days

        # Generate first 30 days of daily tasks for actionable guidance.
        for offset in range(0, 30):
            task_date = planting_date + datetime.timedelta(days=offset)
            target_stage_id = stages[0]["stage_id"]
            for s in stages:
                if s["start_date"][:10] <= task_date.isoformat()[:10] <= s["end_date"][:10]:
                    target_stage_id = s["stage_id"]
                    break

            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": target_stage_id,
                    "task_type": "daily",
                    "title": "Daily field walk and moisture check",
                    "due_date": task_date.isoformat(),
                    "status": "pending",
                    "priority": "high" if offset < 10 else "medium",
                    "guidance": "Inspect pests, weeds, standing water, and visible nutrient stress",
                    "source": "daily_template",
                }
            )

        return stages, tasks, weekly_plan

    async def create_plan(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        location = payload.get("location", "")
        soil_type = payload.get("soil_type")
        soil_input = payload.get("soil_input")
        selected_crop = self._normalize_crop(payload.get("crop"))
        recommended_crops = self.recommend_crops(location, soil_type, soil_input)

        if not selected_crop:
            selected_crop = recommended_crops[0]["crop"]

        planting_date = payload.get("planting_date") or datetime.date.today()
        if isinstance(planting_date, str):
            planting_date = datetime.date.fromisoformat(planting_date)

        llm_data = await self._generate_unified_llm_plan(selected_crop, location or "unknown", soil_type)
        
        custom_blueprint = None
        if llm_data and llm_data.get("stages"):
            custom_blueprint = []
            for s in llm_data["stages"]:
                try:
                    custom_blueprint.append((s.get("stage_name", "growth_stage").replace(" ", "_").lower(), int(s.get("duration_days", 14)), s.get("focus", "Active planning")))
                except (ValueError, TypeError):
                    custom_blueprint.append((s.get("stage_name", "growth_stage").replace(" ", "_").lower(), 14, s.get("focus", "Active planning")))

        stages, tasks, weekly_plan = self._build_stages_and_tasks(selected_crop, planting_date, custom_blueprint=custom_blueprint)

        llm_plan = {
            "summary": llm_data.get("summary") or f"Stage-wise plan for {selected_crop} in {location}.",
            "stage_guidance": llm_data.get("stage_guidance") or {},
            "next_7_days": llm_data.get("next_7_days") or [],
            "risk_alerts": llm_data.get("risk_alerts") or [],
            "source": "llm" if custom_blueprint else "fallback",
        }

        plan_id = f"plan_{uuid.uuid4().hex}"
        now = datetime.datetime.utcnow()
        plan_doc = {
            "plan_id": plan_id,
            "user_id": user_id,
            "field_id": payload.get("field_id") or f"fld_{uuid.uuid4().hex[:10]}",
            "field_name": payload.get("field_name") or "Primary Field",
            "location": location,
            "location_meta": payload.get("location_meta", {}),
            "soil_type": soil_type,
            "soil_input": soil_input,
            "crop": selected_crop,
            "crop_recommendations": recommended_crops,
            "irrigation_type": payload.get("irrigation_type"),
            "planting_date": planting_date.isoformat(),
            "stages": stages,
            "tasks": tasks,
            "weekly_plan": weekly_plan,
            "llm_plan": llm_plan,
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "last_photo_assessment": None,
        }

        await db.agri_flow_plans.insert_one(plan_doc)

        plan_doc.pop("_id", None)
        return plan_doc

    async def create_plans_for_crops(self, user_id: str, payload: Dict[str, Any], crops: List[str]) -> List[Dict[str, Any]]:
        created: List[Dict[str, Any]] = []
        for crop in crops:
            plan_payload = {**payload, "crop": crop}
            created.append(await self.create_plan(user_id, plan_payload))
        return created

    async def align_plan_to_flow_stage(
        self,
        user_id: str,
        plan_id: str,
        flow_stage: str,
        growth_stage_day: int,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        plan_doc = await db.agri_flow_plans.find_one({"user_id": user_id, "plan_id": plan_id})
        if not plan_doc:
            return None

        stages = plan_doc.get("stages", [])
        tasks = plan_doc.get("tasks", [])
        if not stages:
            return None

        normalized_stage = (flow_stage or "").strip().lower()
        target_index = next(
            (i for i, stage in enumerate(stages) if (stage.get("stage_name") or "").lower() == normalized_stage),
            0,
        )
        target_stage_id = stages[target_index].get("stage_id")

        cumulative_before = sum(int(stages[i].get("duration_days", 0) or 0) for i in range(target_index))
        target_duration = max(1, int(stages[target_index].get("duration_days", 1) or 1))
        stage_day = max(1, growth_stage_day - cumulative_before)
        progress_pct = min(99, max(1, int((stage_day / target_duration) * 100)))

        completed_stage_ids: List[str] = []
        for idx, stage in enumerate(stages):
            stage_id = stage.get("stage_id")
            if idx < target_index:
                stage["status"] = "completed"
                stage["progress_percent"] = 100
                completed_stage_ids.append(stage_id)
            elif idx == target_index:
                stage["status"] = "in_progress"
                stage["progress_percent"] = progress_pct
            else:
                stage["status"] = "upcoming"
                stage["progress_percent"] = 0

        now_iso = datetime.datetime.utcnow().isoformat()
        for task in tasks:
            task_stage_id = task.get("stage_id")
            status = task.get("status")
            if task_stage_id in completed_stage_ids:
                if status in {"pending", "in_progress"}:
                    task["status"] = "completed"
                    task["completed_at"] = now_iso
                continue

            if task_stage_id == target_stage_id or task_stage_id not in completed_stage_ids:
                if status != "skipped":
                    task["status"] = "pending"
                    task.pop("completed_at", None)

        now = datetime.datetime.utcnow()
        flow_update = {
            "flow_stage": normalized_stage,
            "growth_stage_day": growth_stage_day,
            "notes": notes,
            "timestamp": now.isoformat(),
            "target_stage_id": target_stage_id,
        }

        await db.agri_flow_plans.update_one(
            {"_id": plan_doc["_id"]},
            {
                "$set": {
                    "stages": stages,
                    "tasks": tasks,
                    "updated_at": now,
                    "last_flow_update": flow_update,
                }
            },
        )

        plan_doc["stages"] = stages
        plan_doc["tasks"] = tasks
        plan_doc["updated_at"] = now
        plan_doc["last_flow_update"] = flow_update
        plan_doc.pop("_id", None)
        return plan_doc

    async def get_active_plans(self, user_id: str) -> List[Dict[str, Any]]:
        docs = (
            await db.agri_flow_plans.find({"user_id": user_id, "status": "active"})
            .sort("created_at", -1)
            .to_list(length=50)
        )
        for doc in docs:
            doc.pop("_id", None)
        return docs

    async def get_plan(self, user_id: str, plan_id: str) -> Optional[Dict[str, Any]]:
        doc = await db.agri_flow_plans.find_one({"user_id": user_id, "plan_id": plan_id})
        if not doc:
            return None
        doc.pop("_id", None)
        return doc

    async def update_task(self, user_id: str, task_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        plan_doc = await db.agri_flow_plans.find_one({"user_id": user_id, "tasks.task_id": task_id})
        if not plan_doc:
            return None

        tasks = plan_doc.get("tasks", [])
        updated_task: Optional[Dict[str, Any]] = None

        for task in tasks:
            if task.get("task_id") == task_id:
                task["status"] = payload.get("status", task.get("status", "pending"))
                if payload.get("due_date"):
                    task["due_date"] = payload["due_date"]
                if payload.get("note"):
                    task["note"] = payload["note"]
                task["updated_at"] = datetime.datetime.utcnow().isoformat()
                if task["status"] == "completed":
                    task["completed_at"] = datetime.datetime.utcnow().isoformat()
                updated_task = task
                break

        if not updated_task:
            return None

        stage_completion: Dict[str, Dict[str, int]] = {}
        for task in tasks:
            if task.get("task_type") == "daily":
                continue
            stage_id = task.get("stage_id")
            if stage_id not in stage_completion:
                stage_completion[stage_id] = {"total": 0, "completed": 0}
            stage_completion[stage_id]["total"] += 1
            if task.get("status") in ("completed", "skipped"):
                stage_completion[stage_id]["completed"] += 1

        stages = plan_doc.get("stages", [])
        for stage in stages:
            metrics = stage_completion.get(stage.get("stage_id"), {"total": 0, "completed": 0})
            total = metrics["total"]
            completed = metrics["completed"]
            progress = int((completed / total) * 100) if total > 0 else 0
            stage["progress_percent"] = progress

        # Keep stage state deterministic: completed stages first, then exactly one active stage.
        first_open_stage_set = False
        for stage in stages:
            progress = int(stage.get("progress_percent", 0))
            if progress >= 100:
                stage["status"] = "completed"
                continue

            if not first_open_stage_set:
                stage["status"] = "in_progress"
                first_open_stage_set = True
            else:
                stage["status"] = "pending"

        now = datetime.datetime.utcnow()
        await db.agri_flow_plans.update_one(
            {"_id": plan_doc["_id"]},
            {
                "$set": {
                    "tasks": tasks,
                    "stages": stages,
                    "updated_at": now,
                }
            },
        )

        await db.agri_flow_task_logs.insert_one(
            {
                "user_id": user_id,
                "plan_id": plan_doc.get("plan_id"),
                "task_id": task_id,
                "status": updated_task.get("status"),
                "note": payload.get("note"),
                "timestamp": now,
            }
        )

        return updated_task

    async def recompute_plan(self, user_id: str, plan_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        plan_doc = await db.agri_flow_plans.find_one({"user_id": user_id, "plan_id": plan_id, "status": "active"})
        if not plan_doc:
            return None

        rain_probability = payload.get("rain_probability", 0)
        heat_index = payload.get("heat_index", 0)

        changed_task_ids: List[str] = []
        tasks = plan_doc.get("tasks", [])

        for task in tasks:
            task_title = (task.get("title") or "").lower()
            task_due = task.get("due_date")

            if rain_probability >= 60 and "spray" in task_title and task.get("status") == "pending":
                due_date = datetime.date.fromisoformat(task_due)
                task["due_date"] = (due_date + datetime.timedelta(days=1)).isoformat()
                task["weather_adjustment"] = "Postponed due to high rain probability"
                changed_task_ids.append(task.get("task_id"))

            if heat_index >= 40 and "irrigation" in task_title and task.get("status") == "pending":
                task["priority"] = "high"
                task["weather_adjustment"] = "Raised priority due to heat stress risk"
                changed_task_ids.append(task.get("task_id"))

        now = datetime.datetime.utcnow()
        await db.agri_flow_plans.update_one(
            {"_id": plan_doc["_id"]},
            {
                "$set": {
                    "tasks": tasks,
                    "updated_at": now,
                    "last_recompute": {
                        "timestamp": now.isoformat(),
                        "input": payload,
                        "changed_task_ids": changed_task_ids,
                    },
                }
            },
        )

        plan_doc["tasks"] = tasks
        plan_doc["updated_at"] = now
        plan_doc["last_recompute"] = {
            "timestamp": now.isoformat(),
            "input": payload,
            "changed_task_ids": changed_task_ids,
        }
        plan_doc.pop("_id", None)
        return plan_doc

    async def apply_photo_assessment(
        self,
        user_id: str,
        plan_id: str,
        assessment: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        plan_doc = await db.agri_flow_plans.find_one({"user_id": user_id, "plan_id": plan_id, "status": "active"})
        if not plan_doc:
            return None

        tasks = plan_doc.get("tasks", [])
        health_score = assessment.get("health_score", 3)

        if health_score <= 2:
            tasks.append(
                {
                    "task_id": f"tsk_{uuid.uuid4().hex[:10]}",
                    "stage_id": plan_doc.get("stages", [{}])[0].get("stage_id", ""),
                    "task_type": "alert",
                    "title": "Urgent crop stress response",
                    "due_date": datetime.date.today().isoformat(),
                    "status": "pending",
                    "priority": "high",
                    "guidance": "Inspect pest/fungal stress and apply corrective action within 24 hours",
                    "source": "photo_assessment",
                }
            )

        now = datetime.datetime.utcnow()
        await db.agri_flow_plans.update_one(
            {"_id": plan_doc["_id"]},
            {
                "$set": {
                    "tasks": tasks,
                    "updated_at": now,
                    "last_photo_assessment": {
                        "timestamp": now.isoformat(),
                        **assessment,
                    },
                }
            },
        )

        plan_doc["tasks"] = tasks
        plan_doc["last_photo_assessment"] = {
            "timestamp": now.isoformat(),
            **assessment,
        }
        plan_doc["updated_at"] = now
        plan_doc.pop("_id", None)
        return plan_doc


planner_service = AgriFlowPlannerService()
