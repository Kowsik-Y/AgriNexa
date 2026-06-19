import datetime
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from .weather_utils import ADVICE_MAP, hourly_snapshot, weather_snapshot

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/")
async def get_weather(location: str = Query(...), _: str = Depends(get_current_user)) -> dict:
    day_key = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    seed = f"weather:{location.lower()}:{day_key}"
    snapshot = weather_snapshot(seed)

    return {
        "location": location,
        "date": day_key,
        "temp": snapshot["temp"],
        "temp_celsius": f"{snapshot['temp']}°C",
        "humidity": snapshot["humidity"],
        "condition": snapshot["condition"],
        "advice": ADVICE_MAP.get(snapshot["condition"], "Normal farming conditions."),
    }


@router.get("/forecast")
async def get_weather_forecast(
    location: str = Query(...),
    days: int = Query(7, ge=1, le=14),
    _: str = Depends(get_current_user),
) -> dict:
    forecast_data = []

    for day_offset in range(days):
        forecast_date = (datetime.datetime.utcnow() + datetime.timedelta(days=day_offset)).strftime("%Y-%m-%d")
        seed = f"weather:{location.lower()}:{forecast_date}"
        snapshot = weather_snapshot(seed)

        forecast_data.append(
            {
                "date": forecast_date,
                "temp": snapshot["temp"],
                "temp_celsius": f"{snapshot['temp']}°C",
                "humidity": snapshot["humidity"],
                "condition": snapshot["condition"],
                "rain_chance": snapshot["rain_chance"],
            }
        )

    return {
        "location": location,
        "forecast_days": days,
        "forecast": forecast_data,
    }


@router.get("/alerts")
async def get_weather_alerts(location: str = Query(...), _: str = Depends(get_current_user)) -> dict:
    day_key = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    seed = f"weather:{location.lower()}:{day_key}"
    snapshot = weather_snapshot(seed)
    temp = snapshot["temp"]
    humidity = snapshot["humidity"]
    cond = snapshot["condition"]

    alerts = []

    if temp > 32:
        alerts.append(
            {
                "alert_type": "high_temperature",
                "severity": "medium",
                "message": f"High temperature ({temp}°C). Increase irrigation frequency.",
            }
        )

    if humidity < 30:
        alerts.append(
            {
                "alert_type": "low_humidity",
                "severity": "high",
                "message": "Very low humidity. Check for pest outbreaks.",
            }
        )

    if cond == "Light Rain":
        alerts.append(
            {
                "alert_type": "rainfall",
                "severity": "low",
                "message": "Light rain expected. Avoid spraying pesticides.",
            }
        )

    return {
        "location": location,
        "date": day_key,
        "temp": temp,
        "humidity": humidity,
        "condition": cond,
        "alerts": alerts if alerts else [{"message": "No weather alerts for today."}],
    }


@router.get("/hourly")
async def get_hourly_weather(
    location: str = Query(...),
    hours: int = Query(24, ge=1, le=72),
    _: str = Depends(get_current_user),
) -> dict:
    hourly_data = []
    now = datetime.datetime.utcnow()

    for hour_offset in range(hours):
        forecast_time = now + datetime.timedelta(hours=hour_offset)
        time_key = forecast_time.strftime("%Y-%m-%d %H:00")
        seed = f"weather:{location.lower()}:{time_key}"
        hour_variation = (hour_offset % 24 - 12) * 0.5
        snapshot = hourly_snapshot(seed, hour_variation)

        hourly_data.append(
            {
                "time": time_key,
                "temp": snapshot["temp"],
                "temp_celsius": f"{snapshot['temp']}°C",
                "humidity": snapshot["humidity"],
                "condition": snapshot["condition"],
                "wind_speed_kmh": snapshot["wind_speed_kmh"],
                "uv_index": snapshot["uv_index"],
                "rain_chance": snapshot["rain_chance"],
            }
        )

    return {
        "location": location,
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "forecast_hours": hours,
        "hourly_forecast": hourly_data,
    }


@router.get("/timeline")
async def get_weather_timeline(
    location: str = Query(...),
    days: int = Query(7, ge=1, le=14),
    _: str = Depends(get_current_user),
) -> dict:
    now = datetime.datetime.utcnow()
    today_key = now.strftime("%Y-%m-%d")

    today_hourly = []
    for hour in [0, 3, 6, 9, 12, 15, 18, 21]:
        time_key = f"{today_key} {hour:02d}:00"
        seed = f"weather:{location.lower()}:{time_key}"
        hour_variation = (hour - 12) * 0.5
        snapshot = hourly_snapshot(seed, hour_variation)

        today_hourly.append(
            {
                "time": f"{hour:02d}:00",
                "temp": snapshot["temp"],
                "condition": snapshot["condition"],
                "humidity": snapshot["humidity"],
            }
        )

    daily_forecast = []
    for day_offset in range(1, days):
        forecast_date = (now + datetime.timedelta(days=day_offset)).strftime("%Y-%m-%d")
        seed = f"weather:{location.lower()}:{forecast_date}"
        snapshot = weather_snapshot(seed)
        temp = snapshot["temp"]

        daily_forecast.append(
            {
                "date": forecast_date,
                "temp_min": temp - 3,
                "temp_max": temp + 3,
                "temp_avg": temp,
                "condition": snapshot["condition"],
                "humidity": snapshot["humidity"],
                "rain_chance": snapshot["rain_chance"],
            }
        )

    return {
        "location": location,
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "today": {
            "date": today_key,
            "hourly": today_hourly,
        },
        "forecast_days": days - 1,
        "daily_forecast": daily_forecast,
    }
