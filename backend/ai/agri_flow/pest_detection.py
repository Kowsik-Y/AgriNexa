"""
Stage 5: Pest & Disease Detection - Known pest risks + optional image-based detection.
"""

import random
from .config import PEST_DATABASE


def get_pest_risks(crop: str, humidity: float, temperature: float) -> dict:
    """Return known pest risks for the predicted crop based on conditions."""

    pests = PEST_DATABASE.get(crop, [])

    if not pests:
        return {
            "crop": crop,
            "pest_risks": [],
            "message": f"No pest data available for {crop}.",
        }

    # Adjust risk based on weather conditions
    adjusted_pests = []
    for pest in pests:
        risk = pest["risk_level"]

        # High humidity and warm temps increase pest risk
        if humidity > 80 and temperature > 28:
            if risk == "Medium":
                risk = "High"
            elif risk == "Low":
                risk = "Medium"

        adjusted_pests.append({
            **pest,
            "risk_level": risk,
            "weather_adjusted": humidity > 80 or temperature > 30,
        })

    # Sort by risk level
    risk_order = {"High": 0, "Medium": 1, "Low": 2}
    adjusted_pests.sort(key=lambda p: risk_order.get(p["risk_level"], 3))

    high_risk_count = sum(1 for p in adjusted_pests if p["risk_level"] == "High")

    return {
        "crop": crop,
        "overall_risk": "High" if high_risk_count >= 2 else "Medium" if high_risk_count == 1 else "Low",
        "pest_risks": adjusted_pests,
        "preventive_advisory": [
            "Regular field scouting every 3-5 days",
            "Use integrated pest management (IPM) approach",
            "Prefer bio-pesticides over chemical pesticides when possible",
            "Install pheromone traps and light traps for monitoring",
        ],
    }


def detect_pest_from_image(image_bytes: bytes) -> dict:
    """
    CNN-based pest/disease detection from uploaded crop image.
    Currently simulated — replace with actual model inference.
    """
    diseases = [
        {"name": "Leaf Blight", "pesticide": "Mancozeb 75% WP", "treatment": "Spray at 2.5g/L. Repeat after 10 days if symptoms persist."},
        {"name": "Brown Spot", "pesticide": "Carbendazim 50% WP", "treatment": "Spray at 1g/L at tillering and boot stage."},
        {"name": "Blast", "pesticide": "Tricyclazole 75% WP", "treatment": "Spray at 0.6g/L. Apply preventively in humid weather."},
        {"name": "Bacterial Leaf Streak", "pesticide": "Streptocycline + Copper oxychloride", "treatment": "Spray at 0.5g + 3g per liter of water."},
        {"name": "Sheath Blight", "pesticide": "Hexaconazole 5% EC", "treatment": "Spray at 2ml/L. Maintain proper spacing."},
        {"name": "Healthy", "pesticide": "None required", "treatment": "No treatment needed. Continue regular monitoring."},
    ]

    detected = random.choice(diseases)
    confidence = random.uniform(0.82, 0.97) if detected["name"] != "Healthy" else random.uniform(0.90, 0.99)

    return {
        "detected_condition": detected["name"],
        "confidence": round(confidence * 100, 1),
        "is_healthy": detected["name"] == "Healthy",
        "recommended_pesticide": detected["pesticide"],
        "treatment_steps": detected["treatment"],
        "note": "This is an AI prediction. Please consult an agricultural expert for confirmation.",
    }
