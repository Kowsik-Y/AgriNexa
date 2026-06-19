from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/")
async def root() -> dict:
    return {"message": "Welcome to AgriNexa API", "status": "online"}
