import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class SoilInput(BaseModel):
    nitrogen: float = Field(..., ge=0, le=300)
    phosphorus: float = Field(..., ge=0, le=200)
    potassium: float = Field(..., ge=0, le=300)
    ph: float = Field(..., ge=0, le=14)
    temperature: float = Field(..., ge=-10, le=55)
    humidity: float = Field(..., ge=0, le=100)


class PlanCreateRequest(BaseModel):
    field_id: Optional[str] = Field(default=None)
    field_name: Optional[str] = Field(default="Primary Field")
    location: str = Field(..., min_length=2, max_length=200)
    location_meta: Dict[str, Any] = Field(default_factory=dict)
    soil_type: Optional[str] = Field(default=None, max_length=100)
    soil_input: Optional[SoilInput] = Field(default=None)
    crop: Optional[str] = Field(default=None, max_length=100)
    irrigation_type: Optional[str] = Field(default=None, max_length=60)
    planting_date: Optional[datetime.date] = Field(default=None)


class TaskUpdateRequest(BaseModel):
    status: Literal["pending", "in_progress", "completed", "skipped"]
    note: Optional[str] = Field(default=None, max_length=500)
    due_date: Optional[datetime.date] = None


class RecomputeRequest(BaseModel):
    rain_probability: float = Field(default=0, ge=0, le=100)
    heat_index: float = Field(default=0, ge=-10, le=70)
    humidity: Optional[float] = Field(default=None, ge=0, le=100)
    note: Optional[str] = Field(default=None, max_length=500)


class PhotoAnalyzeRequest(BaseModel):
    plan_id: str = Field(..., min_length=8, max_length=120)
    crop: str = Field(..., min_length=2, max_length=80)
    growth_stage_day: int = Field(default=1, ge=1, le=365)
    health_score: int = Field(default=3, ge=1, le=5)
    temperature: Optional[float] = Field(default=None, ge=-10, le=55)
    humidity: Optional[float] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class CropRecommendation(BaseModel):
    crop: str
    score: float
    reason: str


class PlanTask(BaseModel):
    task_id: str
    stage_id: str
    task_type: str
    title: str
    due_date: str
    status: str
    priority: str
    guidance: str
    source: str


class PlanStage(BaseModel):
    stage_id: str
    sequence: int
    stage_name: str
    start_date: str
    end_date: str
    duration_days: int
    focus: str
    status: str
    progress_percent: int


class WeeklyMilestone(BaseModel):
    week_number: int
    stage: str
    goal: str
    window_start: str
    window_end: str


class PlanResponse(BaseModel):
    plan_id: str
    user_id: str
    field_id: str
    field_name: str
    location: str
    location_meta: Dict[str, Any]
    soil_type: Optional[str]
    soil_input: Optional[Dict[str, Any]]
    crop: str
    crop_recommendations: List[CropRecommendation] = Field(default_factory=list)
    irrigation_type: Optional[str]
    planting_date: str
    stages: List[PlanStage] = Field(default_factory=list)
    tasks: List[PlanTask] = Field(default_factory=list)
    weekly_plan: List[WeeklyMilestone] = Field(default_factory=list)
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_photo_assessment: Optional[Dict[str, Any]] = None


class StageModelTestRequest(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    location: Optional[str] = Field(default=None, max_length=200)
    growth_stage_day: int = Field(default=30, ge=1, le=365)
    health_score: int = Field(default=3, ge=1, le=5)
    temperature: float = Field(default=28, ge=-10, le=55)
    humidity: float = Field(default=70, ge=0, le=100)
    nitrogen: float = Field(default=80, ge=0, le=300)
    phosphorus: float = Field(default=40, ge=0, le=200)
    potassium: float = Field(default=40, ge=0, le=300)
    ph: float = Field(default=6.5, ge=0, le=14)


class UpdateFarmingFlowRequest(BaseModel):
    field_name: str = Field(..., min_length=2, max_length=100)
    location: str = Field(..., min_length=2, max_length=200)
    crop: str = Field(..., min_length=2, max_length=80)
    flow_stage: Literal[
        "land_preparation",
        "sowing",
        "vegetative",
        "flowering",
        "harvest",
        "post_harvest",
    ]
    growth_stage_day: int = Field(default=1, ge=1, le=365)
    notes: Optional[str] = Field(default=None, max_length=500)
