import asyncio
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.challenge import Realm, MapNode, Challenge, TestCase
from app.models.user import User, UserProfile, SkillRating
from app.models.submission import CodeSubmission
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
        session.add(realm1)

        # Seed Challenge 1
        ch1 = Challenge(
            id="starter-1",
            title="The Spark of Logic",
            type="puzzle",
            difficulty="Easy",
            description="Create a variable `realm_name` set to 'Code Realm' and print 'Welcome to ' + realm_name.",
            story_context="The stone altar awakes when you speak the realm name.",
            initial_code='realm_name = "Code Realm"\nprint("Welcome to " + realm_name)',
            language="python",
            xp_reward=100,
            coin_reward=50,
            explanation="Variables store strings in Python."
        )
        session.add(ch1)

        tc1 = TestCase(
            challenge_id="starter-1",
            input_data="",
            expected_output="Welcome to Code Realm",
            description="Outputs welcome greeting",
            is_hidden=False
        )
        session.add(tc1)

        # Seed Admin & Explorer User
        admin_user = User(
            email="explorer@coderealm.com",
            username="AetherCoder",
            hashed_password=hash_password("RealmPassword123!"),
            role="user"
        )
        session.add(admin_user)
        await session.flush()

        profile = UserProfile(user_id=admin_user.id)
        skills = SkillRating(user_id=admin_user.id)
        session.add(profile)
        session.add(skills)

        await session.commit()
        logger.info("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
