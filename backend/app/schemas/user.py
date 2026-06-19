from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: Optional[str] = None


class UserRegister(UserBase):
    password: str
    flow_stage: Optional[str] = "Land Preparation"
    nitrogen: Optional[float] = 80.0
    phosphorus: Optional[float] = 40.0
    potassium: Optional[float] = 40.0
    ph: Optional[float] = 6.5


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
    flow_stage: Optional[str] = "Land Preparation"
    nitrogen: Optional[float] = 80.0
    phosphorus: Optional[float] = 40.0
    potassium: Optional[float] = 40.0
    ph: Optional[float] = 6.5


class GoogleLogin(BaseModel):
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None
