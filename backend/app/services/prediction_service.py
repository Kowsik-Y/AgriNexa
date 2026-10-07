class PredictionService:
    """Prediction service powered by backend ML service functions."""

    async def predict(self, payload: dict) -> dict:
        return {"prediction": "scaffold", "input": payload}

    async def predict_disease(self, image_bytes: bytes) -> dict:
        from app.services.ml_models import detect_disease_from_image

        return detect_disease_from_image(image_bytes)

    async def predict_crop(self, image_bytes: bytes) -> dict:
        from app.services.ml_models import predict_crop_type_from_image

        return predict_crop_type_from_image(image_bytes)

    async def score_health(self, image_bytes: bytes, crop_name: str = "Generic") -> dict:
        from app.services.ml_models import score_crop_health

        return score_crop_health(image_bytes, crop_name)

