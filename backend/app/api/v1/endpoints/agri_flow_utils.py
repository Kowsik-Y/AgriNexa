import datetime
import importlib
import io
from typing import Any, Dict, List

from app.schemas.agri_flow import SoilInput


def fallback_farming_plan(soil_input: SoilInput) -> Dict[str, Any]:
    avg_npk = (soil_input.nitrogen + soil_input.phosphorus + soil_input.potassium) / 3
    water_advice = "Irrigate lightly every 2 days" if soil_input.temperature > 30 else "Irrigate every 3-4 days"
    return {
        "farming_plan": {
            "crop_recommendation": "Rice" if soil_input.ph < 7 else "Millets",
            "soil_health": "Good" if avg_npk > 60 else "Needs nutrient balancing",
            "irrigation": water_advice,
            "next_steps": [
                "Run field scouting for pests twice this week",
                "Apply balanced NPK based on soil report",
                "Track humidity and rainfall before spraying",
            ],
        },
        "status": "fallback",
    }


def run_pipeline_safe(soil_input: SoilInput) -> Dict[str, Any]:
    try:
        run_pipeline = importlib.import_module("ai.agri_flow.pipeline").run_pipeline
        return run_pipeline(
            nitrogen=soil_input.nitrogen,
            phosphorus=soil_input.phosphorus,
            potassium=soil_input.potassium,
            ph=soil_input.ph,
            temperature=soil_input.temperature,
            humidity=soil_input.humidity,
        )
    except Exception:
        return fallback_farming_plan(soil_input)


def analyze_weekly_image_safe(image_bytes: bytes, crop: str, week_number: int) -> Dict[str, Any]:
    try:
        analyze_weekly_image = importlib.import_module("ai.agri_flow.crop_monitoring").analyze_weekly_image
        return analyze_weekly_image(image_bytes, crop, week_number)
    except Exception:
        score = 60 + ((week_number * 7) % 35)
        if score > 90:
            score = 90
        status = "Healthy" if score >= 75 else "Needs Attention"
        return {
            "crop": crop,
            "week_number": week_number,
            "health_status": status,
            "health_score": score,
            "observations": ["Fallback assessment: upload accepted"],
            "status": "fallback",
        }


def detect_pest_safe(image_bytes: bytes) -> Dict[str, Any]:
    try:
        detect_pest_from_image = importlib.import_module("ai.agri_flow.pest_detection").detect_pest_from_image
        return detect_pest_from_image(image_bytes)
    except Exception:
        return {
            "detected": False,
            "pest_name": "Unknown",
            "risk_level": "Low",
            "recommendation": "AI pest detection module unavailable; consult local agronomist if symptoms persist.",
            "status": "fallback",
        }


def calculate_trend(logs: List[Dict[str, Any]]) -> str:
    if len(logs) < 2:
        return "stable"

    start = logs[0].get("health_score", 0)
    end = logs[-1].get("health_score", 0)

    if end - start >= 1:
        return "improving"
    if start - end >= 1:
        return "declining"
    return "stable"


def build_monitoring_recommendations(logs: List[Dict[str, Any]]) -> List[str]:
    if not logs:
        return [
            "Start daily monitoring to build a crop health baseline.",
            "Upload crop photos at a consistent time for better AI comparison.",
        ]

    avg = sum([entry.get("health_score", 0) for entry in logs]) / max(len(logs), 1)
    trend = calculate_trend(logs)

    recommendations = []
    if avg < 3:
        recommendations.append("Average health is low. Check water, nutrient balance, and pest signs immediately.")
    elif avg < 4:
        recommendations.append("Health is moderate. Continue daily checks and validate fertilizer schedule.")
    else:
        recommendations.append("Crop health is good. Maintain current irrigation and nutrient practices.")

    if trend == "declining":
        recommendations.append("Trend is declining. Increase scouting frequency and inspect leaves for disease patches.")
    elif trend == "improving":
        recommendations.append("Trend is improving. Keep management consistent and document what changed.")

    recommendations.append("Use weekly image uploads for stronger AI assessment confidence.")
    return recommendations


def build_monitoring_pdf(user_id: str, days: int, logs: List[Dict[str, Any]]) -> bytes:
    pagesizes = importlib.import_module("reportlab.lib.pagesizes")
    canvas_module = importlib.import_module("reportlab.pdfgen.canvas")
    A4 = pagesizes.A4
    canvas = canvas_module

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    _, height = A4
    y = height - 50

    pdf.setTitle(f"AgriNexa Monitoring Report - {user_id}")
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(40, y, "AgriNexa Crop Monitoring Report")
    y -= 22

    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y, f"User: {user_id}")
    y -= 14
    pdf.drawString(40, y, f"Generated: {datetime.datetime.utcnow().isoformat()} UTC")
    y -= 14
    pdf.drawString(40, y, f"Period: Last {days} days")
    y -= 24

    if not logs:
        pdf.setFont("Helvetica", 11)
        pdf.drawString(40, y, "No monitoring logs found for this period.")
    else:
        avg = sum([entry.get("health_score", 0) for entry in logs]) / len(logs)
        trend = calculate_trend(logs)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Summary")
        y -= 16
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Entries: {len(logs)}")
        y -= 14
        pdf.drawString(40, y, f"Average Health Score: {avg:.2f} / 5")
        y -= 14
        pdf.drawString(40, y, f"Trend: {trend}")
        y -= 22

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Recent Logs")
        y -= 16

        pdf.setFont("Helvetica", 9)
        for entry in logs[-10:]:
            date_text = entry.get("date", "unknown")[:10]
            crop = entry.get("crop", "Unknown")
            score = entry.get("health_score", "-")
            line = f"{date_text} | Crop: {crop} | Health: {score}/5"
            pdf.drawString(40, y, line)
            y -= 13
            if y < 60:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 9)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()
