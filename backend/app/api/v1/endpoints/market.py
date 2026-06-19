from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.security import get_current_user
from app.services.market import get_market_service

router = APIRouter(tags=["Market"])


@router.get("/pest-alert")
async def get_pest_alert(location: str = Query(...), _: str = Depends(get_current_user)) -> dict:
    return {
        "location": location,
        "alert_level": "Medium",
        "pest_type": "Fall Armyworm",
        "risk": "Moderate due to recent humidity levels.",
    }


@router.get("/prices")
async def get_market_prices(
    crop: str = Query("rice"),
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    _: str = Depends(get_current_user),
) -> dict:
    service = await get_market_service()
    data = await service.get_market_prices(
        crop_name=crop.title(),
        district=district,
        state=state,
    )
    current_price = float(data.get("current_price") or 0)
    price_unit = (data.get("price_unit") or "per quintal").strip().lower()

    if "quintal" in price_unit:
        price_per_quintal = current_price
        price_per_kg = current_price / 100
        display_price = price_per_kg
        display_unit = "kg"
    elif "ton" in price_unit:
        price_per_quintal = current_price / 10
        price_per_kg = current_price / 1000
        display_price = price_per_kg
        display_unit = "kg"
    else:
        price_per_quintal = current_price * 100
        price_per_kg = current_price
        display_price = current_price
        display_unit = "kg"

    return {
        "crop": crop,
        "price": round(display_price, 2),
        "price_unit_label": display_unit,
        "price_per_kg": round(price_per_kg, 2),
        "price_per_quintal": round(price_per_quintal, 2),
        "unit": data.get("currency", "INR"),
        "trend": data.get("price_trend", "Stable"),
        "market": data.get("market") or data.get("district", "Regional Average"),
        "state": data.get("state", state or "Unknown"),
        "source": data.get("source", "fallback"),
        "available": bool(data.get("available", False)),
        "suggestion": data.get("suggestion"),
        "details": data,
    }
