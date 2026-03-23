import os
import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi

# Explicit resolution
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = "agrinexa"

# Enhanced connection with SSL and timeout stability for macOS
client = AsyncIOMotorClient(
    MONGODB_URI, 
    server_api=ServerApi('1'),
    tlsCAFile=certifi.where(),
    connectTimeoutMS=30000,
    serverSelectionTimeoutMS=30000
)


db = client.get_database(DATABASE_NAME)

async def get_db():
    return db

async def close_db():
    client.close()

