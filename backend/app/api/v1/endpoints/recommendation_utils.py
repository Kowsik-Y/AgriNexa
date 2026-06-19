def build_farmer_context_data(profile: dict, current_user: str, crops: str) -> dict:
    return {
        "farmer_id": current_user,
        "crop": crops.lower(),
        "location": profile.get("district") or profile.get("state") or "Tamil Nadu",
        "season": profile.get("season") or "kharif",
        "soil_type": profile.get("soil_type") or "loamy",
        "soil_data": {
            "nitrogen": float(profile.get("nitrogen", 80) or 80),
            "phosphorus": float(profile.get("phosphorus", 40) or 40),
            "potassium": float(profile.get("potassium", 40) or 40),
            "ph": float(profile.get("ph", 6.5) or 6.5),
        },
        "weather_data": {
            "temperature": float(profile.get("temperature", 28) or 28),
            "humidity": float(profile.get("humidity", 70) or 70),
            "rainfall": float(profile.get("rainfall", 2) or 2),
        },
        "current_crop_stage": profile.get("flow_stage"),
        "days_since_planting": int(profile.get("days_since_planting", 30) or 30),
        "irrigation_type": profile.get("irrigation_type") or "drip",
    }


def format_recommendations(rec_set) -> list:
    response = []
    for idx, rec in enumerate(rec_set.recommendations, start=1):
        response.append(
            {
                "id": idx,
                "title": rec.recommendation_type.replace("_", " ").title(),
                "text": f"{rec.action}. {rec.details}",
                "confidence": round(rec.confidence_score, 2),
                "timing": rec.timing,
                "impact": rec.expected_impact,
            }
        )
    return response


def fallback_advice(crops: str) -> list:
    return [
        {
            "id": 1,
            "title": "Irrigation",
            "text": f"Water your {crops} today before 10 AM.",
        },
        {
            "id": 2,
            "title": "Fertilizer",
            "text": "Apply Nitrogen-based fertilizer this week.",
        },
        {
            "id": 3,
            "title": "Crop Health",
            "text": "Check for early blight signs in your fields.",
        },
    ]


def crop_recommendation_map() -> dict:
    return {
        "rice": [
            {"id": 1, "text": "Apply potassium during flowering stage.", "timing": "Week 8-10"},
            {"id": 2, "text": "Check for stem borer pest weekly.", "timing": "Week 6-12"},
            {"id": 3, "text": "Ensure 5cm standing water during growth.", "timing": "Week 4-12"},
        ],
        "wheat": [
            {"id": 1, "text": "Apply nitrogen at tillering stage.", "timing": "Week 4-6"},
            {"id": 2, "text": "Monitor for rust disease.", "timing": "Week 8-14"},
            {"id": 3, "text": "Reduce irrigation frequency at maturity.", "timing": "Week 14-16"},
        ],
        "tomato": [
            {"id": 1, "text": "Support plants with stakes at week 3.", "timing": "Week 3"},
            {"id": 2, "text": "Prune to 2-3 stems for better yield.", "timing": "Week 4"},
            {"id": 3, "text": "Check for early blight regularly.", "timing": "Week 6-12"},
        ],
    }
