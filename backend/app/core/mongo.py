import asyncio
from typing import Optional, Any, Dict
from app.core.config import settings
from app.core.logging import logger

_mongo_client: Optional[Any] = None
_mongo_db: Optional[Any] = None


def get_mongo_db():
    """
    Returns Motor AsyncIOMotorDatabase instance for fallback operations.
    Handles connection errors gracefully.
    """
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db

    url = settings.MONGODB_URL
    if not url or "<db_password>" in url:
        # User hasn't set actual password in env yet
        logger.warning("[MongoDB Fallback] MONGODB_URL contains placeholder '<db_password>'. Fallback Mongo client standing by.")
        return None

    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        _mongo_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=1000)
        _mongo_db = _mongo_client.get_default_database(default="coderealm_fallback")
        logger.info("[MongoDB Fallback] Motor AsyncIOMotorClient initialized successfully.")
        return _mongo_db
    except Exception as e:
        logger.warning(f"[MongoDB Fallback] Failed to connect to MongoDB: {e}")
        return None


async def verify_mongo_connection() -> bool:
    """Verifies that MongoDB cluster is reachable with 1s timeout."""
    db = get_mongo_db()
    if db is None:
        return False
    try:
        await asyncio.wait_for(db.command("ping"), timeout=1.0)
        return True
    except Exception as e:
        logger.debug(f"[MongoDB Fallback] MongoDB standby ping: {e}")
        return False
