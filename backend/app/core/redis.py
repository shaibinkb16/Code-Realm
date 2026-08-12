import redis.asyncio as redis
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.logging import logger

class RedisManager:
    def __init__(self):
        self.redis_client: redis.Redis | None = None
        self.arq_pool = None

    async def connect(self):
        try:
            client = redis.from_url(
                settings.REDIS_URI,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2
            )
            await client.ping()
            self.redis_client = client
            
            # Init ARQ connection pool
            self.arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URI))
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"[Redis] Offline or connection failed: {e}. Fallback in-memory mode active.")
            self.redis_client = None
            self.arq_pool = None

    async def close(self):
        if self.redis_client:
            try:
                await self.redis_client.close()
            except Exception:
                pass
            self.redis_client = None
            
        if self.arq_pool:
            try:
                await self.arq_pool.close()
            except Exception:
                pass
            self.arq_pool = None
            
        logger.info("Closed Redis connection.")

    async def get(self, key: str) -> str | None:
        if not self.redis_client:
            return None
        try:
            return await self.redis_client.get(key)
        except Exception:
            return None

    async def set(self, key: str, value: str, ttl: int = 3600):
        if not self.redis_client:
            return
        try:
            await self.redis_client.set(key, value, ex=ttl)
        except Exception:
            pass

    async def check_rate_limit(self, identifier: str, limit: int = 100, window_sec: int = 60) -> bool:
        """Returns True if within rate limit, False if exceeded."""
        if not self.redis_client:
            return True # Fallback if redis is down
        try:
            key = f"rate_limit:{identifier}"
            current = await self.redis_client.incr(key)
            if current == 1:
                await self.redis_client.expire(key, window_sec)
            return current <= limit
        except Exception:
            return True

redis_manager = RedisManager()
