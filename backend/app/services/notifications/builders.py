from typing import Tuple


def weather_alert_title(alert_type: str) -> str:
    icon_map = {
        "rain": "🌧️",
        "frost": "❄️",
        "drought": "☀️",
        "storm": "⛈️",
        "heatwave": "🔥",
    }
    icon = icon_map.get(alert_type, "⚠️ ")
    return f"{icon} {alert_type.title()} Alert"


def spray_reminder_text(application_days_ago: int, frequency_days: int) -> Tuple[str, str]:
    days_until_next = max(0, frequency_days - application_days_ago)

    if days_until_next == 0:
        return "🔴", "Apply TODAY"
    if days_until_next <= 2:
        return "🟡", f"Apply in {days_until_next} days"
    return "🟢", f"Next spray in {days_until_next} days"
