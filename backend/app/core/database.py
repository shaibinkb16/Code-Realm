from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.exc import OperationalError, DBAPIError
from app.core.config import settings
from app.core.logging import logger
from app.core.mongo import get_mongo_db

# Primary Database Engine (Supabase PostgreSQL or configured DATABASE_URL)
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Secondary Local Fallback Engine (for quota limits or connection disruptions)
fallback_engine = create_async_engine(
    "sqlite+aiosqlite:///./coderealm_dev.db",
    echo=False,
    future=True
)

AsyncFallbackSessionLocal = async_sessionmaker(
    bind=fallback_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an AsyncSession connected to Supabase PostgreSQL.
    If Supabase connection fails or quota is exhausted, seamlessly fails over to fallback session.
    """
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    except (OperationalError, DBAPIError, ConnectionError) as db_err:
        logger.warning(f"[DB Failover] Primary Supabase PostgreSQL connection error: {db_err}. Switching to Fallback Engine.")
        mongo_db = get_mongo_db()
        if mongo_db is not None:
            logger.info("[DB Failover] MongoDB fallback driver active.")

        async with AsyncFallbackSessionLocal() as fallback_session:
            try:
                yield fallback_session
                await fallback_session.commit()
            except Exception:
                await fallback_session.rollback()
                raise
            finally:
                await fallback_session.close()

