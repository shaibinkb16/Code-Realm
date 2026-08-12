import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.challenge import Realm, MapNode, Challenge, TestCase
from app.models.user import User, UserProfile
from app.core.security import hash_password
from app.core.logging import logger

async def seed_database():
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Seed Starter Realm
        realm1 = Realm(
            id="starter-village",
            name="STARTER VILLAGE",
            tagline="Where every developer journey begins",
            description="Master variables, data types, and output streams.",
            order_num=1,
            is_unlocked=True,
            theme_color="#38A169",
            icon="🌱"
        )
        await session.merge(realm1)

        # Seed Challenge 1
        ch1 = Challenge(
            id="starter-1",
            title="The Spark of Logic",
            type="puzzle",
            difficulty="Easy",
            description="Create a variable `realm_name` set to 'Code Realm' and print 'Welcome to ' + realm_name.",
            story_context="The stone altar awakes when you speak the realm name.",
            initial_code='# Create a variable `realm_name` set to "Code Realm" and print "Welcome to " + realm_name\n# Write your code below:\n',
            language="python",
            xp_reward=100,
            coin_reward=50,
            explanation="Variables store strings in Python."
        )
        await session.merge(ch1)

        tc1 = TestCase(
            challenge_id="starter-1",
            input_data="",
            expected_output="Welcome to Code Realm",
            description="Outputs welcome greeting",
            is_hidden=False
        )
        await session.merge(tc1)

        await session.commit()
        logger.info("Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
