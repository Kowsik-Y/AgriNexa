"""
Stage 3: Irrigation Management - Auto-suggest irrigation based on crop + conditions.
"""

from .config import IRRIGATION_THRESHOLDS, CROP_DATABASE


def recommend_irrigation(crop: str, humidity: float, temperature: float) -> dict:
    """Recommend irrigation schedule based on crop type and weather conditions."""

    thresholds = IRRIGATION_THRESHOLDS.get(crop)
    crop_data = CROP_DATABASE.get(crop)

    if not thresholds or not crop_data:
        return {
            "crop": crop,
            "message": f"No irrigation data for {crop}.",
            "general_advice": "Irrigate when top 2 inches of soil feels dry.",
        }

    # Estimate current soil moisture from humidity (simplified model)
    estimated_soil_moisture = min(95, humidity * 0.85 + (30 - abs(temperature - 25)) * 0.5)

    needs_irrigation = estimated_soil_moisture < thresholds["critical"]
    irrigation_soon = estimated_soil_moisture < thresholds["optimal"]

    # Weather-aware advice
    if humidity > 85:
        weather_note = "High humidity detected — rain likely. Delay irrigation if rain is expected."
        skip_irrigation = True
    elif temperature > 35:
        weather_note = "High temperature — increase irrigation frequency. Water early morning or late evening."
        skip_irrigation = False
    elif temperature < 10:
        weather_note = "Cold conditions — reduce irrigation frequency to avoid waterlogging."
        skip_irrigation = False
    else:
        weather_note = "Normal weather conditions."
        skip_irrigation = False

    if needs_irrigation and not skip_irrigation:
        status = "URGENT — Irrigate immediately"
        urgency = "critical"
    elif irrigation_soon and not skip_irrigation:
        status = "Schedule irrigation within 1-2 days"
        urgency = "moderate"
    else:
        status = "No immediate irrigation needed"
        urgency = "low"

    return {
        "crop": crop,
        "irrigation_status": status,
        "urgency": urgency,
        "estimated_soil_moisture": round(estimated_soil_moisture, 1),
        "optimal_moisture_range": f"{thresholds['critical']}% - {thresholds['optimal']}%",
        "recommended_method": thresholds["method"],
        "frequency": thresholds["frequency"],
        "water_requirement_total_mm": crop_data["water_requirement_mm"],
        "weather_advisory": weather_note,
        "tips": [
            "Irrigate early morning (6-8 AM) or late evening (5-7 PM)",
            "Avoid midday irrigation to reduce evaporation losses",
            f"Total water requirement for {crop}: {crop_data['water_requirement_mm']} mm over the crop cycle",
        ],
    }
