"""
Stage 1: Land Preparation - Soil analysis and crop prediction.
"""

from .config import CROP_DATABASE


def analyze_soil(nitrogen: float, phosphorus: float, potassium: float,
                 ph: float, temperature: float, humidity: float) -> dict:
    """Analyze soil quality and provide land preparation suggestions."""

    # ── Soil quality assessment ──
    soil_quality = "Good"
    issues = []

    if nitrogen < 30:
        soil_quality = "Poor"
        issues.append("Very low nitrogen — heavy organic matter needed")
    elif nitrogen < 60:
        issues.append("Low nitrogen — add green manure or compost")

    if phosphorus < 20:
        soil_quality = "Poor"
        issues.append("Very low phosphorus — add bone meal or rock phosphate")
    elif phosphorus < 35:
        issues.append("Low phosphorus — apply phosphatic fertilizer")

    if potassium < 15:
        soil_quality = "Poor"
        issues.append("Very low potassium — add wood ash or potash")
    elif potassium < 30:
        issues.append("Low potassium — apply muriate of potash")

    if ph < 5.0:
        soil_quality = "Poor"
        issues.append("Highly acidic soil — apply lime to raise pH")
    elif ph < 5.5:
        issues.append("Acidic soil — consider liming")
    elif ph > 8.0:
        issues.append("Alkaline soil — apply gypsum to lower pH")
    elif ph > 7.5:
        issues.append("Slightly alkaline — monitor pH levels")

    if not issues:
        issues.append("Soil conditions are favorable for most crops")

    if soil_quality == "Good" and len(issues) > 1:
        soil_quality = "Moderate"

    # ── Land preparation suggestions ──
    preparation = []

    if ph < 5.5 or ph > 7.5:
        preparation.append("Soil amendment required before ploughing")

    if humidity > 80:
        preparation.append("Deep ploughing recommended — soil may be waterlogged")
        preparation.append("Ensure proper drainage channels")
    else:
        preparation.append("Standard ploughing (2-3 times) with disc plough")

    preparation.append("Level the field using laser leveler for uniform water distribution")

    if nitrogen < 50:
        preparation.append("Add FYM (Farm Yard Manure) at 10 tonnes/acre before final ploughing")

    preparation.append("Form ridges and furrows or raised beds based on crop requirement")

    return {
        "soil_quality": soil_quality,
        "nutrient_levels": {
            "nitrogen": {"value": nitrogen, "status": "Low" if nitrogen < 60 else "Medium" if nitrogen < 100 else "High"},
            "phosphorus": {"value": phosphorus, "status": "Low" if phosphorus < 35 else "Medium" if phosphorus < 60 else "High"},
            "potassium": {"value": potassium, "status": "Low" if potassium < 30 else "Medium" if potassium < 55 else "High"},
            "ph": {"value": ph, "status": "Acidic" if ph < 6.0 else "Neutral" if ph <= 7.5 else "Alkaline"},
        },
        "issues": issues,
        "preparation_steps": preparation,
    }


def predict_crop(nitrogen: float, phosphorus: float, potassium: float,
                 ph: float, temperature: float, humidity: float) -> dict:
    """Predict the best crop based on soil and weather conditions."""

    scores = {}

    for crop, ranges in CROP_DATABASE.items():
        score = 0.0

        # Score each parameter (0-1) based on how well it fits the optimal range
        for param, value in [
            ("nitrogen", nitrogen), ("phosphorus", phosphorus),
            ("potassium", potassium), ("ph", ph),
            ("temperature", temperature), ("humidity", humidity),
        ]:
            low, high = ranges[param]
            mid = (low + high) / 2
            spread = (high - low) / 2

            if low <= value <= high:
                # Within optimal range — score by closeness to midpoint
                score += 1.0 - (abs(value - mid) / (spread * 2)) * 0.3
            else:
                # Outside range — penalize by distance
                distance = min(abs(value - low), abs(value - high))
                max_possible = spread * 2
                penalty = min(distance / max_possible, 1.0)
                score += max(0, 0.5 - penalty)

        scores[crop] = round(score / 6, 3)  # normalize to 0-1

    # Sort by score descending
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    top_crop = ranked[0][0]
    top_score = ranked[0][1]

    return {
        "predicted_crop": top_crop,
        "confidence": round(top_score * 100, 1),
        "top_3_crops": [
            {"crop": crop, "suitability_score": round(s * 100, 1)}
            for crop, s in ranked[:3]
        ],
        "growth_duration_days": CROP_DATABASE[top_crop]["growth_duration_days"],
        "water_requirement_mm": CROP_DATABASE[top_crop]["water_requirement_mm"],
    }
