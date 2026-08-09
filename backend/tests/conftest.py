import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock, patch, MagicMock

from app.main import app
from app.core.database import get_db, Base
from app.models.user import User

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=None
)

TestingSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True, scope="function")
async def setup_database():
    """Create and drop all tables for each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as c:
        yield c

from app.core.redis import redis_manager

@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis so rate limiting and OTP work entirely in memory during tests."""
    mock_client = AsyncMock()
    
    # Simple in-memory KV store for testing
    store = {}
    
    async def mock_get(key):
        return store.get(key)
        
    async def mock_setex(key, ttl, value):
        store[key] = value
        
    async def mock_check_rate_limit(*args, **kwargs):
        return True
        
    mock_client.get = AsyncMock(side_effect=mock_get)
    mock_client.setex = AsyncMock(side_effect=mock_setex)
    
    mock_pipeline = MagicMock()
    mock_pipeline.execute = AsyncMock()
    mock_client.pipeline = MagicMock(return_value=mock_pipeline)
    
    with patch.object(redis_manager, "redis_client", mock_client):
        with patch.object(redis_manager, "check_rate_limit", AsyncMock(side_effect=mock_check_rate_limit)):
            yield redis_manager

@pytest.fixture(autouse=True)
def mock_email():
    """Prevent real emails from being sent."""
    with patch("app.api.v1.auth.send_otp_email") as mock_send:
        yield mock_send
