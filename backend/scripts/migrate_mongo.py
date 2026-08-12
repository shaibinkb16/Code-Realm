import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.mongo import get_mongo_db, verify_mongo_connection
from app.core.logging import logger

async def migrate_and_seed_mongo():
    logger.info("Initializing MongoDB Atlas schema, collections, and indexes...")
    
    db = get_mongo_db()
    if db is None:
        logger.error("MongoDB is not configured or reachable.")
        return

    # Create Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.user_profiles.create_index("user_id", unique=True)
    await db.realms.create_index("id", unique=True)
    await db.challenges.create_index("id", unique=True)
    await db.test_cases.create_index("id", unique=True)
    
    logger.info("MongoDB indexes created successfully.")

    # Seed Starter Realm
    starter_realm = {
        "id": "starter-village",
        "name": "STARTER VILLAGE",
        "tagline": "Where every developer journey begins",
        "description": "Master variables, data types, and output streams.",
        "order_num": 1,
        "is_unlocked": True,
        "theme_color": "#38A169",
        "icon": "🌱"
    }
    await db.realms.update_one({"id": starter_realm["id"]}, {"$set": starter_realm}, upsert=True)

    # Seed Starter Challenge
    starter_challenge = {
        "id": "starter-1",
        "title": "The Spark of Logic",
        "type": "puzzle",
        "difficulty": "Easy",
        "description": "Create a variable `realm_name` set to 'Code Realm' and print 'Welcome to ' + realm_name.",
        "story_context": "The stone altar awakes when you speak the realm name.",
        "initial_code": '# Create a variable `realm_name` set to "Code Realm" and print "Welcome to " + realm_name\n# Write your code below:\n',
        "language": "python",
        "xp_reward": 100,
        "coin_reward": 50,
        "explanation": "Variables store strings in Python."
    }
    await db.challenges.update_one({"id": starter_challenge["id"]}, {"$set": starter_challenge}, upsert=True)

    # Seed Test Case
    starter_testcase = {
        "id": "t1",
        "challenge_id": "starter-1",
        "input_data": "",
        "expected_output": "Welcome to Code Realm",
        "description": "Outputs welcome greeting",
        "is_hidden": False
    }
    await db.test_cases.update_one({"id": starter_testcase["id"]}, {"$set": starter_testcase}, upsert=True)

    logger.info("MongoDB migration and initial data seeding complete!")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed_mongo())
