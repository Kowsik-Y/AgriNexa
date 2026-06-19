import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi

from app.core.config import settings

client = AsyncIOMotorClient(
    settings.mongodb_uri,
    server_api=ServerApi("1"),
    tlsCAFile=certifi.where(),
    connectTimeoutMS=30000,
    serverSelectionTimeoutMS=30000,
)

db = client.get_database(settings.mongodb_db_name)


async def get_db():
    return db


async def close_db() -> None:
    client.close()
