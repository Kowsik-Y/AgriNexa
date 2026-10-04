"""
Growth Stage Model Loader

Loads and manages the trained growth stage models from the models/ directory:
  1. stage_model.pkl — sklearn RandomForest (N, P, K, temperature, humidity, ph, label → Flowering/Seedling/Vegetative)
  2. improved_growth_stage_model.pkl — sklearn RandomForest (Soil_Type, Sunlight_Hours, Water_Frequency, Fertilizer_Type, Temperature, Humidity → Growth_Milestone 0/1)
  3. growth_stage_modelfinal.pt — PyTorch GrowthStageNet (same features as #2 but with preprocessor)

The primary model is #1 (stage_model.pkl) for multi-class stage prediction.
Model #2 is used for binary growth milestone prediction.
Model #3 (PyTorch) is available but only used when explicitly requested.
"""

import json
import logging
import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Resolve the directory where models are stored
_GROWTH_STAGE_DIR = Path(__file__).resolve().parent / "growth_stage"


class GrowthStageModelLoader:
    """Manages loading and inference for growth-stage prediction models."""

    def __init__(self) -> None:
        # Stage model (Flowering / Seedling / Vegetative)
        self.stage_model: Optional[Any] = None
        self.stage_metadata: Optional[Dict] = None

        # Improved growth milestone model (binary 0/1)
        self.milestone_model: Optional[Any] = None
        self.milestone_preprocessor: Optional[Any] = None
        self.milestone_metadata: Optional[Dict] = None

        # PyTorch model (GrowthStageNet)
        self.pytorch_model: Optional[Any] = None
        self.pytorch_config: Optional[Dict] = None
        self.pytorch_preprocessor: Optional[Any] = None

        self.last_error: Optional[str] = None
        self._loaded = False
        self._load_all()

    # ── Loading ──────────────────────────────────────────────────────────

    def _load_all(self) -> None:
        self._load_stage_model()
        self._load_milestone_model()
        self._load_pytorch_model()
        self._loaded = True

    def _load_pickle(self, path: Path) -> Optional[Any]:
        """Load a pickle/joblib model with fallback."""
        if not path.exists():
            logger.warning(f"Model file not found: {path}")
            return None
        try:
            import joblib  # type: ignore
            model = joblib.load(path)
            logger.info(f"Loaded model via joblib: {path.name}")
            return model
        except Exception:
            pass
        try:
            with open(path, "rb") as f:
                model = pickle.load(f)
            logger.info(f"Loaded model via pickle: {path.name}")
            return model
        except Exception as e:
            logger.error(f"Failed to load {path.name}: {e}")
            return None

    def _load_json(self, path: Path) -> Optional[Dict]:
        if not path.exists():
            return None
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load JSON {path.name}: {e}")
            return None

    def _load_stage_model(self) -> None:
        """Load stage_model.pkl — RandomForest for N/P/K/temp/humidity/ph/label → stage."""
        self.stage_metadata = self._load_json(_GROWTH_STAGE_DIR / "stage_metadata.json")
        self.stage_model = self._load_pickle(_GROWTH_STAGE_DIR / "stage_model.pkl")
        if self.stage_model:
            logger.info("Stage model (RandomForest multi-class) loaded successfully")

    def _load_milestone_model(self) -> None:
        """Load improved_growth_stage_model.pkl — RandomForest for 6-feature → Growth_Milestone."""
        self.milestone_metadata = self._load_json(
            _GROWTH_STAGE_DIR / "improved_growth_stage_metadata.json"
        )
        loaded = self._load_pickle(_GROWTH_STAGE_DIR / "improved_growth_stage_model.pkl")
        if isinstance(loaded, dict):
            self.milestone_model = loaded.get("model")
            self.milestone_preprocessor = loaded.get("preprocessor")
        else:
            self.milestone_model = loaded
        if self.milestone_model:
            logger.info("Milestone model (improved RandomForest) loaded successfully")

    def _load_pytorch_model(self) -> None:
        """Load the PyTorch GrowthStageNet and its preprocessor."""
        self.pytorch_config = self._load_json(_GROWTH_STAGE_DIR / "growth_stage_config.json")

        preprocessor_path = _GROWTH_STAGE_DIR / "growth_stage_preprocessor.pkl"
        if preprocessor_path.exists():
            self.pytorch_preprocessor = self._load_pickle(preprocessor_path)
            if self.pytorch_preprocessor:
                logger.info("PyTorch preprocessor loaded")

        model_path = _GROWTH_STAGE_DIR / "growth_stage_modelfinal.pt"
        if not model_path.exists():
            logger.warning(f"PyTorch model not found: {model_path}")
            return

        try:
            import torch
            import torch.nn as nn

            config = self.pytorch_config or {}
            input_size = config.get("input_size", 12)
            num_classes = config.get("num_classes", 2)

            class GrowthStageNet(nn.Module):
                """Architecture matching the trained checkpoint."""
                def __init__(self, in_features: int, n_classes: int):
                    super().__init__()
                    self.network = nn.Sequential(
                        nn.Linear(in_features, 512),
                        nn.BatchNorm1d(512),
                        nn.ReLU(),
                        nn.Dropout(0.3),
                        nn.Linear(512, 256),
                        nn.BatchNorm1d(256),
                        nn.ReLU(),
                        nn.Dropout(0.3),
                        nn.Linear(256, 128),
                        nn.BatchNorm1d(128),
                        nn.ReLU(),
                        nn.Dropout(0.2),
                        nn.Linear(128, 64),
                        nn.ReLU(),
                        nn.Linear(64, n_classes),
                    )

                def forward(self, x: torch.Tensor) -> torch.Tensor:
                    return self.network(x)

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model = GrowthStageNet(input_size, num_classes)
            state = torch.load(model_path, map_location=device, weights_only=False)
            if isinstance(state, dict) and "model_state_dict" in state:
                state_dict = state["model_state_dict"]
            else:
                state_dict = state
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            self.pytorch_model = model
            logger.info("PyTorch GrowthStageNet loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load PyTorch model: {e}")
            self.last_error = str(e)

    # ── Inference ────────────────────────────────────────────────────────

    def predict_stage(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict the growth stage using the RandomForest stage model.

        Expected features: N, P, K, temperature, humidity, ph, label (crop name).
        Returns one of: Flowering, Seedling, Vegetative.
        """
        if self.stage_model is None:
            return self._heuristic_stage(features)

        metadata = self.stage_metadata or {}
        classes = metadata.get("classes", ["Flowering", "Seedling", "Vegetative"])
        expected_features = metadata.get(
            "features", ["N", "P", "K", "temperature", "humidity", "ph", "label"]
        )

        try:
            # The stage_model pipeline expects a DataFrame-like input
            import pandas as pd

            row_data = {}
            for feat in expected_features:
                val = features.get(feat, features.get(feat.lower(), 0))
                row_data[feat] = [val]

            df = pd.DataFrame(row_data)
            prediction = self.stage_model.predict(df)
            stage = str(prediction[0])

            confidence = 0.65
            if hasattr(self.stage_model, "predict_proba"):
                try:
                    probas = self.stage_model.predict_proba(df)
                    confidence = float(np.max(probas[0]))
                except Exception:
                    pass

            return {
                "predicted_stage": stage,
                "confidence": round(confidence, 4),
                "model_status": "loaded_growth_stage_model",
                "model_name": "stage_model.pkl",
                "classes": classes,
            }
        except Exception as e:
            logger.error(f"Stage model prediction failed: {e}")
            return self._heuristic_stage(features)

    def predict_milestone(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict growth milestone (binary 0/1) using the improved RF model.

        Expected features: Soil_Type, Sunlight_Hours, Water_Frequency,
        Fertilizer_Type, Temperature, Humidity.
        """
        if self.milestone_model is None:
            return {
                "predicted_milestone": 0,
                "confidence": 0.5,
                "model_status": "model_not_loaded",
                "note": "Milestone model not available — using default",
            }

        metadata = self.milestone_metadata or {}
        expected_features = metadata.get(
            "features",
            ["Soil_Type", "Sunlight_Hours", "Water_Frequency", "Fertilizer_Type", "Temperature", "Humidity"],
        )

        try:
            import pandas as pd

            row_data = {}
            for feat in expected_features:
                val = features.get(feat, features.get(feat.lower(), 0))
                row_data[feat] = [val]

            df = pd.DataFrame(row_data)
            if self.milestone_preprocessor is not None:
                X = self.milestone_preprocessor.transform(df)
            else:
                X = df
            prediction = self.milestone_model.predict(X)
            milestone = int(prediction[0])

            confidence = 0.6
            if hasattr(self.milestone_model, "predict_proba"):
                try:
                    probas = self.milestone_model.predict_proba(X)
                    confidence = float(np.max(probas[0]))
                except Exception:
                    pass

            milestone_labels = {0: "Not Reached", 1: "Milestone Reached"}
            return {
                "predicted_milestone": milestone,
                "milestone_label": milestone_labels.get(milestone, str(milestone)),
                "confidence": round(confidence, 4),
                "model_status": "loaded_milestone_model",
                "model_name": "improved_growth_stage_model.pkl",
            }
        except Exception as e:
            logger.error(f"Milestone model prediction failed: {e}")
            return {
                "predicted_milestone": 0,
                "confidence": 0.5,
                "model_status": "prediction_error",
                "error": str(e),
            }

    def predict_pytorch(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict growth milestone using the PyTorch GrowthStageNet.

        Requires the preprocessor to transform raw features into the expected format.
        """
        if self.pytorch_model is None:
            return {
                "predicted_class": 0,
                "confidence": 0.5,
                "model_status": "pytorch_not_loaded",
            }

        config = self.pytorch_config or {}
        numeric_features = config.get("numeric_features", ["Sunlight_Hours", "Temperature", "Humidity"])
        categorical_features = config.get("categorical_features", ["Soil_Type", "Water_Frequency", "Fertilizer_Type"])
        classes = config.get("classes", ["0", "1"])

        try:
            import torch
            import pandas as pd

            row_data = {}
            for feat in numeric_features + categorical_features:
                val = features.get(feat, features.get(feat.lower(), 0))
                row_data[feat] = [val]

            df = pd.DataFrame(row_data)

            if self.pytorch_preprocessor is not None:
                input_arr = self.pytorch_preprocessor.transform(df)
                if hasattr(input_arr, "toarray"):
                    input_arr = input_arr.toarray()
                tensor = torch.FloatTensor(input_arr)
            else:
                # Fallback: just use numeric values
                vals = [float(features.get(f, 0)) for f in numeric_features]
                tensor = torch.FloatTensor([vals])

            device = next(self.pytorch_model.parameters()).device
            tensor = tensor.to(device)

            with torch.no_grad():
                outputs = self.pytorch_model(tensor)
                probas = torch.nn.functional.softmax(outputs, dim=1)[0].cpu().numpy()

            predicted_idx = int(np.argmax(probas))
            confidence = float(probas[predicted_idx])

            return {
                "predicted_class": predicted_idx,
                "predicted_label": classes[predicted_idx] if predicted_idx < len(classes) else str(predicted_idx),
                "confidence": round(confidence, 4),
                "class_probabilities": {
                    classes[i]: round(float(probas[i]), 4) for i in range(len(probas)) if i < len(classes)
                },
                "model_status": "loaded_pytorch_model",
                "model_name": "growth_stage_modelfinal.pt",
            }
        except Exception as e:
            logger.error(f"PyTorch model prediction failed: {e}")
            return {
                "predicted_class": 0,
                "confidence": 0.5,
                "model_status": "pytorch_error",
                "error": str(e),
            }

    def predict_all(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Run all three models and return combined results."""
        return {
            "stage": self.predict_stage(features),
            "milestone": self.predict_milestone(features),
            "pytorch": self.predict_pytorch(features),
        }

    # ── Status & Utilities ───────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        return {
            "stage_model_loaded": self.stage_model is not None,
            "milestone_model_loaded": self.milestone_model is not None,
            "pytorch_model_loaded": self.pytorch_model is not None,
            "models_directory": str(_GROWTH_STAGE_DIR),
            "last_error": self.last_error,
        }

    def reload(self) -> Dict[str, Any]:
        self.stage_model = None
        self.milestone_model = None
        self.pytorch_model = None
        self.last_error = None
        self._load_all()
        return self.get_status()

    @staticmethod
    def _heuristic_stage(features: Dict[str, Any]) -> Dict[str, Any]:
        """Heuristic fallback when no model is loaded."""
        temp = float(features.get("temperature", features.get("Temperature", 25)))
        humidity = float(features.get("humidity", features.get("Humidity", 60)))

        if temp > 30 and humidity > 70:
            stage = "Flowering"
        elif temp < 20:
            stage = "Seedling"
        else:
            stage = "Vegetative"

        return {
            "predicted_stage": stage,
            "confidence": 0.45,
            "model_status": "heuristic_fallback",
            "note": "No model loaded — using temperature/humidity heuristic",
        }

    @staticmethod
    def get_stage_recommendations(stage: str, crop: str = "Generic") -> List[str]:
        """Return actionable recommendations based on predicted growth stage."""
        recs = {
            "Seedling": [
                f"Your {crop} is in seedling stage — ensure consistent moisture",
                "Protect from extreme temperatures and strong wind",
                "Apply starter fertilizer (high phosphorus) to promote root growth",
                "Monitor for damping-off disease and seedling pests",
            ],
            "Vegetative": [
                f"Your {crop} is actively growing — increase nitrogen fertilization",
                "Ensure adequate water supply for leaf and stem development",
                "Begin regular pest scouting every 3-5 days",
                "Consider foliar micronutrient spray if leaves show deficiency signs",
            ],
            "Flowering": [
                f"Your {crop} has entered flowering stage — critical period for yield",
                "Maintain consistent irrigation — water stress now reduces yield significantly",
                "Apply potassium-rich fertilizer to support flowering and fruit set",
                "Avoid pesticide spraying that could harm pollinators",
                "Monitor for flower drop due to heat stress",
            ],
        }
        return recs.get(stage, [
            f"Continue monitoring your {crop} crop health",
            "Maintain regular watering and nutrient schedule",
            "Scout for pests and diseases regularly",
        ])


# Singleton instance — loaded once at import time
growth_stage_model_loader = GrowthStageModelLoader()
