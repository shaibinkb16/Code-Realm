import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, mock_redis, username: str, email: str) -> str:
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
async def test_submit_is_not_double_paid_on_retry(client: AsyncClient, mock_redis):
    """
    RewardService must refuse to grant XP/coins twice for the same
    (user, challenge) pair, even if the client retries or double-clicks submit.
    """
    token = await _register_and_login(client, mock_redis, "rewarduser", "reward@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "language": "python",
        "code": "print('hello')",
        "challenge_id": "reward-test-challenge",
        "test_cases": [],
    }

    first = await client.post("/api/v1/execute/submit", json=payload, headers=headers)
    assert first.status_code == 200

    profile_after_first = (await client.get("/api/v1/user/profile", headers=headers)).json()
    xp_after_first = profile_after_first["profile"]["xp"]
    coins_after_first = profile_after_first["profile"]["coins"]
    assert xp_after_first > 0

    # Retry the identical submission — simulates a double-click or client retry.
    second = await client.post("/api/v1/execute/submit", json=payload, headers=headers)
    assert second.status_code == 200

    profile_after_second = (await client.get("/api/v1/user/profile", headers=headers)).json()
    assert profile_after_second["profile"]["xp"] == xp_after_first
    assert profile_after_second["profile"]["coins"] == coins_after_first


@pytest.mark.asyncio
async def test_progress_endpoint_ignores_client_supplied_rewards(client: AsyncClient, mock_redis):
    """
    /user/progress must derive rewards from the node's server-side difficulty,
    not from whatever the client puts in the request body — there is no
    xp/coins/stars field on the request schema for exactly this reason.
    """
    token = await _register_and_login(client, mock_redis, "progressuser", "progress@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # A client attempting the old exploit (raw xp/coins fields) should simply
    # have those fields ignored by Pydantic — they're not part of the schema.
    response = await client.post(
        "/api/v1/user/progress",
        json={"node_id": "node-1", "xp": 999999, "coins": 999999, "stars": 999},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["xp"] < 999999
    assert data["coins"] < 999999
