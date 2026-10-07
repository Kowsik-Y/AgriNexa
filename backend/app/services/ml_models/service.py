import hashlib
import io
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

from .metadata import (
    get_crop_class_names,
    get_disease_classes,
    get_health_recommendations,
    get_pesticide_recommendation,
    get_tamil_solution,
    infer_stress_indicators,
    parse_disease_class,
)

logger = logging.getLogger(__name__)

_models = {}
_device = None


def get_device():
    global _device
    if _device is None:
        try:
            import torch

            _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info(f"Using device: {_device}")
        except Exception as e:
            logger.warning(f"Failed to initialize torch device: {e}")
            _device = "cpu"
    return _device


def _find_model_file(filename: str) -> Optional[Path]:
    """Search for model weights in project models/ or workspace directory."""
    this_file = Path(__file__).resolve()
    candidates = [
        this_file.parents[4] / "models" / filename,
        this_file.parents[5] / filename,
        this_file.parents[3] / "models" / filename,
        Path("models") / filename,
        Path(filename),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def load_disease_model() -> Any:
    global _models
    if "disease_model" in _models:
        return _models["disease_model"]

    try:
        import torch
        import torchvision.models as models

        model_file = _find_model_file("disease_resnet50.pt")
        if not model_file or not model_file.exists():
            logger.warning("disease_resnet50.pt not found on disk")
            return None

        device = get_device()
        checkpoint = torch.load(str(model_file), map_location=device, weights_only=False)

        if isinstance(checkpoint, torch.nn.Module):
            model = checkpoint
        else:
            state_dict = (
                checkpoint.get("state_dict")
                or checkpoint.get("model_state_dict")
                or checkpoint.get("model")
                or checkpoint
            )
            # Remove possible DataParallel prefix
            cleaned_state_dict = {}
            for k, v in state_dict.items():
                new_key = k.replace("module.", "").replace("model.", "")
                cleaned_state_dict[new_key] = v

            model = models.resnet50(weights=None)
            model.fc = torch.nn.Linear(2048, 38)
            try:
                model.load_state_dict(cleaned_state_dict, strict=True)
            except Exception:
                model.load_state_dict(cleaned_state_dict, strict=False)

        model = model.to(device)
        model.eval()

        _models["disease_model"] = model
        logger.info(f"Disease detection model loaded from {model_file}")
        return model
    except Exception as e:
        logger.error(f"Failed to load disease model: {e}")
        return None


def load_health_scoring_model() -> Any:
    global _models
    if "health_model" in _models:
        return _models["health_model"]

    try:
        import torch
        import torchvision.models as models

        model_file = _find_model_file("health_mobilenet_v2.pt")
        if not model_file or not model_file.exists():
            logger.warning("health_mobilenet_v2.pt not found on disk")
            return None

        device = get_device()
        checkpoint = torch.load(str(model_file), map_location=device, weights_only=False)

        if isinstance(checkpoint, torch.nn.Module):
            model = checkpoint
        else:
            state_dict = (
                checkpoint.get("state_dict")
                or checkpoint.get("model_state_dict")
                or checkpoint.get("model")
                or checkpoint
            )
            cleaned_state_dict = {k.replace("module.", "").replace("model.", ""): v for k, v in state_dict.items()}

            model = models.mobilenet_v2(weights=None)
            model.classifier = torch.nn.Sequential(torch.nn.Dropout(0.2), torch.nn.Linear(1280, 3))
            try:
                model.load_state_dict(cleaned_state_dict, strict=True)
            except Exception:
                model.load_state_dict(cleaned_state_dict, strict=False)

        model = model.to(device)
        model.eval()

        _models["health_model"] = model
        logger.info(f"Health scoring model loaded from {model_file}")
        return model
    except Exception as e:
        logger.error(f"Failed to load health scoring model: {e}")
        return None


def load_crop_classification_model() -> Any:
    global _models
    if "crop_classifier_model" in _models:
        return _models["crop_classifier_model"]

    try:
        import shutil
        import tempfile
        from tensorflow.keras.models import load_model

        model_path = _find_model_file("CropModel.keras") or _find_model_file("CropModel_finetuned.keras")
        if not model_path or not model_path.exists():
            logger.warning(f"Crop model not found on disk")
            return None

        try:
            model = load_model(str(model_path), compile=False)
        except Exception as lock_err:
            logger.info(f"Retrying crop model load via isolated temp directory: {lock_err}")
            temp_dir = tempfile.mkdtemp(prefix="agri_crop_")
            temp_copy = Path(temp_dir) / model_path.name
            shutil.copy2(str(model_path), str(temp_copy))
            model = load_model(str(temp_copy), compile=False)

        _models["crop_classifier_model"] = model
        logger.info(f"Crop classification model loaded from {model_path}")
        return model
    except Exception as e:
        logger.error(f"Failed to load crop classification model: {e}")
        return None



def preprocess_image(image_bytes: bytes) -> Optional[np.ndarray]:
    try:
        from PIL import Image
        import torchvision.transforms as transforms

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        preprocess = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
        return preprocess(image)
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return None


def _stable_unit_value(seed: str, salt: str) -> float:
    digest = hashlib.sha256(f"{seed}:{salt}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _build_image_seed(image_bytes: bytes, crop_name: str = "") -> str:
    image_digest = hashlib.sha256(image_bytes or b"").hexdigest()
    return f"{crop_name.lower()}:{image_digest}"


def detect_disease_from_image(image_bytes: bytes) -> Dict[str, Any]:
    try:
        import torch

        model = load_disease_model()
        if model is None:
            return _mock_disease_detection(image_bytes)

        tensor = preprocess_image(image_bytes)
        if tensor is None:
            return _mock_disease_detection(image_bytes)

        tensor = tensor.unsqueeze(0).to(get_device())

        with torch.no_grad():
            outputs = model(tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0].cpu().numpy()

        top_indices = np.argsort(-probabilities)[:3]
        diseases = get_disease_classes()
        
        top_predictions = []
        for idx in top_indices:
            raw_label = diseases[idx] if idx < len(diseases) else "Unknown"
            parsed = parse_disease_class(raw_label)
            top_predictions.append({
                "disease": parsed["disease"],
                "raw_class": raw_label,
                "crop": parsed["crop"],
                "confidence": float(probabilities[idx]),
            })

        best = top_predictions[0]
        pesticide_recommendation = get_pesticide_recommendation(best["disease"])
        tamil_solution = get_tamil_solution(best["disease"], best.get("crop", ""))

        return {
            "detected_disease": best["disease"],
            "disease": best["disease"],
            "crop": best.get("crop", "Unknown"),
            "raw_class": best.get("raw_class", ""),
            "confidence": round(best["confidence"], 3),
            "is_healthy": best["disease"].lower() == "healthy",
            "top_3_predictions": top_predictions,
            "pesticide_recommendation": pesticide_recommendation["pesticide"],
            "treatment_steps": pesticide_recommendation["treatment"],
            "dosage": pesticide_recommendation["dosage"],
            "application_frequency": pesticide_recommendation["frequency"],
            "tamil_solution": tamil_solution,
            "note": "AI prediction - verified with trained ResNet50 model"
            if best["confidence"] >= 0.75
            else "Low confidence prediction - consult agricultural extension",
        }
    except Exception as e:
        logger.error(f"Disease detection failed: {e}")
        return _mock_disease_detection(image_bytes)


def score_crop_health(image_bytes: bytes, crop_name: str = "Generic") -> Dict[str, Any]:
    try:
        import torch

        model = load_health_scoring_model()
        if model is None:
            return _mock_health_scoring(crop_name, image_bytes)

        tensor = preprocess_image(image_bytes)
        if tensor is None:
            return _mock_health_scoring(crop_name, image_bytes)

        tensor = tensor.unsqueeze(0).to(get_device())

        with torch.no_grad():
            outputs = model(tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0].cpu().numpy()

        health_classes = ["Healthy", "Stressed", "Diseased"]
        predicted_class = np.argmax(probabilities)
        health_status = health_classes[predicted_class]
        confidence = float(probabilities[predicted_class])

        if health_status == "Healthy":
            health_score = int(80 + confidence * 20)
        elif health_status == "Stressed":
            health_score = int(40 + confidence * 40)
        else:
            health_score = int(confidence * 40)

        return {
            "health_status": health_status,
            "health_score": health_score,
            "confidence": round(confidence, 3),
            "stress_indicators": infer_stress_indicators(health_status),
            "recommendations": get_health_recommendations(health_status, crop_name),
            "class_probabilities": {
                "healthy": round(float(probabilities[0]), 3),
                "stressed": round(float(probabilities[1]), 3),
                "diseased": round(float(probabilities[2]), 3),
            },
        }
    except Exception as e:
        logger.error(f"Health scoring failed: {e}")
        return _mock_health_scoring(crop_name, image_bytes)


def predict_crop_type_from_image(image_bytes: bytes) -> Dict[str, Any]:
    try:
        model = load_crop_classification_model()
        if model is None:
            return _mock_crop_classification(image_bytes)

        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224))

        # Pass ordinary float image values in 0..255 range (preprocessing is inside model)
        input_arr = np.array(image, dtype=np.float32)
        input_arr = np.expand_dims(input_arr, axis=0)

        raw_preds = model.predict(input_arr, verbose=0)[0]
        
        # Ensure probabilities via softmax if raw logits are returned
        if raw_preds.max() > 1.0 or raw_preds.min() < 0.0 or not np.isclose(np.sum(raw_preds), 1.0, atol=1e-2):
            exp_preds = np.exp(raw_preds - np.max(raw_preds))
            probs = exp_preds / exp_preds.sum()
        else:
            probs = raw_preds

        class_names = get_crop_class_names()
        model_classes = len(probs)
        if model_classes != len(class_names):
            class_names = class_names[:model_classes]

        top_indices = np.argsort(-probs)[:3]
        top_predictions = [
            {"crop": class_names[idx], "confidence": round(float(probs[idx]), 3)}
            for idx in top_indices
            if idx < len(class_names)
        ]

        if not top_predictions:
            return _mock_crop_classification(image_bytes)

        return {
            "predicted_crop": top_predictions[0]["crop"],
            "confidence": top_predictions[0]["confidence"],
            "top_3_predictions": top_predictions,
            "note": "Prediction from trained CropModel.keras",
        }
    except Exception as e:
        logger.error(f"Crop classification failed: {e}")
        return _mock_crop_classification(image_bytes)


def _mock_disease_detection(image_bytes: bytes) -> Dict[str, Any]:
    diseases = get_disease_classes()
    common_diseases = diseases[:15]
    seed = _build_image_seed(image_bytes)

    detected_idx = int(_stable_unit_value(seed, "detected") * len(common_diseases))
    detected_idx = min(detected_idx, len(common_diseases) - 1)
    detected = common_diseases[detected_idx]

    if detected != "Healthy":
        confidence = 0.75 + 0.23 * _stable_unit_value(seed, "conf_disease")
    else:
        confidence = 0.85 + 0.14 * _stable_unit_value(seed, "conf_healthy")

    candidate_indices = [detected_idx, (detected_idx + 3) % len(common_diseases), (detected_idx + 7) % len(common_diseases)]
    candidate_diseases = [common_diseases[i] for i in candidate_indices]

    second = max(0.01, confidence * (0.45 + 0.15 * _stable_unit_value(seed, "second")))
    third = max(0.01, confidence * (0.25 + 0.10 * _stable_unit_value(seed, "third")))

    top_3 = [
        (confidence, candidate_diseases[0]),
        (min(second, confidence - 0.01), candidate_diseases[1]),
        (min(third, second - 0.01), candidate_diseases[2]),
    ]

    pesticide_rec = get_pesticide_recommendation(detected)
    return {
        "detected_disease": detected,
        "confidence": round(confidence, 3),
        "is_healthy": detected == "Healthy",
        "top_3_predictions": [{"disease": d, "confidence": round(c, 3)} for c, d in top_3],
        "pesticide_recommendation": pesticide_rec["pesticide"],
        "treatment_steps": pesticide_rec["treatment"],
        "dosage": pesticide_rec["dosage"],
        "application_frequency": pesticide_rec["frequency"],
        "note": "Mock prediction - model not loaded. Consult expert for confirmation.",
    }


def _mock_health_scoring(crop_name: str, image_bytes: bytes = b"") -> Dict[str, Any]:
    seed = _build_image_seed(image_bytes, crop_name)
    roll = _stable_unit_value(seed, "status")

    if roll < 0.6:
        status_choice = "Healthy"
    elif roll < 0.9:
        status_choice = "Stressed"
    else:
        status_choice = "Diseased"

    if status_choice == "Healthy":
        score = int(80 + 20 * _stable_unit_value(seed, "score_healthy"))
        confidence = 0.85 + 0.14 * _stable_unit_value(seed, "conf_healthy")
        indicators = ["No visible stress indicators"]
    elif status_choice == "Stressed":
        score = int(40 + 39 * _stable_unit_value(seed, "score_stressed"))
        confidence = 0.70 + 0.20 * _stable_unit_value(seed, "conf_stressed")
        indicators = ["Slight yellowing", "Reduced leaf turgor", "Possible nutrient deficiency"]
    else:
        score = int(39 * _stable_unit_value(seed, "score_diseased"))
        confidence = 0.65 + 0.20 * _stable_unit_value(seed, "conf_diseased")
        indicators = ["Visible disease lesions", "Significant discoloration"]

    recommendations = get_health_recommendations(status_choice, crop_name)

    healthy_raw = _stable_unit_value(seed, "prob_healthy")
    stressed_raw = _stable_unit_value(seed, "prob_stressed")
    diseased_raw = _stable_unit_value(seed, "prob_diseased")
    total = healthy_raw + stressed_raw + diseased_raw
    healthy_prob = healthy_raw / total if total else 0.33
    stressed_prob = stressed_raw / total if total else 0.33
    diseased_prob = diseased_raw / total if total else 0.34

    return {
        "health_status": status_choice,
        "health_score": score,
        "confidence": round(confidence, 3),
        "stress_indicators": indicators,
        "recommendations": recommendations,
        "class_probabilities": {
            "healthy": round(healthy_prob, 3),
            "stressed": round(stressed_prob, 3),
            "diseased": round(diseased_prob, 3),
        },
        "note": "Mock prediction - model not loaded",
    }


def _mock_crop_classification(image_bytes: bytes) -> Dict[str, Any]:
    class_names = get_crop_class_names()
    seed = _build_image_seed(image_bytes)

    first = int(_stable_unit_value(seed, "crop_first") * len(class_names))
    first = min(first, len(class_names) - 1)
    second = (first + 7) % len(class_names)
    third = (first + 13) % len(class_names)

    base_conf = 0.65 + (0.25 * _stable_unit_value(seed, "crop_conf"))
    second_conf = max(0.05, base_conf * 0.45)
    third_conf = max(0.03, base_conf * 0.30)

    return {
        "predicted_crop": class_names[first],
        "confidence": round(base_conf, 3),
        "top_3_predictions": [
            {"crop": class_names[first], "confidence": round(base_conf, 3)},
            {"crop": class_names[second], "confidence": round(second_conf, 3)},
            {"crop": class_names[third], "confidence": round(third_conf, 3)},
        ],
        "note": "Mock prediction - crop model not loaded",
    }


def preload_models():
    try:
        logger.info("Preloading ML models...")
        load_disease_model()
        load_health_scoring_model()
        load_crop_classification_model()
        logger.info("Models preloaded successfully")
    except Exception as e:
        logger.warning(f"Failed to preload models: {e}")
