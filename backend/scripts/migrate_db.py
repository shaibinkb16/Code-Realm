import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import engine, Base
import app.models

async def create_tables():
    async with engine.begin() as conn:
        print("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Done.")

if __name__ == "__main__":
    asyncio.run(create_tables())
