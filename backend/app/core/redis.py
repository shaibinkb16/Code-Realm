import redis.asyncio as redis
from app.core.config import settings
from app.core.logging import logger

class RedisManager:
    def __init__(self):
        self.redis_client: redis.Redis | None = None

    async def connect(self):
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URI,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self.redis_client = None

    async def close(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Closed Redis connection.")

    async def get(self, key: str) -> str | None:
        if not self.redis_client:
            return None
        return await self.redis_client.get(key)

    async def set(self, key: str, value: str, ttl: int = 3600):
        if not self.redis_client:
            return
        await self.redis_client.set(key, value, ex=ttl)

    async def check_rate_limit(self, identifier: str, limit: int = 100, window_sec: int = 60) -> bool:
        """Returns True if within rate limit, False if exceeded."""
        if not self.redis_client:
            return True # Fallback if redis is down
        key = f"rate_limit:{identifier}"
        current = await self.redis_client.incr(key)
        if current == 1:
            await self.redis_client.expire(key, window_sec)
        return current <= limit

redis_manager = RedisManager()
