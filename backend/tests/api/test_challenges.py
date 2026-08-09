import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_generate_challenges_validation(client: AsyncClient):
    # Missing required query param 'node_id'
    response = await client.get("/api/v1/challenges/generate")
    assert response.status_code == 422
    
@pytest.mark.asyncio
async def test_get_challenge_feedback_validation(client: AsyncClient):
    response = await client.post("/api/v1/challenges/feedback", json={})
    assert response.status_code == 422
