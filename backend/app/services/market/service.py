import logging
import os
from difflib import SequenceMatcher
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx

from .catalog import BEST_SELLING_TIME, MOCK_PRICES, STORAGE_METHODS, STORAGE_MONTHS
from .determinism import stable_choice, stable_unit_value

logger = logging.getLogger(__name__)


class MarketService:
    """Fetch agricultural market prices and trends from Data.gov market datasets."""

    def __init__(self):
        self.agmarknet_key = os.getenv("AGMARKNET_API_KEY", "")
        self.data_gov_key = os.getenv("DATA_GOV_API_KEY", self.agmarknet_key)
        self.data_gov_base_url = os.getenv("DATA_GOV_BASE_URL", "https://api.data.gov.in/resource")
        self.data_gov_resource_id = os.getenv("DATA_GOV_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
        self.data_gov_timeout_seconds = float(os.getenv("DATA_GOV_TIMEOUT_SECONDS", "12"))
        self.cache = {}
        self.cache_ttl = 21600
        self.mock_prices = MOCK_PRICES

    async def _fetch_data_gov_records(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Dict[str, Any],
    ) -> list:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

        if isinstance(data, dict) and data.get("status") == "error":
            message = data.get("message", "Unknown Data.gov API error")
            raise RuntimeError(f"Data.gov API responded with status=error: {message}")

        if isinstance(data, dict):
            records = data.get("records", [])
            if isinstance(records, list):
                return records
        return []

    async def get_market_prices(
        self,
        crop_name: str,
        district: Optional[str] = None,
        state: Optional[str] = None,
    ) -> Dict[str, Any]:
        cache_key = f"{crop_name}_{district}_{state}"

        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if (datetime.now() - cached_time).seconds < self.cache_ttl:
                logger.info(f"Returning cached market data for {cache_key}")
                return cached_data

        if self.data_gov_key:
            try:
                result = await self._fetch_data_gov_market(crop_name, district, state)
                self.cache[cache_key] = (result, datetime.now())
                return result
            except Exception as e:
                logger.warning("Data.gov fetch failed (%s), using mock data...", repr(e))

        result = self._mock_market_data(crop_name, district, state)
        self.cache[cache_key] = (result, datetime.now())
        return result

    async def _fetch_data_gov_market(
        self,
        crop_name: str,
        district: Optional[str],
        state: Optional[str],
    ) -> Dict[str, Any]:
        try:
            if not self.data_gov_key:
                raise ValueError("Missing Data.gov API key")

            commodity_map = {
                "Rice": "Rice",
                "Wheat": "Wheat",
                "Maize": "Maize",
                "Cotton": "Cotton",
                "Sugarcane": "Sugarcane",
                "Groundnut": "Groundnut",
                "Millets": "Jowar",
                "Pulses": "Arhar",
                "Jute": "Jute",
                "Coffee": "Coffee",
            }
            commodity = commodity_map.get(crop_name, crop_name)

            timeout = httpx.Timeout(timeout=self.data_gov_timeout_seconds, connect=6.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                base_params = {
                    "api-key": self.data_gov_key,
                    "format": "json",
                    "limit": 25,
                }
                params = dict(base_params)
                if commodity:
                    params["filters[commodity]"] = commodity
                if state:
                    params["filters[state.keyword]"] = state
                if district:
                    params["filters[district]"] = district

                url = f"{self.data_gov_base_url}/{self.data_gov_resource_id}"
                records = await self._fetch_data_gov_records(client, url, params)
                match_scope = "exact"

                if not records and district:
                    # Retry against market field because users often provide place/market names.
                    market_params = dict(base_params)
                    if commodity:
                        market_params["filters[commodity]"] = commodity
                    if state:
                        market_params["filters[state.keyword]"] = state
                    market_params["filters[market]"] = district
                    records = await self._fetch_data_gov_records(client, url, market_params)
                    match_scope = "market_exact"

                if not records and district:
                    # Retry without district filter to tolerate district naming differences.
                    relaxed_state_params = dict(base_params)
                    if commodity:
                        relaxed_state_params["filters[commodity]"] = commodity
                    if state:
                        relaxed_state_params["filters[state.keyword]"] = state
                    records = await self._fetch_data_gov_records(client, url, relaxed_state_params)
                    match_scope = "state_relaxed"

                if not records and not state:
                    # Final retry only by commodity, then choose best district/state candidate.
                    relaxed_crop_params = dict(base_params)
                    if commodity:
                        relaxed_crop_params["filters[commodity]"] = commodity
                    records = await self._fetch_data_gov_records(client, url, relaxed_crop_params)
                    match_scope = "commodity_relaxed"

                if records:
                    def _to_float(value: Any) -> Optional[float]:
                        if value is None:
                            return None
                        if isinstance(value, (int, float)):
                            return float(value)
                        if isinstance(value, str):
                            cleaned = value.replace(",", "").strip()
                            if not cleaned:
                                return None
                            try:
                                return float(cleaned)
                            except ValueError:
                                return None
                        return None

                    parsed_records = []
                    for r in records:
                        modal = _to_float(r.get("modal_price"))
                        min_p = _to_float(r.get("min_price"))
                        max_p = _to_float(r.get("max_price"))
                        if modal is None and min_p is not None and max_p is not None:
                            modal = (min_p + max_p) / 2
                        if modal is None:
                            continue
                        parsed_records.append(
                            {
                                "state": r.get("state"),
                                "district": r.get("district"),
                                "market": r.get("market"),
                                "modal_price": modal,
                                "min_price": min_p,
                                "max_price": max_p,
                            }
                        )

                    if not parsed_records:
                        raise RuntimeError("Data.gov records received but missing usable price fields")

                    if district or state:
                        chosen = parsed_records[0]
                        if district and match_scope != "exact":
                            district_clean = district.strip().lower()

                            def _score(rec: Dict[str, Any]) -> float:
                                rec_district = str(rec.get("district") or "").strip().lower()
                                rec_market = str(rec.get("market") or "").strip().lower()
                                district_score = SequenceMatcher(None, district_clean, rec_district).ratio() if rec_district else 0.0
                                market_score = SequenceMatcher(None, district_clean, rec_market).ratio() if rec_market else 0.0
                                return max(district_score, market_score)

                            chosen = max(parsed_records, key=_score)

                        current_price = float(chosen["modal_price"])
                        market_value = str(chosen.get("market") or chosen.get("district") or district or "Unknown")
                        district_value = str(chosen.get("district") or district or "Unknown")
                        state_value = str(chosen.get("state") or state or "Unknown")
                    else:
                        avg_price = sum(float(r["modal_price"]) for r in parsed_records) / len(parsed_records)
                        current_price = float(avg_price)
                        market_value = f"Multiple markets ({len(parsed_records)})"
                        district_value = f"Multiple markets ({len(parsed_records)})"
                        state_value = "Multiple states"

                    price_change = 0.0
                    trend = "Stable"
                    return {
                        "crop": crop_name,
                        "market": market_value,
                        "district": district_value,
                        "state": state_value,
                        "current_price": round(current_price, 2),
                        "price_unit": "per quintal",
                        "currency": "INR",
                        "price_change_7_days": price_change,
                        "price_trend": trend,
                        "market_forecast_30_days": "Moderate volatility expected",
                        "trading_volume_today": "Unknown",
                        "best_selling_time": "Check local mandi demand window",
                        "storage_months": 6,
                        "demand_status": "Unknown",
                        "source": "data_gov_live" if match_scope == "exact" else f"data_gov_{match_scope}",
                        "available": True,
                        "suggestion": (
                            "Exact district match not found; showing closest available mandi record."
                            if match_scope != "exact"
                            else None
                        ),
                    }
                logger.info(
                    "Data.gov returned no records for crop=%s state=%s district=%s",
                    crop_name,
                    state or "-",
                    district or "-",
                )
                return {
                    "crop": crop_name,
                    "market": district or "Not specified",
                    "district": district or "Not specified",
                    "state": state or "Not specified",
                    "current_price": 0,
                    "price_unit": "per quintal",
                    "currency": "INR",
                    "price_change_7_days": 0,
                    "price_trend": "No data",
                    "market_forecast_30_days": "No live mandi data found for the selected crop/location.",
                    "trading_volume_today": "Unknown",
                    "best_selling_time": "Not available",
                    "storage_months": 0,
                    "demand_status": "Unknown",
                    "source": "data_gov_no_data",
                    "available": False,
                    "suggestion": "Try another crop or clear district/state filters.",
                }
                logger.info(
                    "Data.gov market fetch success for crop=%s state=%s district=%s records=%s",
                    crop_name,
                    state or "-",
                    district or "-",
                    len(records),
                )

        except httpx.TimeoutException as e:
            logger.error(
                "Data.gov request timeout for crop=%s base_url=%s resource_id=%s: %s",
                crop_name,
                self.data_gov_base_url,
                self.data_gov_resource_id,
                repr(e),
            )
            raise
        except httpx.HTTPStatusError as e:
            response_body = ""
            try:
                response_body = (e.response.text or "")[:300]
            except Exception:
                response_body = "<unavailable>"
            logger.error(
                "Data.gov HTTP error status=%s url=%s crop=%s body=%s",
                e.response.status_code,
                str(e.request.url),
                crop_name,
                response_body,
            )
            raise
        except Exception as e:
            logger.error("Data.gov market API error for crop=%s: %s", crop_name, repr(e))
            raise

        return self._mock_market_data(crop_name, district, state)

    def _mock_market_data(
        self,
        crop_name: str,
        district: Optional[str],
        state: Optional[str],
    ) -> Dict[str, Any]:
        base_price = self.mock_prices.get(crop_name, {})
        if not base_price:
            base_price = {"avg_price_per_quintal": 3000, "currency": "INR"}

        day_key = datetime.utcnow().strftime("%Y-%m-%d")
        seed = f"{crop_name.lower()}:{(district or '').lower()}:{(state or '').lower()}:{day_key}"

        price_unit = "per quintal"
        if "Coffee" in crop_name:
            price_unit = "per kg"
            current = base_price.get("avg_price_per_kg", 180) + (-20 + 50 * stable_unit_value(seed, "current_coffee"))
        elif "Sugarcane" in crop_name:
            price_unit = "per ton"
            current = base_price.get("avg_price_per_ton", 3200) + (-300 + 600 * stable_unit_value(seed, "current_sugarcane"))
        else:
            current = base_price.get("avg_price_per_quintal", 2500) + (-200 + 500 * stable_unit_value(seed, "current_generic"))

        price_change = -250 + 500 * stable_unit_value(seed, "price_change")
        trend = "Increasing" if price_change > 0 else ("Decreasing" if price_change < 0 else "Stable")

        return {
            "crop": crop_name,
            "market": district or "Regional Market",
            "district": district or "Regional Average",
            "state": state or "Regional",
            "current_price": round(current, 0),
            "price_unit": price_unit,
            "currency": "INR",
            "price_change_7_days": round(price_change, 0),
            "price_trend": trend,
            "market_forecast_30_days": self._generate_forecast_text(crop_name, trend),
            "trading_volume_today": stable_choice(["Low", "Moderate", "High"], seed, "volume"),
            "best_selling_time": self._get_best_selling_time(crop_name),
            "storage_months": self._get_storage_duration(crop_name),
            "demand_status": stable_choice(["Low", "Moderate", "High"], seed, "demand"),
            "source": "fallback_mock",
            "available": False,
            "suggestion": "Live mandi data unavailable right now. Check network or try again.",
        }

    def _generate_forecast_text(self, crop_name: str, trend: str) -> str:
        forecasts = {
            "Rice": [
                "Summer rice demand increasing - good time to sell",
                "Monsoon approaching - prices may stabilize",
                "Post-harvest surplus expected by June",
            ],
            "Wheat": [
                "Harvest season approaching - prices expected to decline",
                "Current strength due to limited supply",
                "Government procurement ongoing - stable prices expected",
            ],
            "Cotton": [
                "Global prices volatile - monitor international trends",
                "Monsoon preparation affecting demand",
                "Fiber quality premium continuing",
            ],
        }
        crop_forecasts = forecasts.get(crop_name, [
            "Market conditions moderate - typical seasonal patterns expected",
            "Price volatility within historical range",
            "Monitor supply-demand indicators",
        ])

        seed = f"{crop_name.lower()}:{trend.lower()}:{datetime.utcnow().strftime('%Y-%m-%d')}"
        return stable_choice(crop_forecasts, seed, "forecast")

    def _get_best_selling_time(self, crop_name: str) -> str:
        return BEST_SELLING_TIME.get(crop_name, "Post-harvest period (2-3 months after)")

    def _get_storage_duration(self, crop_name: str) -> int:
        return STORAGE_MONTHS.get(crop_name, 6)

    async def get_market_trends(self, crop_name: str, days: int = 30) -> Dict[str, Any]:
        prices = []
        crop_base = self.mock_prices.get(crop_name, {})
        current_price = (
            crop_base.get("avg_price_per_quintal")
            or crop_base.get("avg_price_per_ton")
            or crop_base.get("avg_price_per_kg")
            or 2500
        )
        day_key = datetime.utcnow().strftime("%Y-%m-%d")
        seed = f"{crop_name.lower()}:{days}:{day_key}"

        for i in range(days, 0, -1):
            date = (datetime.now() - timedelta(days=i)).date()
            drift = -60 + 120 * stable_unit_value(seed, f"drift_{i}")
            price = max(1, current_price + drift)
            prices.append({"date": str(date), "price": round(price, 0)})
            current_price = price

        all_prices = [p["price"] for p in prices]
        avg_price = sum(all_prices) / len(all_prices)
        high_price = max(all_prices)
        low_price = min(all_prices)
        volatility = (max(all_prices) - min(all_prices)) / avg_price * 100 if avg_price > 0 else 0

        if current_price > avg_price * 1.1:
            recommendation = "SELL NOW - Price above average, good opportunity"
        elif current_price < avg_price * 0.9:
            recommendation = "HOLD - Price below average, better timing may come"
        else:
            recommendation = "SELL or HOLD - Prices near average, acceptable level"

        return {
            "crop": crop_name,
            "period_days": days,
            "price_history": prices,
            "average_price_30_days": round(avg_price, 0),
            "high_price_30_days": round(high_price, 0),
            "low_price_30_days": round(low_price, 0),
            "volatility_index": round(volatility, 2),
            "trading_recommendation": recommendation,
        }

    async def get_storage_recommendations(self, crop_name: str, current_price: float) -> Dict[str, Any]:
        trends = await self.get_market_trends(crop_name, days=60)

        volatility = trends["volatility_index"]
        storage_cost = 40 if crop_name != "Coffee" else 100
        day_key = datetime.utcnow().strftime("%Y-%m-%d")
        seed = f"{crop_name.lower()}:{current_price}:{volatility}:{day_key}"

        mult_3m = 0.5 + stable_unit_value(seed, "mult_3m")
        mult_6m = 1.0 + stable_unit_value(seed, "mult_6m")
        expected_3m = current_price * (1 + volatility / 100 * mult_3m)
        expected_6m = current_price * (1 + volatility / 100 * mult_6m)

        if expected_3m > current_price * 1.1:
            recommendation = "STORE"
            explanation = f"Expected price increase of {round((expected_3m/current_price - 1)*100)}% in 3 months"
        elif expected_6m > current_price * 1.15:
            recommendation = "STORE"
            explanation = "Long-term storage beneficial - 6-month forecast positive"
        else:
            recommendation = "SELL"
            explanation = "Market forecast weak - sell now rather than store"

        return {
            "recommendation": recommendation,
            "explanation": explanation,
            "expected_price_3_months": round(expected_3m, 0),
            "expected_price_6_months": round(expected_6m, 0),
            "storage_cost_per_unit_per_month": storage_cost,
            "breakeven_analysis": f"Need price increase of {round(storage_cost/current_price*100, 2)}% per month to cover storage costs",
            "storage_method": self._get_storage_method(crop_name),
            "optimal_storage_months": self._get_optimal_storage_duration(crop_name, volatility),
            "current_price": current_price,
            "profit_3_months_if_stored": round(expected_3m - current_price - storage_cost * 3, 0),
        }

    def _get_storage_method(self, crop_name: str) -> str:
        return STORAGE_METHODS.get(crop_name, "Standard agricultural warehouse conditions")

    def _get_optimal_storage_duration(self, crop_name: str, volatility: float) -> int:
        base_durations = {
            "Rice": 4,
            "Wheat": 6,
            "Maize": 3,
            "Groundnut": 5,
            "Coffee": 8,
            "Cotton": 12,
        }
        base = base_durations.get(crop_name, 3)

        if volatility > 10:
            return base + 2
        if volatility < 3:
            return max(1, base - 1)
        return base


_market_service = None


async def get_market_service() -> MarketService:
    global _market_service
    if _market_service is None:
        _market_service = MarketService()
    return _market_service
