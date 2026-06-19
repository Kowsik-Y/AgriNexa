from typing import Any, Dict


MOCK_PRICES: Dict[str, Dict[str, Any]] = {
    "Rice": {"avg_price_per_quintal": 2800, "currency": "INR"},
    "Wheat": {"avg_price_per_quintal": 2400, "currency": "INR"},
    "Maize": {"avg_price_per_quintal": 2100, "currency": "INR"},
    "Cotton": {"avg_price_per_quintal": 6500, "currency": "INR"},
    "Sugarcane": {"avg_price_per_ton": 3200, "currency": "INR"},
    "Groundnut": {"avg_price_per_quintal": 5800, "currency": "INR"},
    "Millets": {"avg_price_per_quintal": 2300, "currency": "INR"},
    "Pulses": {"avg_price_per_quintal": 5500, "currency": "INR"},
    "Jute": {"avg_price_per_quintal": 7200, "currency": "INR"},
    "Coffee": {"avg_price_per_kg": 180, "currency": "INR"},
}


BEST_SELLING_TIME = {
    "Rice": "Mid-April to May (post-harvest peak demand)",
    "Wheat": "March to April (harvest completion)",
    "Maize": "October to November (immediate post-harvest)",
    "Cotton": "November to December (ginning season)",
    "Sugarcane": "November to February (crushing season)",
    "Groundnut": "November to January (harvest period)",
    "Millets": "September to October (harvest)",
    "Pulses": "February to April (procurement season)",
    "Jute": "July to August (harvest)",
    "Coffee": "Year-round (continuous harvest)",
}


STORAGE_MONTHS = {
    "Rice": 12,
    "Wheat": 12,
    "Maize": 8,
    "Cotton": 24,
    "Sugarcane": 0,
    "Groundnut": 10,
    "Millets": 10,
    "Pulses": 8,
    "Jute": 12,
    "Coffee": 18,
}


STORAGE_METHODS = {
    "Rice": "Polythene-lined storage, silica gel desiccants, temperature 20-25°C",
    "Wheat": "Jute bags with neem leaves, cool dry place, moisture <12%",
    "Cotton": "Warehouse storage, humidity control, pest management",
    "Groundnut": "Cool storage in airtight containers, avoid moisture",
    "Coffee": "Climate-controlled warehouse, 12-15°C, 60-65% humidity",
    "Sugarcane": "Not recommended for storage - process within 1-2 days",
}
