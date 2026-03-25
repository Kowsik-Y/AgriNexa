"""
Stage 2: Seed Selection - Auto-recommend seed varieties for predicted crop.
"""

from .config import SEED_VARIETIES


def recommend_seeds(crop: str) -> dict:
    """Return seed varieties suitable for the predicted crop."""

    varieties = SEED_VARIETIES.get(crop, [])

    if not varieties:
        return {
            "crop": crop,
            "varieties": [],
            "message": f"No seed data available for {crop}. Consult your local agricultural office.",
        }

    # Pick the best variety (highest yield)
    best = max(varieties, key=lambda v: v["yield_per_acre_kg"])

    return {
        "crop": crop,
        "recommended_variety": best["name"],
        "recommended_reason": f"Highest yield potential at {best['yield_per_acre_kg']} kg/acre",
        "all_varieties": varieties,
        "total_options": len(varieties),
    }
