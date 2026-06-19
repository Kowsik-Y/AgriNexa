from fastapi import APIRouter, HTTPException

from app.core.security import create_access_token
from app.db.session import db
from app.models.user import create_user, get_user_by_id, get_user_by_identifier, verify_password
from app.schemas.user import GoogleLogin, UserLogin, UserRegister

router = APIRouter()


@router.post("/register")
async def register(user: UserRegister):
    existing = await get_user_by_identifier(user.email, user.phone)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = await create_user(user)
    token = create_access_token(data={"sub": user_id})
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


@router.post("/login")
async def login(user: UserLogin):
    db_user = await get_user_by_identifier(user.email, user.phone)
    if not db_user or not verify_password(user.password, db_user.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect credentials")

    token = create_access_token(data={"sub": db_user["user_id"]})
    return {"access_token": token, "token_type": "bearer", "user_id": db_user["user_id"]}


@router.post("/google")
async def google_auth(login: GoogleLogin):
    token = create_access_token(data={"sub": login.user_id})

    existing = await get_user_by_id(login.user_id)
    if not existing:
        await db.users.insert_one(
            {
                "user_id": login.user_id,
                "email": login.email,
                "name": login.name,
                "onboarded": False,
                "appLang": "English",
                "village": "",
                "district": "",
                "state": "",
                "crops": "",
                "interests": [],
            }
        )

    return {"access_token": token, "token_type": "bearer", "user_id": login.user_id}
