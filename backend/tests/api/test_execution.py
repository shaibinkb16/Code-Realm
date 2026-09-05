import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


async def _register_and_login(client: AsyncClient, mock_redis, username: str, email: str) -> str:
    """Shared helper: register, verify via the OTP stored in mock_redis, log in, return a bearer token."""
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": "StrongPassword123!"},
    )
    otp_code = await mock_redis.get(f"otp:{email}")
    await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": otp_code})
    response = await client.post(
        "/api/v1/auth/login", json={"username": username, "password": "StrongPassword123!"}
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_execute_code_requires_auth(client: AsyncClient):
    """
    /execute/run runs arbitrary user code — it must reject anonymous requests.
    This replaces a prior version of this test that asserted 200 for an
    unauthenticated call, which was pinning the vulnerability rather than
    testing correct behavior.
    """
    response = await client.post(
        "/api/v1/execute/run",
        json={"language": "python", "code": "print('hello')", "challenge_id": "test_chall"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_execute_code_authorized(client: AsyncClient, mock_redis):
    token = await _register_and_login(client, mock_redis, "execuser", "exec@example.com")

    response = await client.post(
        "/api/v1/execute/run",
        json={"language": "python", "code": "print('hello')", "challenge_id": "test_chall"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["all_passed"] is True
