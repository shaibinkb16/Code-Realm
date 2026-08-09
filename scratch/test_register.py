import asyncio
import httpx

async def test_register():
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/api/v1/auth/register", json={
            "username": "testuser123",
            "email": "test@example.com",
            "password": "password123"
        })
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_register())
