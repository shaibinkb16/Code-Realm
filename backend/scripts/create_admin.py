import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserProfile
from app.core.security import hash_password
from app.core.logging import logger

async def create_admin_account():
    logger.info("Initializing admin provisioning script...")
    async with AsyncSessionLocal() as session:
        admin_email = "admin@coderealm.dev"
        res = await session.execute(select(User).where(User.email == admin_email))
        user = res.scalars().first()

        if user:
            user.role = "super_admin"
            user.is_active = True
            logger.info(f"Promoted existing user {user.username} ({admin_email}) to super_admin.")
        else:
            new_admin = User(
                email=admin_email,
                username="admin",
                full_name="System Administrator",
                hashed_password=hash_password("AdminPass123!"),
                role="super_admin",
                is_active=True,
                auth_provider="local"
            )
            session.add(new_admin)
            await session.flush()

            profile = UserProfile(
                user_id=new_admin.id,
                title="Grand System Administrator 👑",
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
            )
            session.add(profile)
            logger.info(f"Created new super_admin account: admin@coderealm.dev / AdminPass123!")

        await session.commit()
        logger.info("Admin provisioning complete!")

if __name__ == "__main__":
    asyncio.run(create_admin_account())
