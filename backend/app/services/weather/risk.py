from typing import Dict


def calculate_fungal_risk(temp: float, humidity: float, rainfall: float) -> float:
    score = 0
    if 15 <= temp <= 25:
        score += 40
    if humidity > 80:
        score += 30
    if rainfall > 10:
        score += 30
    return min(100, score)


def calculate_bacterial_risk(humidity: float, rainfall: float) -> float:
    score = 0
    if humidity > 75:
        score += 50
    if rainfall > 5:
        score += 50
    return min(100, score)


def calculate_insect_risk(temp: float, wind: float) -> float:
    score = 0
    if 22 <= temp <= 32:
        score += 50
    if wind < 10:
        score += 50
    return min(100, score)


def calculate_spray_feasibility(rainfall: float, wind: float) -> str:
    if rainfall > 2:
        return "Not feasible - Recent rainfall, wait 24-48 hours"
    if wind > 25:
        return "Not feasible - High wind, spray will drift"
    if 5 <= wind <= 15:
        return "Optimal - Good spray conditions"
    return "Feasible - Calm conditions, optimal is 5-15 km/h wind"


def pest_management_recommendation(current: Dict, pest_risk: Dict) -> str:
    if pest_risk["fungal_disease_risk"] > 70:
        return "High fungal risk - Apply fungicide, ensure good drainage"
    if pest_risk["bacterial_disease_risk"] > 70:
        return "High bacterial disease risk - Avoid overhead watering, improve ventilation"
    if pest_risk["insect_activity_risk"] > 70:
        return "High insect activity - Monitor crop closely, consider insecticide spraying"
    return "Low pest risk - Continue regular monitoring"
