from typing import Optional
from database import db
from schemas.user import UserRegister
import bcrypt

def get_password_hash(password: str):
    pw_bytes = password.encode('utf-8')
    # Use max length for bcrypt safely
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[0:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

async def get_user_by_id(user_id: str):
    return await db.users.find_one({"user_id": user_id})

async def get_user_by_identifier(email: Optional[str] = None, phone: Optional[str] = None):
    query = []
    if email:
        query.append({"email": email})
    if phone:
        query.append({"phone": phone})
    if not query:
        return None
    return await db.users.find_one({"$or": query})

async def create_user(user: UserRegister):
    identifier = user.email or user.phone
    user_id = f"user_{hash(identifier) % 1000000}"
    hashed_pwd = get_password_hash(user.password)
    
    new_user = {
        "user_id": user_id,
        "email": user.email,
        "phone": user.phone,
        "name": user.name,
        "hashed_password": hashed_pwd,
        "onboarded": False,
        "appLang": "English",
        "village": "",
        "district": "",
        "state": "",
        "crops": "",
        "interests": []
    }
    await db.users.insert_one(new_user)
    return user_id

async def update_user(user_id: str, data: dict):
    await db.users.update_one({"user_id": user_id}, {"$set": data})
