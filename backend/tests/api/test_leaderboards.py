import pytest
from httpx import AsyncClient
from app.models.user import User, UserProfile
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.main import app

@pytest.mark.asyncio
async def test_global_leaderboard(client: AsyncClient):
    # Retrieve the database session to inject test data
    async for session in app.dependency_overrides[get_db]():
        import uuid
        u1_id = uuid.uuid4()
        u2_id = uuid.uuid4()
        
        # Create users
        user1 = User(id=u1_id, username="pro_coder", email="pro@example.com", hashed_password="pw", is_active=True)
        user2 = User(id=u2_id, username="noob", email="noob@example.com", hashed_password="pw", is_active=True)
        
        session.add_all([user1, user2])
        await session.commit()
        
        # Create profiles with varying exp
        prof1 = UserProfile(user_id=u1_id, level=10, xp=5000, rank="Diamond", rank_rating=2000)
        prof2 = UserProfile(user_id=u2_id, level=2, xp=150, rank="Bronze", rank_rating=500)
        
        session.add_all([prof1, prof2])
        await session.commit()
        break # only need one session

    # Fetch leaderboard
    response = await client.get("/api/v1/leaderboards/global")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) >= 2
    # Ensure sorted by rank_rating descending
    assert data[0]["rating"] >= data[1]["rating"]
    assert data[0]["username"] == "pro_coder"
