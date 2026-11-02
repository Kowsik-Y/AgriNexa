from __future__ import annotations

from typing import Any, Dict, Optional

# Indian agricultural yield benchmarks (Quintals per Acre) and average mandi prices (INR per Quintal)
CROP_YIELD_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "Rice": {
        "base_yield_per_acre": 22.0,  # Quintals/acre (~5.5 tonnes/ha)
        "std_yield": 4.0,
        "price_per_quintal": 2300,    # MSP / mandi average
        "duration_days": 120,
        "water_req_level": "High",
        "optimal_soils": ["Alluvial", "Clay Loam", "Delta Soil"],
        "tamil_name": "நெல் (Rice)",
    },
    "Wheat": {
        "base_yield_per_acre": 18.0,  # Quintals/acre
        "std_yield": 3.0,
        "price_per_quintal": 2275,
        "duration_days": 130,
        "water_req_level": "Medium",
        "optimal_soils": ["Alluvial", "Clay Loam", "Loam"],
        "tamil_name": "கோதுமை (Wheat)",
    },
    "Maize": {
        "base_yield_per_acre": 25.0,
        "std_yield": 5.0,
        "price_per_quintal": 2090,
        "duration_days": 105,
        "water_req_level": "Medium",
        "optimal_soils": ["Red Soil", "Loam", "Alluvial"],
        "tamil_name": "மக்காச்சோளம் (Maize)",
    },
    "Cotton": {
        "base_yield_per_acre": 9.5,   # Kapas quintals/acre
        "std_yield": 2.2,
        "price_per_quintal": 7120,
        "duration_days": 160,
        "water_req_level": "Medium",
        "optimal_soils": ["Black Soil", "Deep Loam"],
        "tamil_name": "பருத்தி (Cotton)",
    },
    "Sugarcane": {
        "base_yield_per_acre": 350.0, # Tonnes/acre ~ 35 tonnes = 350 quintals
        "std_yield": 50.0,
        "price_per_quintal": 340,
        "duration_days": 330,
        "water_req_level": "Very High",
        "optimal_soils": ["Alluvial", "Clay Loam", "Black Soil"],
        "tamil_name": "கரும்பு (Sugarcane)",
    },
    "Groundnut": {
        "base_yield_per_acre": 10.5,
        "std_yield": 2.0,
        "price_per_quintal": 6375,
        "duration_days": 110,
        "water_req_level": "Low-Medium",
        "optimal_soils": ["Sandy Loam", "Red Soil"],
        "tamil_name": "நிலக்கடலை (Groundnut)",
    },
    "Tomato": {
        "base_yield_per_acre": 120.0,
        "std_yield": 25.0,
        "price_per_quintal": 1800,
        "duration_days": 90,
        "water_req_level": "Medium",
        "optimal_soils": ["Sandy Loam", "Red Soil"],
        "tamil_name": "தக்காளி (Tomato)",
    },
    "Chickpea": {
        "base_yield_per_acre": 7.5,
        "std_yield": 1.5,
        "price_per_quintal": 5440,
        "duration_days": 100,
        "water_req_level": "Low",
        "optimal_soils": ["Black Soil", "Loam"],
        "tamil_name": "கொண்டைக்கடலை (Chickpea)",
    },
    "Blackgram": {
        "base_yield_per_acre": 4.5,
        "std_yield": 1.0,
        "price_per_quintal": 6950,
        "duration_days": 75,
        "water_req_level": "Low",
        "optimal_soils": ["Alluvial", "Loam", "Clay Loam"],
        "tamil_name": "உளுந்து (Blackgram)",
    },
    "Banana": {
        "base_yield_per_acre": 180.0,
        "std_yield": 30.0,
        "price_per_quintal": 2200,
        "duration_days": 365,
        "water_req_level": "High",
        "optimal_soils": ["Alluvial", "Rich Clay Loam"],
        "tamil_name": "வாழை (Banana)",
    },
}

SOIL_MULTIPLIERS: Dict[str, float] = {
    "alluvial": 1.15,
    "black": 1.12,
    "red": 1.00,
    "clay loam": 1.08,
    "sandy loam": 0.95,
    "laterite": 0.88,
    "sandy": 0.82,
}

IRRIGATION_MULTIPLIERS: Dict[str, float] = {
    "drip": 1.25,
    "sprinkler": 1.15,
    "canal": 1.08,
    "borewell": 1.05,
    "rainfed": 0.82,
}

FERTILIZER_MULTIPLIERS: Dict[str, float] = {
    "balanced": 1.15,
    "high": 1.05,
    "organic": 0.95,
    "low": 0.80,
}


def predict_crop_yield(
    crop_name: str,
    area: float,
    area_unit: str = "acres",
    season: Optional[str] = None,
    soil_type: Optional[str] = None,
    irrigation_type: Optional[str] = None,
    fertilizer_level: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Predicts agricultural crop yield and revenue based on farm size, soil, and management practices.
    """
    # Normalize crop name match
    matched_crop = None
    for k in CROP_YIELD_BENCHMARKS:
        if k.lower() == crop_name.lower() or crop_name.lower() in k.lower():
            matched_crop = k
            break

    if not matched_crop:
        # Default fallback to Rice
        matched_crop = "Rice"

    profile = CROP_YIELD_BENCHMARKS[matched_crop]
    base_yield = profile["base_yield_per_acre"]

    # Convert area to acres for unified computation
    unit = area_unit.lower()
    acres = area * 2.47105 if "hect" in unit else area

    # Calculate adjustment coefficients
    soil_mult = 1.0
    if soil_type:
        for k, v in SOIL_MULTIPLIERS.items():
            if k in soil_type.lower():
                soil_mult = v
                break

    irrig_mult = 1.0
    if irrigation_type:
        for k, v in IRRIGATION_MULTIPLIERS.items():
            if k in irrigation_type.lower():
                irrig_mult = v
                break

    fert_mult = 1.0
    if fertilizer_level:
        for k, v in FERTILIZER_MULTIPLIERS.items():
            if k in fertilizer_level.lower():
                fert_mult = v
                break

    combined_factor = soil_mult * irrig_mult * fert_mult
    expected_yield_per_acre = round(base_yield * combined_factor, 1)
    min_yield_per_acre = round(expected_yield_per_acre * 0.85, 1)
    max_yield_per_acre = round(expected_yield_per_acre * 1.18, 1)

    total_expected = round(expected_yield_per_acre * acres, 1)
    total_min = round(min_yield_per_acre * acres, 1)
    total_max = round(max_yield_per_acre * acres, 1)

    # Financial projection
    price_per_q = profile["price_per_quintal"]
    est_revenue = round(total_expected * price_per_q)
    min_revenue = round(total_min * price_per_q)
    max_revenue = round(total_max * price_per_q)

    # Management tips for yield gap closure
    gap_closure_actions = []
    if irrig_mult < 1.0:
        gap_closure_actions.append("Adopt micro-irrigation (Drip/Sprinkler) to boost yield by up to 25%.")
    if fert_mult < 1.0:
        gap_closure_actions.append("Conduct a soil test to apply balanced NPK plus zinc/boron micronutrients.")
    if soil_mult < 1.0:
        gap_closure_actions.append("Incorporate 5 tonnes/acre of well-rotted Farmyard Manure (FYM) to improve water retention.")
    if not gap_closure_actions:
        gap_closure_actions.append("Maintain optimal plant density and timely weed management during the critical 15-45 day window.")

    return {
        "crop": matched_crop,
        "tamil_name": profile["tamil_name"],
        "input_area": area,
        "input_unit": area_unit,
        "calculated_acres": round(acres, 2),
        "yield_per_acre": {
            "expected_quintals": expected_yield_per_acre,
            "min_quintals": min_yield_per_acre,
            "max_quintals": max_yield_per_acre,
        },
        "total_production": {
            "expected_quintals": total_expected,
            "min_quintals": total_min,
            "max_quintals": total_max,
            "unit": "Quintals (100 kg)",
        },
        "financial_forecast": {
            "modal_price_per_quintal": price_per_q,
            "expected_gross_revenue_inr": est_revenue,
            "revenue_range_inr": f"₹{min_revenue:,} - ₹{max_revenue:,}",
            "formatted_revenue": f"₹{est_revenue:,}",
        },
        "growth_profile": {
            "duration_days": profile["duration_days"],
            "water_requirement": profile["water_req_level"],
            "optimal_soils": profile["optimal_soils"],
        },
        "yield_factor": round(combined_factor, 2),
        "gap_closure_actions": gap_closure_actions,
    }
