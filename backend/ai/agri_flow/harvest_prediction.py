"""
Stage 7: Harvest Prediction - Predict harvest timing and estimate yield.
"""

from datetime import datetime, timedelta
from .config import CROP_DATABASE, SEED_VARIETIES


def predict_harvest(crop: str, temperature: float, humidity: float) -> dict:
    """Predict harvest timing and estimate yield based on crop and conditions."""

    crop_data = CROP_DATABASE.get(crop)
    varieties = SEED_VARIETIES.get(crop, [])

    if not crop_data:
        return {
            "crop": crop,
            "message": f"No harvest data for {crop}.",
        }

    base_duration = crop_data["growth_duration_days"]

    # Adjust duration based on weather
    adjustment = 0
    adjustment_reasons = []

    if temperature > 35:
        adjustment += 10
        adjustment_reasons.append("High temperature may delay maturity (+10 days)")
    elif temperature < 15:
        adjustment += 15
        adjustment_reasons.append("Low temperature slows growth (+15 days)")
    elif 25 <= temperature <= 30:
        adjustment -= 5
        adjustment_reasons.append("Optimal temperature may speed up maturity (-5 days)")

    if humidity > 85:
        adjustment += 5
        adjustment_reasons.append("High humidity may cause delayed ripening (+5 days)")
    elif humidity < 40:
        adjustment += 7
        adjustment_reasons.append("Low humidity stress may delay harvest (+7 days)")

    estimated_duration = base_duration + adjustment
    sowing_date = datetime.now()
    estimated_harvest_date = sowing_date + timedelta(days=estimated_duration)

    # Yield estimation
    best_variety = max(varieties, key=lambda v: v["yield_per_acre_kg"]) if varieties else None
    avg_yield = sum(v["yield_per_acre_kg"] for v in varieties) / len(varieties) if varieties else 0

    # Adjust yield based on conditions
    yield_factor = 1.0
    if temperature > 35 or temperature < 10:
        yield_factor *= 0.8
    if humidity < 30 or humidity > 95:
        yield_factor *= 0.85

    estimated_yield_per_acre = round(avg_yield * yield_factor)

    return {
        "crop": crop,
        "base_growth_duration_days": base_duration,
        "estimated_duration_days": estimated_duration,
        "weather_adjustments": adjustment_reasons if adjustment_reasons else ["No significant weather impact expected"],
        "estimated_sowing_date": sowing_date.strftime("%Y-%m-%d"),
        "estimated_harvest_date": estimated_harvest_date.strftime("%Y-%m-%d"),
        "estimated_harvest_week": f"Week {estimated_duration // 7}",
        "yield_estimate": {
            "per_acre_kg": estimated_yield_per_acre,
            "per_acre_tonnes": round(estimated_yield_per_acre / 1000, 2),
            "yield_condition_factor": round(yield_factor * 100, 1),
        },
        "harvest_indicators": _get_harvest_indicators(crop),
        "pre_harvest_checklist": [
            "Stop irrigation 7-10 days before expected harvest",
            "Arrange harvesting equipment/labor",
            "Prepare drying and storage facilities",
            "Check weather forecast — avoid harvesting during rain",
            "Plan transportation to market or storage",
        ],
    }


def _get_harvest_indicators(crop: str) -> list:
    """Return visual indicators that the crop is ready for harvest."""
    indicators = {
        "Rice": ["Grains are golden yellow and hard", "Moisture content below 22%", "80% of grains in panicle are mature", "Leaves are turning yellow"],
        "Wheat": ["Ears turn golden brown", "Grains are hard when pressed with thumbnail", "Moisture content 15-20%", "Straw turns yellow"],
        "Maize": ["Husks turn brown and dry", "Black layer visible at kernel base", "Moisture content 20-25%", "Milk line has reached kernel tip"],
        "Cotton": ["Bolls fully open showing white lint", "60-70% bolls open", "Avoid picking wet or green bolls"],
        "Sugarcane": ["Lower leaves dry and fall", "Brix reading above 18%", "Cane becomes yellowish", "Apply ripener 45 days before harvest"],
        "Groundnut": ["Leaves turn yellow and dry", "Inner shell has dark markings", "Kernels detach easily from shell", "Seeds are fully developed"],
        "Millets": ["Ear heads turn brown", "Grains are hard on pressing", "Birds start visiting the field", "Lower leaves dry up"],
        "Pulses": ["Pods turn brown and dry", "Seeds rattle inside pod when shaken", "Plants dry up", "Leaves drop off"],
        "Jute": ["50% plants start flowering", "Height reaches 3-4 meters", "Bark peels easily when scratched"],
        "Coffee": ["Berries turn deep red", "Berries detach easily from branch", "Skin is soft and pulpy", "Most berries in cluster are ripe"],
    }
    return indicators.get(crop, ["Monitor crop maturity visually", "Consult local agricultural expert for harvest timing"])
