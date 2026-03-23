from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: Optional[str] = None

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class UserProfile(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    appLang: str = "English"
    village: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    crops: Optional[str] = ""
    interests: Optional[list] = []
    onboarded: bool = False

class GoogleLogin(BaseModel):
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None
