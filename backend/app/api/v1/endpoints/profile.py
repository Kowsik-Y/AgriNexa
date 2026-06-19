from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.db.session import db
from app.models.user import get_user_by_id, update_user
from app.schemas.user import UserProfile

router = APIRouter(tags=["Profile"])


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: str = Depends(get_current_user)) -> dict:
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    profile = await get_user_by_id(user_id)
    if profile:
        profile.pop("_id", None)
        return profile
    raise HTTPException(status_code=404, detail="Profile not found")


@router.post("/profile")
async def save_profile(profile: UserProfile, current_user: str = Depends(get_current_user)) -> dict:
    if profile.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to modify this profile")

    try:
        existing = await get_user_by_id(profile.user_id)
        if existing:
            await update_user(profile.user_id, profile.dict(exclude_unset=True))
            return {"status": "updated"}

        await db.users.insert_one(profile.dict())
        return {"status": "created"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
