import os
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Explicit resolution
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = "agrinexa"

client = MongoClient(MONGODB_URI, server_api=ServerApi('1'))

db = client.get_database(DATABASE_NAME)

async def get_db():
    return db

async def close_db():
    client.close()
