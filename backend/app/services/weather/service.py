import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx

from .determinism import stable_unit_value
from .risk import (
    calculate_bacterial_risk,
    calculate_fungal_risk,
    calculate_insect_risk,
    calculate_spray_feasibility,
    pest_management_recommendation,
)

logger = logging.getLogger(__name__)


class WeatherService:
    """Fetch weather data from multiple sources with intelligent fallback."""

    def __init__(self):
        self.openweather_key = os.getenv("OPENWEATHER_API_KEY", "")
        self.imd_available = False
        self.cache = {}
        self.cache_ttl = 3600

    async def get_weather(
        self,
        latitude: float,
        longitude: float,
        location_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        cache_key = f"{latitude}_{longitude}"

        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if (datetime.now() - cached_time).seconds < self.cache_ttl:
                logger.info(f"Returning cached weather for {location_name or cache_key}")
                return cached_data

        if self.openweather_key:
            try:
                result = await self._fetch_openweather(latitude, longitude)
                self.cache[cache_key] = (result, datetime.now())
                return result
            except Exception as e:
                logger.warning(f"OpenWeatherMap failed: {e}, trying fallback...")

        result = self._mock_weather_data(latitude, longitude)
        self.cache[cache_key] = (result, datetime.now())
        return result

    async def _fetch_openweather(self, latitude: float, longitude: float) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            current_url = "https://api.openweathermap.org/data/2.5/weather"
            current_params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_key,
                "units": "metric",
            }

            forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
            forecast_params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_key,
                "units": "metric",
            }

            current_resp = await client.get(current_url, params=current_params)
            forecast_resp = await client.get(forecast_url, params=forecast_params)

            current_resp.raise_for_status()
            forecast_resp.raise_for_status()

            current_data = current_resp.json()
            forecast_data = forecast_resp.json()

            current = {
                "temp_c": current_data["main"]["temp"],
                "humidity": current_data["main"]["humidity"],
                "rainfall_mm": current_data.get("rain", {}).get("1h", 0),
                "wind_speed_kmh": current_data["wind"]["speed"] * 3.6,
                "condition": current_data["weather"][0]["main"],
            }

            forecast_7_days = []
            daily_data = {}

            for item in forecast_data["list"]:
                dt = datetime.fromtimestamp(item["dt"])
                date_key = dt.date()

                if date_key not in daily_data:
                    daily_data[date_key] = {
                        "temps": [],
                        "humidity": [],
                        "rainfall": 0,
                        "condition": item["weather"][0]["main"],
                    }

                daily_data[date_key]["temps"].append(item["main"]["temp"])
                daily_data[date_key]["humidity"].append(item["main"]["humidity"])
                daily_data[date_key]["rainfall"] += item.get("rain", {}).get("3h", 0)

            for date_key in sorted(daily_data.keys())[:7]:
                data = daily_data[date_key]
                forecast_7_days.append(
                    {
                        "date": str(date_key),
                        "temp_max": max(data["temps"]),
                        "temp_min": min(data["temps"]),
                        "rainfall_mm": data["rainfall"],
                        "humidity": sum(data["humidity"]) // len(data["humidity"]),
                        "condition": data["condition"],
                    }
                )

            return {"current": current, "forecast_7_days": forecast_7_days}

    def _mock_weather_data(self, latitude: float, longitude: float) -> Dict[str, Any]:
        day_key = datetime.utcnow().strftime("%Y-%m-%d")
        seed = f"{round(latitude, 3)}:{round(longitude, 3)}:{day_key}"

        if latitude > 25:
            base_temp = 22
            temp_variation = -3 + 8 * stable_unit_value(seed, "temp_variation_north")
            humidity_base = 65
        else:
            base_temp = 28
            temp_variation = -2 + 5 * stable_unit_value(seed, "temp_variation_south")
            humidity_base = 75

        current_temp = base_temp + temp_variation
        current_humidity = min(95, max(40, humidity_base + (-15 + 30 * stable_unit_value(seed, "humidity"))))

        rain_roll = stable_unit_value(seed, "rain_roll")
        rainfall_mm = 0 if rain_roll > 0.25 else (2 + 23 * stable_unit_value(seed, "rain_amount"))

        current = {
            "temp_c": round(current_temp, 1),
            "humidity": int(current_humidity),
            "rainfall_mm": round(rainfall_mm, 1),
            "wind_speed_kmh": round(5 + 15 * stable_unit_value(seed, "wind"), 1),
            "condition": "Partly Cloudy" if rainfall_mm == 0 else "Scattered Rain",
        }

        forecast_7_days = []
        for i in range(1, 8):
            date = (datetime.now() + timedelta(days=i)).date()
            day_seed = f"{seed}:{date}"
            day_rain_roll = stable_unit_value(day_seed, "rain_roll")
            day_rain = 0 if day_rain_roll > 0.30 else (2 + 13 * stable_unit_value(day_seed, "rain_amt"))
            conditions = ["Sunny", "Partly Cloudy", "Scattered Rain", "Cloudy"]
            forecast_7_days.append(
                {
                    "date": str(date),
                    "temp_max": round(current_temp + (2 + 6 * stable_unit_value(day_seed, "temp_max")), 1),
                    "temp_min": round(current_temp - (3 + 5 * stable_unit_value(day_seed, "temp_min")), 1),
                    "rainfall_mm": round(day_rain, 1),
                    "humidity": int(
                        min(95, max(40, current_humidity + (-10 + 20 * stable_unit_value(day_seed, "humidity"))))
                    ),
                    "condition": conditions[
                        int(stable_unit_value(day_seed, "condition") * len(conditions)) % len(conditions)
                    ],
                }
            )

        return {"current": current, "forecast_7_days": forecast_7_days}

    async def get_pest_risk_weather(
        self,
        latitude: float,
        longitude: float,
        pest_type: str = None,
    ) -> Dict[str, Any]:
        weather = await self.get_weather(latitude, longitude)
        current = weather["current"]

        pest_risk = {
            "fungal_disease_risk": calculate_fungal_risk(
                current["temp_c"], current["humidity"], current["rainfall_mm"]
            ),
            "bacterial_disease_risk": calculate_bacterial_risk(current["humidity"], current["rainfall_mm"]),
            "insect_activity_risk": calculate_insect_risk(current["temp_c"], current["wind_speed_kmh"]),
            "spray_feasibility": calculate_spray_feasibility(current["rainfall_mm"], current["wind_speed_kmh"]),
            "recommendation": "",
        }
        pest_risk["recommendation"] = pest_management_recommendation(current, pest_risk)

        weather["pest_risk"] = pest_risk
        return weather


_weather_service = None


async def get_weather_service() -> WeatherService:
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
