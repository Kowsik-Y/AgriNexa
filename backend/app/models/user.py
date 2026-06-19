import uuid
from typing import Optional

import bcrypt

from app.db.session import db
from app.schemas.user import UserRegister


async def get_user_by_id(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"user_id": user_id})


async def get_user_by_identifier(email: Optional[str], phone: Optional[str]) -> Optional[dict]:
    filters = []
    if email:
        filters.append({"email": email})
    if phone:
        filters.append({"phone": phone})
    if not filters:
        return None
    return await db.users.find_one({"$or": filters})


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


async def create_user(user: UserRegister) -> str:
    user_id = f"user_{uuid.uuid4().hex[:10]}"
    doc = {
        "user_id": user_id,
        "email": user.email,
        "phone": user.phone,
        "name": user.name,
        "hashed_password": hash_password(user.password),
        "onboarded": False,
        "appLang": "English",
        "village": "",
        "district": "",
        "state": "",
        "crops": "",
        "interests": [],
        "flow_stage": user.flow_stage,
        "nitrogen": user.nitrogen,
        "phosphorus": user.phosphorus,
        "potassium": user.potassium,
        "ph": user.ph,
    }
    await db.users.insert_one(doc)
    return user_id


async def update_user(user_id: str, updates: dict) -> bool:
    result = await db.users.update_one({"user_id": user_id}, {"$set": updates})
    return result.modified_count > 0
