"""
Stage 8: Storage & Marketing - Storage techniques and market price insights.
"""

import random
from .config import STORAGE_TECHNIQUES, MARKET_DATA


def suggest_storage(crop: str) -> dict:
    """Suggest storage techniques for the predicted crop."""

    storage = STORAGE_TECHNIQUES.get(crop)
    if not storage:
        return {
            "crop": crop,
            "message": f"No storage data for {crop}.",
            "general_advice": "Store in cool, dry place. Maintain proper ventilation.",
        }

    return {
        "crop": crop,
        "storage_method": storage["method"],
        "optimal_moisture_content": storage["moisture_content"],
        "max_storage_duration_months": storage["max_duration_months"],
        "storage_temperature": storage["temperature"],
        "tips": storage["tips"],
        "post_harvest_steps": [
            "Clean and sort produce immediately after harvest",
            f"Dry to {storage['moisture_content']} moisture content before storage",
            "Remove damaged or diseased produce",
            "Use appropriate containers/bags for storage",
            "Monitor stored produce regularly for pest damage",
        ],
    }


def get_market_insights(crop: str) -> dict:
    """Provide market price insights for the predicted crop."""

    market = MARKET_DATA.get(crop)
    if not market:
        return {
            "crop": crop,
            "message": f"No market data for {crop}.",
            "advice": "Check local APMC market for current prices.",
        }

    # Simulate current market price with some variance
    variance = random.uniform(-0.1, 0.15)
    current_price = round(market["base_price"] * (1 + variance), 2)
    trend = "Rising" if variance > 0.05 else "Falling" if variance < -0.05 else "Stable"

    return {
        "crop": crop,
        "current_price_per_kg": current_price,
        "msp_per_quintal": market["msp_per_quintal"],
        "price_trend": trend,
        "best_selling_months": market["best_selling_months"],
        "major_markets": market["major_markets"],
        "selling_advice": _get_selling_advice(crop, trend, market),
        "market_tips": [
            "Check AGMARKNET (agmarknet.gov.in) for daily prices",
            "Compare prices across multiple markets before selling",
            "Consider value addition (processing) for better returns",
            "Use e-NAM platform for wider market access",
            f"MSP for {crop}: ₹{market['msp_per_quintal']}/quintal — sell at MSP or above",
        ],
    }


def _get_selling_advice(crop: str, trend: str, market: dict) -> str:
    """Generate selling advice based on market conditions."""
    best_months = ", ".join(market["best_selling_months"])

    if trend == "Rising":
        return f"Market prices are rising. You may hold {crop} for a few more days for better rates. Best selling period: {best_months}."
    elif trend == "Falling":
        return f"Prices are declining. Consider selling {crop} soon or store properly if best selling months ({best_months}) are approaching."
    else:
        return f"Prices are stable. Plan to sell during peak demand months: {best_months}."
