import logging
import os
from typing import Dict, List

import httpx

from .builders import spray_reminder_text, weather_alert_title

logger = logging.getLogger(__name__)


class NotificationService:
    """Handle push notifications via Expo."""

    def __init__(self):
        self.expo_token = os.getenv("EXPO_ACCESS_TOKEN", "")
        self.expo_url = "https://exp.host/--/api/v2/push/send"
        self.cache = {}

    async def send_pest_alert(
        self,
        user_id: str,
        expo_push_token: str,
        crop: str,
        pest_name: str,
        risk_level: str,
        recommendation: str,
    ) -> bool:
        if not expo_push_token:
            logger.warning(f"No expo token for user {user_id}")
            return False

        title = f"🚨 {pest_name} Detected on {crop}"
        body = f"{risk_level} risk level. {recommendation}"

        return await self._send_expo_notification(
            expo_push_token,
            title,
            body,
            data={
                "type": "pest_alert",
                "crop": crop,
                "pest": pest_name,
                "risk": risk_level,
            },
        )

    async def send_daily_reminder(self, expo_push_token: str, crop: str) -> bool:
        if not expo_push_token:
            return False

        return await self._send_expo_notification(
            expo_push_token,
            "📸 Time for Daily Crop Check!",
            f"Upload a photo of your {crop} for AI health assessment.",
            data={"type": "daily_reminder", "crop": crop},
        )

    async def send_weather_alert(
        self,
        expo_push_token: str,
        alert_type: str,
        details: str,
    ) -> bool:
        if not expo_push_token:
            return False

        return await self._send_expo_notification(
            expo_push_token,
            weather_alert_title(alert_type),
            details,
            data={"type": "weather_alert", "alert_type": alert_type},
        )

    async def send_weekly_summary(
        self,
        expo_push_token: str,
        crop: str,
        summary_stats: Dict,
    ) -> bool:
        if not expo_push_token:
            return False

        health_score = summary_stats.get("avg_health_score", 75)
        trend = summary_stats.get("trend", "stable")
        trend_emoji = "📈" if trend == "improving" else "📉" if trend == "declining" else "➡️"
        body = f"Health Score: {health_score}/100 {trend_emoji}\nCheck details in app for recommendations."

        return await self._send_expo_notification(
            expo_push_token,
            f"📊 Weekly {crop} Summary",
            body,
            data={
                "type": "weekly_summary",
                "crop": crop,
                "health_score": health_score,
                "trend": trend,
            },
        )

    async def send_spray_reminder(
        self,
        expo_push_token: str,
        pesticide: str,
        application_days_ago: int,
        frequency_days: int,
    ) -> bool:
        if not expo_push_token:
            return False

        icon, urgency = spray_reminder_text(application_days_ago, frequency_days)
        title = f"{icon} Spray Reminder: {pesticide}"

        return await self._send_expo_notification(
            expo_push_token,
            title,
            urgency,
            data={"type": "spray_reminder", "pesticide": pesticide},
        )

    async def send_market_opportunity(
        self,
        expo_push_token: str,
        crop: str,
        price: float,
        price_change: float,
        recommendation: str,
    ) -> bool:
        if not expo_push_token:
            return False

        icon = "📈" if price_change > 0 else "📉"
        change_str = f"{abs(price_change):+.0f}₹" if price_change != 0 else "stable"
        body = f"₹{price:.0f}/unit ({change_str}). {recommendation}"

        return await self._send_expo_notification(
            expo_push_token,
            f"{icon} Market Update: {crop}",
            body,
            data={"type": "market_opportunity", "crop": crop, "price": price},
        )

    async def _send_expo_notification(
        self,
        expo_push_token: str,
        title: str,
        body: str,
        data: Dict = None,
    ) -> bool:
        try:
            payload = {
                "to": expo_push_token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data or {},
                "badge": 1,
                "ttl": 86400,
                "priority": "high" if data and data.get("type") == "pest_alert" else "default",
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.expo_url,
                    json=payload,
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                )

                result = response.json()

                if response.status_code == 200 and result.get("data", {}).get("id"):
                    logger.info(f"Notification sent: {result['data']['id']}")
                    return True

                logger.warning(f"Expo API error: {result}")
                return False

        except Exception as e:
            logger.error(f"Failed to send Expo notification: {e}")
            return False

    async def schedule_daily_reminders(
        self,
        user_list: List[Dict],
        hour: int = 6,
        minute: int = 0,
    ):
        logger.info(f"Scheduled daily reminders for {len(user_list)} users at {hour}:{minute:02d}")

        for user in user_list:
            try:
                await self.send_daily_reminder(user["expo_token"], user.get("crop", "Unknown"))
            except Exception as e:
                logger.error(f"Failed to send reminder to user {user['user_id']}: {e}")


_notification_service = None


async def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
