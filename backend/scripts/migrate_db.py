import asyncio
import sys
import os
import subprocess

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine, Base
import app.models
from app.core.logging import logger

async def run_migrations():
    logger.info("1. Running SQLAlchemy schema sync (create_all)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("SQLAlchemy schema sync complete.")

    logger.info("2. Running Alembic database migrations...")
    try:
        res = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], capture_output=True, text=True)
        if res.returncode != 0:
            logger.warning(f"Alembic upgrade warning: {res.stderr.strip()}")
            if "Can't locate revision" in res.stderr:
                logger.info("Stale revision tag detected in alembic_version table. Stamping database head...")
                stamp_res = subprocess.run([sys.executable, "-m", "alembic", "stamp", "head"], capture_output=True, text=True)
                if stamp_res.returncode == 0:
                    logger.info("Successfully stamped database to current Alembic head!")
                else:
                    logger.error(f"Alembic stamp failed: {stamp_res.stderr.strip()}")
        else:
            logger.info("Alembic database migrations completed successfully!")
    except Exception as e:
        logger.error(f"Migration script error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_migrations())
