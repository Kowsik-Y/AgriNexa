from collections.abc import AsyncGenerator

from app.db.session import get_db


async def get_database() -> AsyncGenerator:
    db = await get_db()
    try:
        yield db
    finally:
        pass
