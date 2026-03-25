    
from fastapi import FastAPI, UploadFile, File, Query, Body, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
import jwt
import datetime
import random
from ai.disease_model import disease_model
from ai.voice_ai import voice_ai
from ai.agri_flow.pipeline import run_pipeline
from ai.agri_flow.pest_detection import detect_pest_from_image
from ai.agri_flow.crop_monitoring import analyze_weekly_image
from pydantic import Field
from database import client, db

import bcrypt
from contextlib import asynccontextmanager

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "agrinexa-secret-2026-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: Check MongoDB connection
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB Atlas!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
    yield
    # Shutdown logic: Close MongoDB connection
    client.close()
    print("MongoDB connection closed.")

app = FastAPI(
    title="AgriNexa API", 
    description="AI Smart Farming Assistant Backend",
    lifespan=lifespan
)

# Auth Utils
def verify_password(plain_password: str, hashed_password: str):
    try:
        pw_bytes = plain_password.encode('utf-8')
        # Standard bcrypt verify
        return bcrypt.checkpw(pw_bytes, hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification failed: {e}")
        return False

def get_password_hash(password: str):
    # Bcrypt has a 72-byte limit
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[0:72]
    
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

from schemas.user import UserProfile, UserRegister, UserLogin, GoogleLogin
from schemas.auth import Token, TokenData
from models.user import get_user_by_id, get_user_by_identifier, create_user, update_user, verify_password, get_password_hash

# Enable CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────
# AgriFlow - Smart Farming Endpoints
# ──────────────────────────────────────────────────────

class SoilInput(BaseModel):
    """Input parameters for the farming pipeline."""
    nitrogen: float = Field(..., ge=0, le=300, description="Nitrogen level (kg/ha)")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus level (kg/ha)")
    potassium: float = Field(..., ge=0, le=300, description="Potassium level (kg/ha)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH value")
    temperature: float = Field(..., ge=-10, le=55, description="Temperature in °C")
    humidity: float = Field(..., ge=0, le=100, description="Humidity in %")

@app.post("/agri-flow/predict")
async def get_farming_plan(soil_input: SoilInput):
    """Main endpoint: Takes 6 soil/weather inputs → returns complete farming plan (all 8 stages)."""
    result = run_pipeline(
        nitrogen=soil_input.nitrogen,
        phosphorus=soil_input.phosphorus,
        potassium=soil_input.potassium,
        ph=soil_input.ph,
        temperature=soil_input.temperature,
        humidity=soil_input.humidity,
    )
    return result

@app.post("/agri-flow/pest-detection")
async def pest_detection(file: UploadFile = File(...)):
    """Upload a crop image for AI-based pest/disease detection."""
    image_bytes = await file.read()
    result = detect_pest_from_image(image_bytes)
    return result

@app.post("/agri-flow/crop-monitoring/weekly")
async def weekly_crop_monitoring(crop: str = "Rice", week_number: int = 1, file: UploadFile = File(...)):
    """Upload weekly crop image for health assessment."""
    image_bytes = await file.read()
    result = analyze_weekly_image(image_bytes, crop, week_number)
    return result


@app.post("/auth/register")
async def register(user: UserRegister):
    existing = await get_user_by_identifier(user.email, user.phone)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = await create_user(user)
    token = create_access_token(data={"sub": user_id})
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}

@app.post("/auth/login")
async def login(user: UserLogin):
    db_user = await get_user_by_identifier(user.email, user.phone)
    if not db_user or not verify_password(user.password, db_user.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    
    token = create_access_token(data={"sub": db_user["user_id"]})
    return {"access_token": token, "token_type": "bearer", "user_id": db_user["user_id"]}

@app.post("/auth/google")
async def google_auth(login: GoogleLogin):
    token = create_access_token(data={"sub": login.user_id})
    
    existing = await get_user_by_id(login.user_id)
    if not existing:
        await db.users.insert_one({
            "user_id": login.user_id,
            "email": login.email,
            "name": login.name,
            "onboarded": False,
            "appLang": "English",
            "village": "",
            "district": "",
            "state": "",
            "crops": "",
            "interests": []
        })
    
    return {"access_token": token, "token_type": "bearer", "user_id": login.user_id}

@app.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: str = Depends(get_current_user)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")
    
    profile = await get_user_by_id(user_id)
    if profile:
        profile.pop("_id", None)
        return profile
    raise HTTPException(status_code=404, detail="Profile not found")

@app.post("/profile")
async def save_profile(profile: UserProfile, current_user: str = Depends(get_current_user)):
    if profile.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to modify this profile")
    
    try:
        existing = await get_user_by_id(profile.user_id)
        if existing:
            await update_user(profile.user_id, profile.dict(exclude_unset=True))
            return {"status": "updated"}
        else:
            await db.users.insert_one(profile.dict())
            return {"status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AgriNexa API", "status": "online"}

@app.post("/predict")
async def predict_disease(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    image_bytes = await file.read()
    result = disease_model.predict(image_bytes)
    return result

@app.get("/pest-alert")
async def get_pest_alert(location: str = Query(...), current_user: str = Depends(get_current_user)):
    return {
        "location": location,
        "alert_level": "Medium",
        "pest_type": "Fall Armyworm",
        "tamil_pest_type": "படைப்புழு",
        "risk": "Moderate due to recent humidity levels."
    }

@app.get("/weather")
async def get_weather(location: str = Query(...), current_user: str = Depends(get_current_user)):
    temp = random.randint(24, 32)
    humidity = random.randint(55, 85)
    conditions = ["Cloudy", "Sunny", "Light Rain", "Clear Sky"]
    cond = random.choice(conditions)
    
    advice_map = {
        "Cloudy": "Good time for fertilization.",
        "Sunny": "Ensure adequate irrigation today.",
        "Light Rain": "Wait for rain to stop before spraying.",
        "Clear Sky": "Ideal for harvesting."
    }
    
    return {
        "location": location,
        "temp": temp,
        "condition": cond,
        "humidity": humidity,
        "advice": advice_map.get(cond, "Normal farming conditions."),
        "tamil_condition": "மேகமூட்டம்" if cond == "Cloudy" else "வெயில்" if cond == "Sunny" else "மழை" if cond == "Light Rain" else "தெளிவான வானம்"
    }

@app.get("/prices")
async def get_market_prices(crop: str = Query("rice"), current_user: str = Depends(get_current_user)):
    base_price = 45 if crop.lower() == 'rice' else 60
    variance = random.randint(-5, 5)
    
    return {
        "crop": crop,
        "tamil_crop": "அரிசி" if crop.lower() == "rice" else "தக்காளி" if crop.lower() == "tomato" else crop,
        "price_per_kg": base_price + variance,
        "unit": "INR",
        "trend": "Upward" if variance > 0 else "Downward",
        "market": "Chennai Central",
        "tamil_market": "சென்னை சென்ட்ரல்"
    }

@app.get("/advice")
async def get_advice(current_user: str = Depends(get_current_user)):
    profile = await db.users.find_one({"user_id": current_user})
    crops = profile.get("crops", "Rice") if profile else "Rice"
    
    return [
        { 
            "id": 1, 
            "title": "Irrigation", 
            "text": f"Water your {crops} today before 10 AM.", 
            "tamil": f"இன்று காலை 10 மணிக்குள் {crops} பயிர்களுக்கு நீர் பாய்ச்சவும்." 
        },
        { 
            "id": 2, 
            "title": "Fertilizer", 
            "text": "Apply Nitrogen-based fertilizer this week.", 
            "tamil": "இந்த வாரம் நைட்ரஜன் சார்ந்த உரங்களைப் பயன்படுத்துங்கள்." 
        },
        { 
            "id": 3, 
            "title": "Crop Health", 
            "text": "Check for early blight signs in your fields.", 
            "tamil": "உங்கள் வயல்களில் ஆரம்பகால கருகல் அறிகுறிகளை சரிபார்க்கவும்." 
        },
    ]

@app.post("/voice-query")
async def voice_query_endpoint(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    temp_path = f"tmp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    result = voice_ai.transcribe_and_respond(temp_path)
    
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
