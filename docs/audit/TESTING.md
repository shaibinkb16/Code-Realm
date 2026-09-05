# Testing Coverage

## Backend

Six test files under `backend/tests/`, run against an **in-memory SQLite** database (`sqlite+aiosqlite:///:memory:`) with a fully mocked Redis (`conftest.py`) — meaning Postgres-specific behavior (JSON columns, UUID handling, cascade deletes) is never actually exercised by this suite.

| File | What it covers |
|---|---|
| `test_health.py` | Trivial `/health` returns 200. |
| `test_auth.py` | The most substantial suite: registration validation, unverified-login-rejected, and a full register → OTP → verify → login happy path. |
| `test_execution.py` | **One test** — asserts the unauthenticated `/execute/run` returns HTTP 200. Does **not** check the actual execution result or correctness. |
| `test_challenges.py` | Two validation-only tests (422 on missing params). No actual generation logic is exercised. |
| `test_leaderboards.py` | Seeds two users/profiles directly into the test DB, checks `/leaderboards/global` ordering. |

### Not tested at all

- Gamification/Elo math (`game_service.py` — leveling, rating changes, streaks, achievements)
- Contests (join/submit/scoring/the mocked anti-cheat timer)
- Practice/adaptive recommendation and the diagnostic quiz
- Admin endpoints and the RBAC permission model
- The ARQ worker / Docker sandbox (`core/worker.py`) — not that it's reachable in production anyway
- Assignment/swap logic (`assignment_service.py`, `question_bank_service.py`'s Redis lock)
- OAuth flows (Google/GitHub)
- Passkeys/WebAuthn (registration, login, session listing)
- Any non-Python execution path — JS/TypeScript/C++/Java/C# code execution is entirely untested
- Career recommender and Memory/RAG endpoints

## Frontend

No test files were found anywhere in `src/`. There is no unit, component, or end-to-end test coverage for the React application.

## What this means in practice

The parts of the system with the highest actual risk profile — unauthenticated code execution, OAuth/passkey auth, admin RBAC, and the reward/economy math — are exactly the parts with zero test coverage. The one test that does touch execution (`test_execution.py`) checks only that the endpoint responds, not that grading, sandboxing, or language-specific execution behaves correctly.
