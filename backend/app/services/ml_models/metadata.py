import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Fallback classes matching CropModel.keras (30 crops)
DEFAULT_CROP_CLASSES = [
    "Cherry", "Coffee-plant", "Cucumber", "Fox_nut(Makhana)", "Lemon",
    "Olive-tree", "Pearl_millet(bajra)", "Tobacco-plant", "almond", "banana",
    "cardamom", "chili", "clove", "coconut", "cotton", "gram", "jowar", "jute",
    "maize", "mustard-oil", "papaya", "pinapple", "rice", "soybean", "sugarcane",
    "sunflower", "tea", "tomato", "vigna-radiati(Mung)", "wheat",
]

# PlantVillage 38 classes exactly matching disease_resnet50.pt
DEFAULT_DISEASE_CLASSES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

def _find_json(filename: str) -> Optional[Path]:
    this_file = Path(__file__).resolve()
    for parent in [
        this_file.parents[4] / "models" / filename,
        this_file.parents[5] / filename,
        this_file.parents[3] / "models" / filename,
        Path("models") / filename,
        Path(filename),
    ]:
        if parent.exists():
            return parent
    return None

def get_crop_class_names() -> List[str]:
    path = _find_json("CropModel_classes.json") or _find_json("crop_class_map.json")
    if path and path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    return [data[k] for k in sorted(data.keys(), key=lambda x: int(x) if x.isdigit() else x)]
        except Exception as e:
            logger.warning(f"Failed to read crop classes from {path}: {e}")
    return list(DEFAULT_CROP_CLASSES)


def get_disease_classes() -> List[str]:
    path = _find_json("disease_resnet50_classes.json") or _find_json("disease_class_map.json")
    if path and path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    return [data[k] for k in sorted(data.keys(), key=lambda x: int(x) if x.isdigit() else x)]
        except Exception as e:
            logger.warning(f"Failed to read disease classes from {path}: {e}")
    return list(DEFAULT_DISEASE_CLASSES)


def parse_disease_class(raw_class: str) -> Dict[str, Any]:
    """Parse composite class like 'Tomato___Early_blight' into human-readable fields."""
    if "___" in raw_class:
        crop_part, condition_part = raw_class.split("___", 1)
        clean_crop = crop_part.replace("_", " ").replace("(including sour)", "").strip()
        clean_disease = condition_part.replace("_", " ").strip()
    else:
        clean_crop = "Unknown"
        clean_disease = raw_class.replace("_", " ").strip()

    is_healthy = clean_disease.lower() == "healthy"
    return {
        "raw_class": raw_class,
        "crop": clean_crop.title(),
        "disease": "Healthy" if is_healthy else clean_disease.title(),
        "is_healthy": is_healthy,
    }


def get_pesticide_recommendation(disease: str) -> Dict[str, str]:
    disease_lower = disease.lower()

    if "healthy" in disease_lower:
        return {
            "pesticide": "None required",
            "dosage": "N/A",
            "frequency": "Continue regular scouting",
            "treatment": "Plant shows no foliar pathology. Maintain balanced nutrition, adequate hydration, and monitor weekly.",
        }

    if "early blight" in disease_lower or "alternaria" in disease_lower:
        return {
            "pesticide": "Mancozeb 75% WP or Chlorothalonil",
            "dosage": "2.5 g / Liter of water",
            "frequency": "Spray at 7-10 day intervals at first sign of lesions",
            "treatment": "Prune bottom infected leaves. Ensure adequate furrow or drip irrigation to keep foliage dry. Rotate crops annually.",
        }

    if "late blight" in disease_lower or "phytophthora" in disease_lower:
        return {
            "pesticide": "Metalaxyl-M 8% + Mancozeb 64% WP (Ridomil Gold)",
            "dosage": "2.0 g / Liter of water",
            "frequency": "Spray immediately upon detection, repeat every 7 days",
            "treatment": "Destroy heavily blighted foliage. Avoid overhead irrigation during humid weather. Apply copper protective spray.",
        }

    if "scab" in disease_lower:
        return {
            "pesticide": "Captan 50% WP or Difenoconazole 25% EC",
            "dosage": "1.5 g / Liter of water",
            "frequency": "Spray at green tip stage and petal fall",
            "treatment": "Rake and destroy fallen leaves. Prune dense branches to allow sunlight penetration and fast canopy drying.",
        }

    if "rust" in disease_lower:
        return {
            "pesticide": "Propiconazole 25% EC or Azoxystrobin",
            "dosage": "1 ml / Liter of water",
            "frequency": "Apply when pustules first appear on lower leaf surface",
            "treatment": "Use rust-resistant crop varieties. Avoid excessive nitrogen applications that promote overly succulent foliage.",
        }

    if "powdery mildew" in disease_lower:
        return {
            "pesticide": "Wettable Sulfur 80% WP or Hexaconazole 5% EC",
            "dosage": "2 g / Liter (Sulfur) or 1 ml / Liter (Hexaconazole)",
            "frequency": "Apply at 10-14 day intervals",
            "treatment": "Improve air circulation. Neem oil spray (3 ml/L) can be applied in early stages as an organic control.",
        }

    if "bacterial" in disease_lower or "spot" in disease_lower or "canker" in disease_lower:
        return {
            "pesticide": "Copper Oxychloride 50% WP + Streptocycline (90:10)",
            "dosage": "2.5 g Copper Oxychloride + 0.1 g Streptocycline / Liter",
            "frequency": "Spray at 10-12 day intervals",
            "treatment": "Sterilize pruning tools between plants. Do not work in wet fields. Use certified disease-free seeds.",
        }

    if "leaf mold" in disease_lower or "septoria" in disease_lower:
        return {
            "pesticide": "Carbendazim 50% WP or Chlorothalonil 75% WP",
            "dosage": "1.5 g / Liter of water",
            "frequency": "Spray at 10-15 day intervals",
            "treatment": "Lower greenhouse/canopy humidity below 85%. Stake and space plants for maximum airflow.",
        }

    if "spider mite" in disease_lower or "mite" in disease_lower:
        return {
            "pesticide": "Abamectin 1.9% EC or Wettable Sulfur",
            "dosage": "0.5 ml / Liter of water",
            "frequency": "Apply when stippling appears on leaves, targeting underside",
            "treatment": "Introduce predatory mites or spray horticultural neem oil (5 ml/L). Increase local humidity to deter mites.",
        }

    if "virus" in disease_lower or "mosaic" in disease_lower or "curl" in disease_lower:
        return {
            "pesticide": "Imidacloprid 17.8% SL (Vector Control for Whiteflies/Aphids)",
            "dosage": "0.5 ml / Liter of water",
            "frequency": "Spray at 15-day intervals targeting sap-sucking vectors",
            "treatment": "Viral infections cannot be cured with fungicides. Rogue and burn infected plants immediately. Install yellow sticky traps.",
        }

    # Standard general fungicide fallback
    return {
        "pesticide": "Carbendazim 12% + Mancozeb 63% WP (Saaf)",
        "dosage": "2 g / Liter of water",
        "frequency": "Spray at 10-14 day intervals",
        "treatment": "Remove and safely discard diseased leaf tissues. Improve sunlight penetration and avoid wetting foliage during irrigation.",
    }


def get_tamil_solution(disease: str, crop: str = "") -> str:
    """Provide clear, actionable advice in Tamil."""
    d_lower = disease.lower()
    c_name = crop or "பயிர்"

    if "healthy" in d_lower:
        return f"{c_name} ஆரோக்கியமாக உள்ளது. நோய் அறிகுறிகள் ஏதும் இல்லை. சீரான நீர் மற்றும் ஊட்டச்சத்து மேலாண்மையை தொடரவும்."
    if "early blight" in d_lower:
        return f"{c_name}ில் முன்கூட்டிய கருகல் நோய் (Early Blight) காணப்படுகிறது. மேன்கோசெப் (Mancozeb) 2.5 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும். பாதிக்கப்பட்ட இலைகளை உடனே அப்புறப்படுத்தவும்."
    if "late blight" in d_lower:
        return f"{c_name}ில் பின்கூட்டிய கருகல் நோய் (Late Blight) உள்ளது. மெட்டலாக்சில் + மேன்கோசெப் (Ridomil Gold) 2 கிராம்/லிட்டர் தெளிக்கவும். அதிக ஈரப்பதம் உள்ள சூழலில் தண்ணீர் தேங்காமல் பார்த்துக் கொள்ளவும்."
    if "powdery mildew" in d_lower:
        return f"{c_name}ில் சாம்பல் நோய் (Powdery Mildew) தென்படுகிறது. நனையும் கந்தகம் (Wettable Sulphur) 2 கிராம் அல்லது ஹெக்சாகோனசோல் 1 மி.லி/லிட்டர் தெளிக்கவும்."
    if "rust" in d_lower:
        return f"{c_name}ில் துரு நோய் (Rust) தென்படுகிறது. புரோபிகோனசோல் 1 மி.லி/லிட்டர் நீரில் கலந்து 10-12 நாட்கள் இடைவெளியில் தெளிக்கவும்."
    if "bacterial" in d_lower or "spot" in d_lower:
        return f"{c_name}ில் பாக்டீரியா இலைப்புள்ளி நோய் உள்ளது. காப்பர் ஆக்ஸிகுளோரைடு 2.5 கிராம் மற்றும் ஸ்ட்ரெப்டோமைசின் 0.1 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும்."
    if "virus" in d_lower or "curl" in d_lower or "mosaic" in d_lower:
        return f"{c_name}ில் வைரஸ் நோய் கண்டறியப்பட்டுள்ளது. பாதிக்கப்பட்ட செடிகளை உடனே பிடுங்கி அழிக்கவும். வெள்ளை ஈக்கள் கட்டுப்படுத்த இமிடாக்ளோப்ரிட் 0.5 மி.லி/லிட்டர் தெளிக்கவும்."
    
    return f"{c_name}ில் பூஞ்சாண நோய் பாதிப்பு உள்ளது. சாப் (Saaf - Carbendazim + Mancozeb) 2 கிராம்/லிட்டர் நீரில் கலந்து தெளிக்கவும். வேளாண்மை அலுவலரை அணுகவும்."


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

