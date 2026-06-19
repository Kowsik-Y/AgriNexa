import hashlib

CONDITIONS = ["Cloudy", "Sunny", "Light Rain", "Clear Sky"]

ADVICE_MAP = {
    "Cloudy": "Good time for fertilization.",
    "Sunny": "Ensure adequate irrigation today.",
    "Light Rain": "Wait for rain to stop before spraying.",
    "Clear Sky": "Ideal for harvesting.",
}


def stable_index(seed: str, max_val: int) -> int:
    digest = hashlib.sha256(seed.encode()).hexdigest()
    return int(digest[:8], 16) % max_val


def weather_snapshot(seed: str) -> dict:
    temp = 24 + stable_index(seed + ":temp", 9)
    humidity = 55 + stable_index(seed + ":humidity", 31)
    cond = CONDITIONS[stable_index(seed + ":condition", len(CONDITIONS))]
    return {
        "temp": temp,
        "humidity": humidity,
        "condition": cond,
        "rain_chance": stable_index(seed + ":rain", 101),
    }


def hourly_snapshot(seed: str, hour_variation: float) -> dict:
    base_temp = 24 + stable_index(seed + ":temp", 9)
    temp = max(15, min(35, base_temp + hour_variation))
    humidity = 55 + stable_index(seed + ":humidity", 31)
    cond = CONDITIONS[stable_index(seed + ":condition", len(CONDITIONS))]
    return {
        "temp": round(temp, 1),
        "humidity": humidity,
        "condition": cond,
        "wind_speed_kmh": 5 + stable_index(seed + ":wind", 20),
        "uv_index": stable_index(seed + ":uv", 12),
        "rain_chance": stable_index(seed + ":rain", 101),
    }
