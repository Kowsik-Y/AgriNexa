from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

# Canonical agronomic crop profiles: (N_mean, N_std, P_mean, P_std, K_mean, K_std, pH_mean, pH_std, Temp_mean, Temp_std, Humidity_mean, Humidity_std, Rain_mean, Rain_std)
CROP_DATASETS: Dict[str, Dict[str, Any]] = {
    "Rice": {
        "n": (80, 20), "p": (48, 12), "k": (40, 10), "ph": (6.5, 0.6),
        "temp": (24, 4), "humidity": (82, 8), "rainfall": (230, 45),
        "season": "Kharif", "soil": "Alluvial / Clay Loam",
        "description": "High water and moderate nutrient requirement. Highly suited for delta and canal-irrigated basins.",
        "tamil_name": "நெல் (Rice)",
    },
    "Maize": {
        "n": (78, 18), "p": (48, 14), "k": (20, 8), "ph": (6.5, 0.7),
        "temp": (22, 5), "humidity": (65, 12), "rainfall": (85, 25),
        "season": "Kharif / Rabi", "soil": "Well-drained Loam / Red Soil",
        "description": "Fast-growing cereal crop with good drought resilience and strong market feed demand.",
        "tamil_name": "மக்காச்சோளம் (Maize)",
    },
    "Cotton": {
        "n": (118, 20), "p": (46, 12), "k": (20, 6), "ph": (6.9, 0.8),
        "temp": (24, 4), "humidity": (80, 10), "rainfall": (80, 20),
        "season": "Kharif", "soil": "Deep Black / Clay Loam",
        "description": "Cash crop with high nitrogen requirement. Flourishes in deep black cotton soils.",
        "tamil_name": "பருத்தி (Cotton)",
    },
    "Sugarcane": {
        "n": (150, 30), "p": (60, 15), "k": (80, 20), "ph": (6.8, 0.6),
        "temp": (28, 5), "humidity": (75, 10), "rainfall": (180, 40),
        "season": "Whole Year", "soil": "Heavy Loam / Alluvial",
        "description": "High-biomass long duration crop. Requires intensive irrigation and balanced N-K nutrition.",
        "tamil_name": "கரும்பு (Sugarcane)",
    },
    "Groundnut": {
        "n": (22, 8), "p": (45, 10), "k": (25, 8), "ph": (6.2, 0.5),
        "temp": (27, 4), "humidity": (60, 10), "rainfall": (65, 20),
        "season": "Kharif / Zaid", "soil": "Sandy Loam / Red Soil",
        "description": "Leguminous oilseed that fixes atmospheric nitrogen. Excellent for well-drained sandy loam.",
        "tamil_name": "நிலக்கடலை (Groundnut)",
    },
    "Wheat": {
        "n": (100, 20), "p": (50, 12), "k": (30, 8), "ph": (6.5, 0.5),
        "temp": (18, 4), "humidity": (55, 10), "rainfall": (50, 15),
        "season": "Rabi", "soil": "Alluvial / Clay Loam",
        "description": "Cool-season staple crop requiring cooler temperatures during tillering and grain filling.",
        "tamil_name": "கோதுமை (Wheat)",
    },
    "Chickpea": {
        "n": (40, 10), "p": (68, 15), "k": (80, 15), "ph": (7.3, 0.6),
        "temp": (19, 3), "humidity": (17, 5), "rainfall": (80, 15),
        "season": "Rabi", "soil": "Sandy Loam / Light Black",
        "description": "Drought-tolerant pulse with low nitrogen demand and high phosphorus response.",
        "tamil_name": "கொண்டைக்கடலை (Chickpea)",
    },
    "Pigeonpeas": {
        "n": (21, 6), "p": (68, 12), "k": (20, 6), "ph": (5.7, 0.6),
        "temp": (28, 4), "humidity": (48, 10), "rainfall": (150, 30),
        "season": "Kharif", "soil": "Well-drained Loam",
        "description": "Deep-rooted pulse crop resilient to intermittent dry spells.",
        "tamil_name": "துவரை (Pigeonpea)",
    },
    "Blackgram": {
        "n": (40, 10), "p": (67, 12), "k": (19, 5), "ph": (7.1, 0.5),
        "temp": (30, 3), "humidity": (65, 8), "rainfall": (68, 15),
        "season": "Kharif / Summer", "soil": "Loamy / Alluvial",
        "description": "Short duration pulse ideal for intercropping or crop rotation after rice harvest.",
        "tamil_name": "உளுந்து (Blackgram)",
    },
    "Tomato": {
        "n": (100, 25), "p": (55, 15), "k": (60, 15), "ph": (6.5, 0.5),
        "temp": (24, 5), "humidity": (65, 10), "rainfall": (90, 25),
        "season": "Whole Year", "soil": "Rich Sandy Loam",
        "description": "High value vegetable crop with sensitive water and potassium requirements for fruit quality.",
        "tamil_name": "தக்காளி (Tomato)",
    },
    "Banana": {
        "n": (100, 20), "p": (75, 15), "k": (50, 12), "ph": (6.0, 0.5),
        "temp": (27, 3), "humidity": (80, 8), "rainfall": (105, 20),
        "season": "Whole Year", "soil": "Deep Rich Loamy Soil",
        "description": "Heavy feeder of potassium and moisture. Requires warm, humid, protected conditions.",
        "tamil_name": "வாழை (Banana)",
    },
    "Watermelon": {
        "n": (99, 15), "p": (17, 5), "k": (50, 10), "ph": (6.5, 0.5),
        "temp": (26, 4), "humidity": (88, 6), "rainfall": (50, 12),
        "season": "Zaid / Summer", "soil": "Sandy Riverbeds / Light Loam",
        "description": "Warm-season cucurbit that performs best in well-drained sandy loam with warm sun.",
        "tamil_name": "தர்பூசணி (Watermelon)",
    },
}


def _gaussian_score(val: float, mean: float, std: float) -> float:
    """Calculate Gaussian probability density normalized to [0, 1]."""
    diff = val - mean
    exponent = -(diff ** 2) / (2 * (std ** 2))
    return math.exp(max(exponent, -15.0))


def recommend_crops(
    n: float,
    p: float,
    k: float,
    ph: float,
    temp: Optional[float] = None,
    humidity: Optional[float] = None,
    rainfall: Optional[float] = None,
    season: Optional[str] = None,
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Evaluates soil N-P-K, pH and optional climate parameters against agronomic crop models.
    Returns ranked crop recommendations with suitability percentage and nutrient insights.
    """
    # Sensible climate defaults if not provided
    temp_val = temp if temp is not None else 26.0
    hum_val = humidity if humidity is not None else 65.0
    rain_val = rainfall if rainfall is not None else 90.0

    scored_crops = []

    for crop_name, profile in CROP_DATASETS.items():
        # Feature suitability weights
        w_n = _gaussian_score(n, profile["n"][0], profile["n"][1])
        w_p = _gaussian_score(p, profile["p"][0], profile["p"][1])
        w_k = _gaussian_score(k, profile["k"][0], profile["k"][1])
        w_ph = _gaussian_score(ph, profile["ph"][0], profile["ph"][1])
        w_temp = _gaussian_score(temp_val, profile["temp"][0], profile["temp"][1])
        w_hum = _gaussian_score(hum_val, profile["humidity"][0], profile["humidity"][1])
        w_rain = _gaussian_score(rain_val, profile["rainfall"][0], profile["rainfall"][1])

        # Season matching bonus/penalty
        season_match = 1.0
        if season and season.lower() != "all" and season.lower() not in profile["season"].lower():
            season_match = 0.85

        # Weighted harmonic composite score: soil (50%), climate (40%), season (10%)
        soil_score = (w_n * 0.35) + (w_p * 0.25) + (w_k * 0.25) + (w_ph * 0.15)
        climate_score = (w_temp * 0.35) + (w_hum * 0.30) + (w_rain * 0.35)
        composite = (soil_score * 0.55 + climate_score * 0.35 + season_match * 0.10) * 100

        # Bound to realistic confidence scale (55% to 98%)
        scaled_score = min(max(round(composite, 1), 45.0), 98.5)

        # Nutrient gap analysis
        deficits = []
        if n < profile["n"][0] - profile["n"][1]:
            deficits.append(f"Nitrogen deficit: Soil has {n:.0f} kg/ha (ideal: {profile['n'][0]} kg/ha)")
        elif n > profile["n"][0] + (profile["n"][1] * 1.5):
            deficits.append(f"Excess Nitrogen: May cause vegetative overgrowth")

        if p < profile["p"][0] - profile["p"][1]:
            deficits.append(f"Phosphorus deficit: Apply DAP or SSP")
        if k < profile["k"][0] - profile["k"][1]:
            deficits.append(f"Potassium deficit: Apply Muriate of Potash (MOP)")

        if ph < profile["ph"][0] - profile["ph"][1]:
            deficits.append(f"Acidic soil for this crop: Consider agricultural lime application")
        elif ph > profile["ph"][0] + profile["ph"][1]:
            deficits.append(f"Alkaline soil for this crop: Consider gypsum application")

        scored_crops.append({
            "crop": crop_name,
            "tamil_name": profile["tamil_name"],
            "score": scaled_score,
            "suitability": "Highly Recommended" if scaled_score >= 85 else ("Suitable" if scaled_score >= 70 else "Moderately Suitable"),
            "season": profile["season"],
            "soil_type": profile["soil"],
            "ideal_npk": f"{profile['n'][0]}-{profile['p'][0]}-{profile['k'][0]} (pH {profile['ph'][0]})",
            "description": profile["description"],
            "nutrient_notes": deficits or ["Soil nutrient levels are well-balanced for this crop."],
        })

    scored_crops.sort(key=lambda x: x["score"], reverse=True)
    return scored_crops[:top_k]
