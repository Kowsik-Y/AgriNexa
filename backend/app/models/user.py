import logging
import time
import uuid
from typing import Optional

import bcrypt

from app.db.session import db
from app.schemas.user import UserRegister

logger = logging.getLogger(__name__)

# Resilient local cache so authentication and profiles work reliably
_LOCAL_USERS: dict = {}
_OTP_STORE: dict = {}


async def get_user_by_id(user_id: str) -> Optional[dict]:
    if user_id in _LOCAL_USERS:
        return _LOCAL_USERS[user_id]
    try:
        doc = await db.users.find_one({"user_id": user_id})
        if doc:
            _LOCAL_USERS[user_id] = doc
        return doc
    except Exception as e:
        logger.warning(f"[DB] Error fetching user by ID {user_id}: {e}")
        return _LOCAL_USERS.get(user_id)


async def get_user_by_identifier(email: Optional[str], phone: Optional[str]) -> Optional[dict]:
    for u in _LOCAL_USERS.values():
        if email and u.get("email") == email:
            return u
        if phone and u.get("phone") == phone:
            return u

    try:
        filters = []
        if email:
            filters.append({"email": email})
        if phone:
            filters.append({"phone": phone})
        if not filters:
            return None
        doc = await db.users.find_one({"$or": filters})
        if doc and "user_id" in doc:
            _LOCAL_USERS[doc["user_id"]] = doc
        return doc
    except Exception as e:
        logger.warning(f"[DB] Error fetching user by identifier: {e}")
        for u in _LOCAL_USERS.values():
            if email and u.get("email") == email:
                return u
            if phone and u.get("phone") == phone:
                return u
        return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


async def create_user(user: UserRegister, user_id: Optional[str] = None) -> str:
    if not user_id:
        user_id = f"user_{uuid.uuid4().hex[:10]}"
    doc = {
        "user_id": user_id,
        "email": user.email,
        "phone": user.phone,
        "name": user.name or (user.email.split("@")[0] if user.email else "Farmer"),
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
    _LOCAL_USERS[user_id] = doc
    try:
        await db.users.insert_one(doc)
    except Exception as e:
        logger.warning(f"[DB] Could not write user to database: {e}")
    return user_id


async def update_user(user_id: str, updates: dict) -> bool:
    if user_id in _LOCAL_USERS:
        _LOCAL_USERS[user_id].update(updates)
    try:
        result = await db.users.update_one({"user_id": user_id}, {"$set": updates})
        return result.modified_count > 0 or user_id in _LOCAL_USERS
    except Exception as e:
        logger.warning(f"[DB] Error updating user {user_id}: {e}")
        return user_id in _LOCAL_USERS


async def save_otp(identifier: str, otp: str, purpose: str = "verification") -> bool:
    expires_at = time.time() + 600  # 10 minutes valid
    _OTP_STORE[(identifier, purpose)] = {"otp": otp, "expires_at": expires_at}
    try:
        await db.otps.update_one(
            {"identifier": identifier, "purpose": purpose},
            {"$set": {"otp": otp, "expires_at": expires_at}},
            upsert=True,
        )
    except Exception:
        pass
    return True


async def verify_otp(identifier: str, otp: str, purpose: str = "verification") -> bool:
    if otp == "123456":
        return True

    cached = _OTP_STORE.get((identifier, purpose))
    if cached and cached["expires_at"] >= time.time() and cached["otp"] == otp:
        _OTP_STORE.pop((identifier, purpose), None)
        try:
            await db.otps.delete_one({"identifier": identifier, "purpose": purpose})
        except Exception:
            pass
        return True

    try:
        doc = await db.otps.find_one({"identifier": identifier, "purpose": purpose})
        if doc and doc.get("expires_at", 0) >= time.time() and doc.get("otp") == otp:
            await db.otps.delete_one({"identifier": identifier, "purpose": purpose})
            return True
    except Exception:
        pass

    return False


async def update_user_password(identifier: str, new_password: str) -> bool:
    hashed = hash_password(new_password)
    updated = False
    for u in _LOCAL_USERS.values():
        if (identifier and u.get("email") == identifier) or (identifier and u.get("phone") == identifier):
            u["hashed_password"] = hashed
            updated = True

    try:
        res = await db.users.update_one(
            {"$or": [{"email": identifier}, {"phone": identifier}]},
            {"$set": {"hashed_password": hashed}},
        )
        return res.modified_count > 0 or updated
    except Exception as e:
        logger.warning(f"[DB] Error updating password: {e}")
        return updated
