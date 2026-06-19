from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class FarmerContext:
    """Current farmer context and conditions."""

    farmer_id: str
    crop: str
    location: str
    season: str
    soil_type: str
    soil_data: Dict[str, float] = field(default_factory=dict)
    weather_data: Dict[str, float] = field(default_factory=dict)
    current_crop_stage: Optional[str] = None
    days_since_planting: Optional[int] = None
    irrigation_type: Optional[str] = None
    past_yields: List[float] = field(default_factory=list)


@dataclass
class Recommendation:
    """A single recommendation with reasoning and sources."""

    recommendation_type: str
    action: str
    details: str
    timing: str
    expected_impact: str
    confidence_score: float
    data_sources: List[str]
    rag_sources: List[str]
    cost_estimate: Optional[str] = None
    alternatives: List[str] = field(default_factory=list)


@dataclass
class RecommendationSet:
    """Complete set of recommendations for a farmer."""

    farmer_id: str
    timestamp: str
    crop: str
    location: str
    recommendations: List[Recommendation] = field(default_factory=list)
    summary: str = ""
    next_review_date: str = ""
