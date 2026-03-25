"""
Stage 4: Fertilizer Recommendation - Analyze nutrient deficiencies and recommend fertilizers.
"""

from .config import CROP_DATABASE, FERTILIZER_MAP


def recommend_fertilizer(nitrogen: float, phosphorus: float, potassium: float, crop: str) -> dict:
    """Analyze NPK deficiencies vs crop requirements and recommend fertilizers."""

    crop_data = CROP_DATABASE.get(crop)
    if not crop_data:
        return {
            "crop": crop,
            "message": f"No fertilizer data for {crop}.",
            "general_advice": "Get soil tested at nearest agricultural lab.",
        }

    recommendations = []
    deficiencies = []

    # Check Nitrogen
    n_low, n_high = crop_data["nitrogen"]
    n_optimal = (n_low + n_high) / 2
    if nitrogen < n_low:
        deficit = round(n_optimal - nitrogen, 1)
        deficiencies.append({"nutrient": "Nitrogen", "current": nitrogen, "required": n_optimal, "deficit": deficit})
        fert = FERTILIZER_MAP["nitrogen"]
        recommendations.append({
            "nutrient": "Nitrogen",
            "status": "Deficient",
            "fertilizer": fert["fertilizer"],
            "dosage": fert["dosage_per_acre_kg"],
            "application_method": fert["application"],
            "note": fert["note"],
        })
    elif nitrogen > n_high:
        recommendations.append({
            "nutrient": "Nitrogen",
            "status": "Excess",
            "fertilizer": "None — reduce nitrogen application",
            "note": "Excess nitrogen can cause lodging and pest susceptibility",
        })

    # Check Phosphorus
    p_low, p_high = crop_data["phosphorus"]
    p_optimal = (p_low + p_high) / 2
    if phosphorus < p_low:
        deficit = round(p_optimal - phosphorus, 1)
        deficiencies.append({"nutrient": "Phosphorus", "current": phosphorus, "required": p_optimal, "deficit": deficit})
        fert = FERTILIZER_MAP["phosphorus"]
        recommendations.append({
            "nutrient": "Phosphorus",
            "status": "Deficient",
            "fertilizer": fert["fertilizer"],
            "dosage": fert["dosage_per_acre_kg"],
            "application_method": fert["application"],
            "note": fert["note"],
        })
    elif phosphorus > p_high:
        recommendations.append({
            "nutrient": "Phosphorus",
            "status": "Excess",
            "fertilizer": "None — skip phosphatic fertilizers this season",
            "note": "Excess phosphorus can block zinc and iron uptake",
        })

    # Check Potassium
    k_low, k_high = crop_data["potassium"]
    k_optimal = (k_low + k_high) / 2
    if potassium < k_low:
        deficit = round(k_optimal - potassium, 1)
        deficiencies.append({"nutrient": "Potassium", "current": potassium, "required": k_optimal, "deficit": deficit})
        fert = FERTILIZER_MAP["potassium"]
        recommendations.append({
            "nutrient": "Potassium",
            "status": "Deficient",
            "fertilizer": fert["fertilizer"],
            "dosage": fert["dosage_per_acre_kg"],
            "application_method": fert["application"],
            "note": fert["note"],
        })
    elif potassium > k_high:
        recommendations.append({
            "nutrient": "Potassium",
            "status": "Excess",
            "fertilizer": "None — reduce potash application",
            "note": "Excess potassium can interfere with calcium and magnesium uptake",
        })

    # If all nutrients are within range
    if not recommendations:
        recommendations.append({
            "nutrient": "All",
            "status": "Adequate",
            "fertilizer": "Balanced NPK (10:26:26) as maintenance dose",
            "dosage": 25,
            "application_method": "Apply as basal dose at sowing",
            "note": "Nutrients are within optimal range — maintain with balanced fertilization",
        })

    return {
        "crop": crop,
        "deficiencies": deficiencies,
        "recommendations": recommendations,
        "optimal_ranges": {
            "nitrogen": f"{n_low}-{n_high} kg/ha",
            "phosphorus": f"{p_low}-{p_high} kg/ha",
            "potassium": f"{k_low}-{k_high} kg/ha",
        },
    }
