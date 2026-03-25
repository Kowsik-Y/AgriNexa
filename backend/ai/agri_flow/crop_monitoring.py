"""
Stage 6: Crop Monitoring - Track crop health, growth stages, and weekly image analysis.
"""

import random
from .config import GROWTH_STAGES, CROP_DATABASE


def monitor_crop(crop: str, temperature: float, humidity: float) -> dict:
    """Generate crop monitoring report with growth stages and alerts."""

    stages = GROWTH_STAGES.get(crop, [])
    crop_data = CROP_DATABASE.get(crop)

    if not stages or not crop_data:
        return {
            "crop": crop,
            "message": f"No monitoring data for {crop}.",
        }

    duration = crop_data["growth_duration_days"]

    # Generate monitoring checklist per growth stage
    stage_details = []
    days_per_stage = duration / len(stages)

    for i, stage in enumerate(stages):
        start_day = int(i * days_per_stage)
        end_day = int((i + 1) * days_per_stage)
        stage_details.append({
            "stage": stage,
            "day_range": f"Day {start_day + 1} - Day {end_day}",
            "week_range": f"Week {start_day // 7 + 1} - Week {end_day // 7 + 1}",
            "key_activities": _get_stage_activities(stage),
        })

    # Generate alerts based on conditions
    alerts = _generate_alerts(crop, temperature, humidity)

    return {
        "crop": crop,
        "total_duration_days": duration,
        "total_weeks": duration // 7,
        "growth_stages": stage_details,
        "current_alerts": alerts,
        "monitoring_schedule": {
            "field_visits": "Every 3-5 days",
            "image_capture": "Weekly (upload for AI analysis)",
            "soil_testing": "Every 30 days",
        },
    }


def analyze_weekly_image(image_bytes: bytes, crop: str, week_number: int) -> dict:
    """
    Analyze weekly crop image for health assessment.
    Currently simulated — replace with actual model inference.
    """
    health_statuses = ["Excellent", "Good", "Fair", "Needs Attention", "Critical"]
    weights = [0.25, 0.35, 0.20, 0.15, 0.05]
    health = random.choices(health_statuses, weights=weights, k=1)[0]

    observations = {
        "Excellent": [
            "Healthy green foliage with good canopy coverage",
            "No visible signs of pest damage or nutrient deficiency",
            "Uniform growth pattern across the field",
        ],
        "Good": [
            "Mostly healthy growth with minor color variations",
            "Slight leaf curling in some areas — possibly due to wind",
            "Growth is on track for this stage",
        ],
        "Fair": [
            "Some yellowing of lower leaves observed",
            "Uneven growth in patches — check soil moisture distribution",
            "Minor pest damage visible on 5-10% of plants",
        ],
        "Needs Attention": [
            "Significant yellowing or browning of leaves",
            "Pest damage visible on 20-30% of plants",
            "Stunted growth compared to expected height for this week",
        ],
        "Critical": [
            "Severe wilting or leaf drop observed",
            "Heavy pest infestation detected",
            "Immediate intervention required to prevent crop loss",
        ],
    }

    actions = {
        "Excellent": ["Continue current management practices", "Maintain irrigation schedule"],
        "Good": ["Monitor closely for next 3 days", "Ensure adequate water supply"],
        "Fair": ["Apply foliar spray for nutrient boost", "Check irrigation uniformity", "Scout for pest presence"],
        "Needs Attention": ["Immediate field inspection required", "Apply appropriate pesticide", "Check and fix irrigation issues"],
        "Critical": ["Emergency: Contact agricultural expert immediately", "Apply rescue irrigation", "Consider pesticide application"],
    }

    return {
        "week_number": week_number,
        "crop": crop,
        "health_status": health,
        "health_score": {"Excellent": 95, "Good": 80, "Fair": 60, "Needs Attention": 40, "Critical": 15}[health],
        "observations": observations[health],
        "recommended_actions": actions[health],
        "next_image_due": f"Week {week_number + 1}",
        "note": "AI-based assessment. Verify with field inspection.",
    }


def _get_stage_activities(stage: str) -> list:
    """Return key farming activities for a given growth stage."""
    activities_map = {
        "Germination": ["Ensure adequate soil moisture", "Monitor seed emergence", "Check for seedling blight"],
        "Seedling": ["Thin out weak seedlings", "Apply starter fertilizer", "Watch for cutworms"],
        "Emergence": ["Ensure adequate soil moisture", "Monitor seed emergence"],
        "Tillering": ["Apply nitrogen top dressing", "Maintain water level", "Scout for stem borers"],
        "Stem Elongation": ["Continue irrigation", "Monitor for lodging risk"],
        "Stem Extension": ["Continue irrigation", "Monitor for lodging risk"],
        "Vegetative Growth": ["Ensure proper nutrition", "Monitor pest activity"],
        "Vegetative": ["Ensure proper nutrition", "Monitor pest activity"],
        "Booting": ["Maintain consistent water supply", "Apply potassium if needed"],
        "Heading": ["Protect from birds", "Ensure no water stress"],
        "Flowering": ["Critical irrigation period", "Avoid pesticide spraying during flowering", "Watch for flower pests"],
        "Blossom": ["Critical irrigation period", "Ensure pollination"],
        "Grain Filling": ["Maintain irrigation", "Monitor for ear-head pests"],
        "Maturity": ["Reduce irrigation", "Plan harvest timing", "Arrange storage"],
        "Ripening": ["Monitor fruit maturity", "Plan harvest"],
        "Square Formation": ["Monitor for bollworm eggs", "Apply growth regulators if needed"],
        "Boll Development": ["Maintain water supply", "Scout for boll rots"],
        "Boll Opening": ["Reduce irrigation", "Prepare for picking"],
        "Grand Growth": ["Heavy irrigation required", "Apply nitrogen", "Earthing up"],
        "Peg Penetration": ["Ensure loose soil", "Light irrigation"],
        "Pod Development": ["Adequate moisture needed", "No disturbance to soil"],
        "Pod Formation": ["Maintain moisture", "Watch for pod borers"],
        "Berry Development": ["Adequate shade and moisture", "Monitor for berry borer"],
        "Branching": ["Apply nitrogen", "Inter-cultivation for weed control"],
        "Fibre Development": ["Maintain water supply", "Monitor growth height"],
        "Flag Leaf": ["Critical stage for nutrition", "Protect from diseases"],
    }

    return activities_map.get(stage, ["Monitor crop growth", "Maintain irrigation schedule", "Regular pest scouting"])


def _generate_alerts(crop: str, temperature: float, humidity: float) -> list:
    """Generate condition-based alerts."""
    alerts = []

    if temperature > 35:
        alerts.append({
            "type": "Heat Stress",
            "severity": "High",
            "message": f"Temperature ({temperature}°C) exceeds safe range for {crop}. Increase irrigation frequency.",
        })
    elif temperature < 10:
        alerts.append({
            "type": "Cold Stress",
            "severity": "High",
            "message": f"Temperature ({temperature}°C) is too low for {crop}. Consider protective measures.",
        })

    if humidity > 90:
        alerts.append({
            "type": "Fungal Disease Risk",
            "severity": "High",
            "message": "Very high humidity increases fungal disease risk. Apply preventive fungicide.",
        })
    elif humidity > 80:
        alerts.append({
            "type": "Fungal Disease Risk",
            "severity": "Medium",
            "message": "High humidity may promote fungal growth. Monitor for disease symptoms.",
        })

    if humidity < 30:
        alerts.append({
            "type": "Drought Stress",
            "severity": "High",
            "message": "Very low humidity. Check soil moisture and irrigate if needed.",
        })

    if not alerts:
        alerts.append({
            "type": "Normal",
            "severity": "Low",
            "message": "Weather conditions are favorable. Continue routine monitoring.",
        })

    return alerts
