from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.db.session import db
from .recommendation_utils import (
    build_farmer_context_data,
    crop_recommendation_map,
    fallback_advice,
    format_recommendations,
)

try:
    from app.services.recommendations import FarmerContext, RecommendationService
except Exception:
    FarmerContext = None
    RecommendationService = None


router = APIRouter(tags=["Recommendations"])
recommendation_service = None


@router.get("/advice")
async def get_advice(current_user: str = Depends(get_current_user)):
    profile = await db.users.find_one({"user_id": current_user}) or {}
    crops = (profile.get("crops") or "Rice").split(",")[0].strip() or "Rice"

    global recommendation_service
    if RecommendationService and FarmerContext:
        try:
            if recommendation_service is None:
                recommendation_service = RecommendationService()

            context = FarmerContext(**build_farmer_context_data(profile, current_user, crops))

            rec_set = recommendation_service.generate_recommendations(context)
            response = format_recommendations(rec_set)
            if response:
                return response
        except Exception:
            pass

    return fallback_advice(crops)


@router.get("/recommendations/crop/{crop_name}")
async def get_crop_recommendations(crop_name: str, _: str = Depends(get_current_user)):
    recommendations = crop_recommendation_map()
    return recommendations.get(crop_name.lower(), [{"text": "Standard recommendations", "timing": "Check general advice"}])
