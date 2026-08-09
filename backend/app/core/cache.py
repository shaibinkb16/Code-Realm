import json
from typing import Any, Optional
from app.core.redis import redis_manager
from app.core.logging import logger

class MemoryCacheManager:
    """
    L1 (In-Memory) + L2 (Redis) Cache for the Project Memory System.
    Provides fast retrieval for unchanged project architectures.
    """
    def __init__(self):
        self._l1_cache: dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        # Check L1 (In-Memory)
        if key in self._l1_cache:
            return self._l1_cache[key]
        
        # Check L2 (Redis)
        redis_val = await redis_manager.get(key)
        if redis_val:
            try:
                parsed = json.loads(redis_val)
                self._l1_cache[key] = parsed # Populate L1
                return parsed
            except json.JSONDecodeError:
                return redis_val
        return None

    async def set(self, key: str, value: Any, ttl: int = 3600):
        # Set L1
        self._l1_cache[key] = value
        # Set L2
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await redis_manager.set(key, str(value), ttl)

    async def invalidate(self, prefix: str):
        """Invalidate all keys matching the prefix."""
        # Clear L1 matching keys
        keys_to_delete = [k for k in self._l1_cache.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._l1_cache[k]
        
        # Clear L2 matching keys
        if redis_manager.redis_client:
            cursor = 0
            while True:
                cursor, keys = await redis_manager.redis_client.scan(cursor, match=f"{prefix}*", count=100)
                if keys:
                    await redis_manager.redis_client.delete(*keys)
                if cursor == 0:
                    break
        logger.info(f"Invalidated cache for prefix: {prefix}")

memory_cache = MemoryCacheManager()
