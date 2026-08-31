import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, mock_email: MagicMock):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "StrongPassword123!"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "User registered. OTP sent to email."
    
    # Verify mock email was called
    mock_email.assert_called_once()
    
@pytest.mark.asyncio
async def test_register_validation(client: AsyncClient):
    # Short password
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "short"
        }
    )
    assert response.status_code == 422
    
    # Invalid email
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "testuser",
            "email": "invalid-email",
            "password": "StrongPassword123!"
        }
    )
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_login_unverified(client: AsyncClient, mock_email: MagicMock):
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={
            "username": "unverified",
            "email": "unverified@example.com",
            "password": "StrongPassword123!"
        }
    )
    
    # Try to login without OTP
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "unverified",
            "password": "StrongPassword123!"
        }
    )
    assert response.status_code == 403
    assert response.json()["detail"]["message"] == "Account not verified"

@pytest.mark.asyncio
async def test_otp_verify_and_login(client: AsyncClient, mock_redis):
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "username": "otpuser",
            "email": "otp@example.com",
            "password": "StrongPassword123!"
        }
    )
    
    # Extract the generated OTP from mock_redis
    otp_code = await mock_redis.get("otp:otp@example.com")
    
    # Verify OTP
    response = await client.post(
        "/api/v1/auth/verify-otp",
        json={
            "email": "otp@example.com",
            "otp": otp_code
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    
    # Login should now succeed
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "otpuser",
            "password": "StrongPassword123!"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
