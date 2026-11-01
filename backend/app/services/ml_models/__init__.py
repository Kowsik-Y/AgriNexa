# Lazy module attributes to avoid loading PyTorch / scikit-learn models on startup
# (Prevents Out-Of-Memory crashes on 512MB RAM cloud platforms like Render)

from typing import Any

__all__ = [
    "get_device",
    "load_disease_model",
    "load_health_scoring_model",
    "load_crop_classification_model",
    "preprocess_image",
    "detect_disease_from_image",
    "score_crop_health",
    "predict_crop_type_from_image",
    "preload_models",
    "stage_flow_model_loader",
    "growth_stage_model_loader",
]

def __getattr__(name: str) -> Any:
    if name in (
        "detect_disease_from_image",
        "get_device",
        "load_crop_classification_model",
        "load_disease_model",
        "load_health_scoring_model",
        "predict_crop_type_from_image",
        "preprocess_image",
        "preload_models",
        "score_crop_health",
    ):
        from . import service
        return getattr(service, name)
    elif name == "stage_flow_model_loader":
        from .stage_flow_model_loader import stage_flow_model_loader
        return stage_flow_model_loader
    elif name == "growth_stage_model_loader":
        from .growth_stage_loader import growth_stage_model_loader
        return growth_stage_model_loader
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
