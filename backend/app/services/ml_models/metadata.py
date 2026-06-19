from typing import Dict, List


def get_crop_class_names() -> List[str]:
    return [
        "Cherry",
        "Coffee-plant",
        "Cucumber",
        "Fox_nut(Makhana)",
        "Lemon",
        "Olive-tree",
        "Pearl_millet(bajra)",
        "Tobacco-plant",
        "almond",
        "banana",
        "cardamom",
        "chili",
        "clove",
        "coconut",
        "cotton",
        "gram",
        "jowar",
        "jute",
        "maize",
        "mustard-oil",
        "papaya",
        "pinapple",
        "rice",
        "soybean",
        "sugarcane",
        "sunflower",
        "tea",
        "tomato",
        "vigna-radiati(Mung)",
        "wheat",
    ]


def get_disease_classes() -> List[str]:
    return [
        "Healthy",
        "Early Blight", "Late Blight", "Septoria Leaf Spot",
        "Leaf Blight", "Brown Spot", "Bacterial Leaf Streak",
        "Sheath Blight", "Blast", "Leaf Scald", "Narrow Brown Leaf Spot",
        "False Smut", "Stem Rot", "Panicle Blast",
        "Powdery Mildew", "Downy Mildew", "Rust", "Anthracnose",
        "Leaf Spot", "Wilts", "Damping Off", "Root Rot",
        "Fusarium Wilt", "Verticillium Wilt", "Bacterial Wilt",
        "Gray Mold", "White Mold", "Charcoal Rot",
        "Scab", "Canker", "Gall", "Mosaic Virus",
        "Yellow Mosaic Virus", "Leaf Roll Virus", "Stripe Virus",
        "Spider Mite Damage", "Whitefly Damage", "Aphid Damage",
    ]


def get_pesticide_recommendation(disease: str) -> Dict[str, str]:
    recommendations = {
        "Early Blight": {
            "pesticide": "Mancozeb 75% WP or Chlorothalonil",
            "dosage": "2.5 g/L of water",
            "frequency": "Spray at 10-day intervals",
            "treatment": "Apply fungicide early in season. Start when disease first appears. Alternate with copper-based fungicides.",
        },
        "Late Blight": {
            "pesticide": "Metalaxyl-M 8% + Mancozeb 64% WP",
            "dosage": "2 kg/ha",
            "frequency": "3-4 sprays at 7-10 day intervals",
            "treatment": "Start preventive sprays before disease appears. Remove infected leaves. Improve air circulation.",
        },
        "Blast": {
            "pesticide": "Tricyclazole 75% WP",
            "dosage": "0.6 g/L",
            "frequency": "Spray at booting and heading stage",
            "treatment": "Apply preventively during humid weather. Ensure proper drainage.",
        },
        "Sheath Blight": {
            "pesticide": "Hexaconazole 5% EC or Validamycin 3% SL",
            "dosage": "2 ml/L",
            "frequency": "2-3 sprays at 15-day intervals",
            "treatment": "Improve spacing. Reduce nitrogen. Remove infected leaves.",
        },
        "Leaf Spot": {
            "pesticide": "Carbendazim 50% WP or Copper Oxychloride",
            "dosage": "1 g/L",
            "frequency": "2-3 sprays at 10-15 day intervals",
            "treatment": "Improve ventilation. Remove and destroy affected leaves.",
        },
        "Healthy": {
            "pesticide": "None required",
            "dosage": "N/A",
            "frequency": "Continue regular monitoring",
            "treatment": "No treatment needed. Maintain crop health with regular scouting.",
        },
    }
    return recommendations.get(disease, recommendations["Leaf Spot"])


def infer_stress_indicators(health_status: str) -> List[str]:
    if health_status == "Healthy":
        return ["No visible stress indicators"]
    if health_status == "Stressed":
        return [
            "Slight yellowing or chlorosis",
            "Reduced leaf turgor",
            "Possible nutrient deficiency",
            "Minor wilting at leaf margins",
        ]
    return [
        "Visible disease lesions",
        "Significant discoloration",
        "Leaf necrosis visible",
        "Possible fungal or bacterial infection",
    ]


def get_health_recommendations(health_status: str, crop_name: str) -> List[str]:
    recommendations = {
        "Healthy": [
            f"Continue current {crop_name} management practices",
            "Monitor crop weekly for early signs of stress",
            "Maintain regular watering and fertilizer schedule",
            "Scout for pests and diseases every 3-5 days",
        ],
        "Stressed": [
            "Investigate stress cause (water, nutrients, pests, or disease)",
            "Check soil moisture - adjust watering if needed",
            "Test soil nutrition - apply balanced fertilizer if required",
            "Improve air circulation - prune affected leaves if possible",
            "Monitor closely for disease development",
        ],
        "Diseased": [
            "Identify disease early - consult agricultural extension",
            "Isolate affected area to prevent spread",
            "Apply appropriate fungicide/bactericide immediately",
            "Remove severely infected leaves and destroy them",
            "Increase monitoring frequency to daily if possible",
        ],
    }
    return recommendations.get(health_status, recommendations["Stressed"])
