import os
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings


class StageFlowModelLoader:
    def __init__(self) -> None:
        self.model: Optional[Any] = None
        self.model_path: Optional[str] = None
        self.last_error: Optional[str] = None
        self._load_once()

    def _load_once(self) -> None:
        model_dir = settings.colab_stage_model_dir
        model_file = settings.colab_stage_model_file
        path = os.path.join(model_dir, model_file)
        self.model_path = path

        if not os.path.exists(path):
            self.last_error = f"Model file not found: {path}"
            return

        try:
            # joblib is common for sklearn exports from Colab.
            import joblib  # type: ignore

            self.model = joblib.load(path)
            self.last_error = None
            return
        except Exception as exc_joblib:
            self.last_error = f"joblib load failed: {exc_joblib}"

        try:
            import pickle

            with open(path, "rb") as handle:
                self.model = pickle.load(handle)
            self.last_error = None
        except Exception as exc_pickle:
            self.last_error = f"pickle load failed: {exc_pickle}"

    def reload(self) -> Dict[str, Any]:
        self.model = None
        self.last_error = None
        self._load_once()
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        return {
            "loaded": self.model is not None,
            "model_path": self.model_path,
            "error": self.last_error,
        }

    @staticmethod
    def _heuristic_stage(growth_stage_day: int) -> Tuple[str, float]:
        if growth_stage_day <= 10:
            return "land_preparation", 0.58
        if growth_stage_day <= 20:
            return "sowing", 0.62
        if growth_stage_day <= 65:
            return "vegetative", 0.66
        if growth_stage_day <= 95:
            return "flowering", 0.63
        if growth_stage_day <= 120:
            return "harvest", 0.64
        return "post_harvest", 0.61

    def predict_stage(self, features: Dict[str, float]) -> Dict[str, Any]:
        growth_stage_day = int(features.get("growth_stage_day", 30))

        if self.model is None:
            stage, confidence = self._heuristic_stage(growth_stage_day)
            return {
                "predicted_stage": stage,
                "confidence": confidence,
                "model_status": "fallback_heuristic",
                "explanation_source": "heuristic",
            }

        ordered_feature_names: List[str] = [
            "growth_stage_day",
            "temperature",
            "humidity",
            "health_score",
            "nitrogen",
            "phosphorus",
            "potassium",
            "ph",
        ]
        row = [[float(features.get(name, 0.0)) for name in ordered_feature_names]]

        try:
            prediction = self.model.predict(row)
            stage = str(prediction[0]) if isinstance(prediction, (list, tuple)) else str(prediction)

            confidence = 0.7
            if hasattr(self.model, "predict_proba"):
                probabilities = self.model.predict_proba(row)
                if probabilities is not None:
                    confidence = float(max(probabilities[0]))

            return {
                "predicted_stage": stage,
                "confidence": round(confidence, 4),
                "model_status": "loaded_colab_model",
                "explanation_source": "model",
            }
        except Exception as exc:
            stage, confidence = self._heuristic_stage(growth_stage_day)
            return {
                "predicted_stage": stage,
                "confidence": confidence,
                "model_status": "model_error_fallback",
                "error": str(exc),
                "explanation_source": "heuristic_after_model_error",
            }


stage_flow_model_loader = StageFlowModelLoader()
