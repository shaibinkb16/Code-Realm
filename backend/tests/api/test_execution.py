import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_execute_code_unauthorized(client: AsyncClient):
    response = await client.post(
        "/api/v1/execute/run",
        json={
            "language": "python",
            "code": "print('hello')",
            "challenge_id": "test_chall"
        }
    )
    assert response.status_code == 200
