"""
AgriFlow Pipeline - Orchestrates all 8 farming stages from a single input.
"""

from .land_preparation import analyze_soil, predict_crop
from .seed_selection import recommend_seeds
from .irrigation import recommend_irrigation
from .fertilizer import recommend_fertilizer
from .pest_detection import get_pest_risks
from .crop_monitoring import monitor_crop
from .harvest_prediction import predict_harvest
from .storage_marketing import suggest_storage, get_market_insights


def run_pipeline(nitrogen: float, phosphorus: float, potassium: float,
                 ph: float, temperature: float, humidity: float) -> dict:
    """
    Main pipeline: takes 6 soil/weather inputs and returns a complete farming plan.

    Args:
        nitrogen:    Nitrogen level in soil (kg/ha)
        phosphorus:  Phosphorus level in soil (kg/ha)
        potassium:   Potassium level in soil (kg/ha)
        ph:          Soil pH value
        temperature: Current temperature (°C)
        humidity:    Current humidity (%)

    Returns:
        Complete farming plan covering all 8 stages.
    """

    # ── Stage 1: Land Preparation ──
    soil_analysis = analyze_soil(nitrogen, phosphorus, potassium, ph, temperature, humidity)

    # ── Stage 2: Crop Prediction ──
    crop_prediction = predict_crop(nitrogen, phosphorus, potassium, ph, temperature, humidity)
    predicted_crop = crop_prediction["predicted_crop"]

    # ── Stage 3: Seed Selection (auto from predicted crop) ──
    seeds = recommend_seeds(predicted_crop)

    # ── Stage 4: Irrigation Management (auto from crop + weather) ──
    irrigation = recommend_irrigation(predicted_crop, humidity, temperature)

    # ── Stage 5: Fertilizer Recommendation (auto from NPK + crop) ──
    fertilizer = recommend_fertilizer(nitrogen, phosphorus, potassium, predicted_crop)

    # ── Stage 6: Pest & Disease Risks (auto from crop + weather) ──
    pest_risks = get_pest_risks(predicted_crop, humidity, temperature)

    # ── Stage 7: Crop Monitoring Plan (auto from crop + weather) ──
    monitoring = monitor_crop(predicted_crop, temperature, humidity)

    # ── Stage 8: Harvest Prediction (auto from crop + weather) ──
    harvest = predict_harvest(predicted_crop, temperature, humidity)

    # ── Stage 9: Storage & Marketing (auto from predicted crop) ──
    storage = suggest_storage(predicted_crop)
    market = get_market_insights(predicted_crop)

    return {
        "status": "success",
        "input_parameters": {
            "nitrogen": nitrogen,
            "phosphorus": phosphorus,
            "potassium": potassium,
            "ph": ph,
            "temperature": temperature,
            "humidity": humidity,
        },
        "farming_plan": {
            "land_preparation": soil_analysis,
            "crop_prediction": crop_prediction,
            "seed_selection": seeds,
            "irrigation": irrigation,
            "fertilizer": fertilizer,
            "pest_risks": pest_risks,
            "crop_monitoring": monitoring,
            "harvest_prediction": harvest,
            "storage": storage,
            "market_insights": market,
        },
    }
