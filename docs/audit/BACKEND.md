# Backend

FastAPI service under `backend/app/`, async throughout, entry point `main.py`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full tech-stack table and deployment topology, and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for the data model. This file covers auth/security, the execution engine, and the full API surface.

## Layering

```
API (FastAPI router, api/v1/*.py)
  ↓
Service layer (services/*.py — one file per feature area)
  ↓
Repository layer (repositories/challenge_repository.py — the only real repository; most services query SQLAlchemy directly)
  ↓
PostgreSQL
```

## Auth & security — implemented vs. stubbed

**Implemented:**
- JWT access (15 min) + refresh (7 day) tokens, HS256 (`core/security.py`).
- Argon2id password hashing via passlib.
- Local email/password registration gated by a Redis-stored 6-digit OTP, with SMTP email dispatch or console-log fallback when SMTP isn't configured.
- Google and GitHub OAuth2 authorization-code flows with Redis-backed CSRF state and account auto-provisioning/linking.
- RBAC: a proper many-to-many `AdminRole`/`UserAdminRole` permission model with per-endpoint `require_permission("scope:action")` dependency injection (`admin.py`) — genuinely built, not a role-string check scattered through the code.
- Custom Redis-backed fixed-window rate limiting on register/login/OTP endpoints (`api/deps.py`'s `RateLimiter` class; `slowapi` is in `requirements.txt` but never imported).
- `admin_action_logs` is actually written on every admin mutation, with before/after state.

**Stubbed or incomplete:**
- **WebAuthn/passkeys**: the endpoints and DB table exist, but "verification" only checks that a Redis-stored challenge nonce existed — it does not perform real cryptographic attestation/signature verification. The backend stores whatever `public_key`/`credential_id` the client posts. On the frontend, `services/passkey.ts` sends a **dummy placeholder public key** (`pubkey_${rawId.slice(0,16)}`) rather than the real attestation object, so the stub exists on both ends.
- **Session revocation**: `DELETE /auth/sessions/{id}` only flags a `UserSession` row — the JWT itself has no denylist, so a "revoked" session's bearer token remains valid until natural expiry.
- **MFA**: `users.mfa_enabled`/`mfa_secret_encrypted` columns exist; no TOTP/MFA flow is implemented anywhere.
- **Account lockout**: `users.failed_login_attempts`/`locked_until` columns exist; nothing increments or checks them.
- **`AuditLog` model**: exists, migrated, never written to. `AdminActionLog` (a stricter, admin-specific table) is the one that's actually populated.
- **A universal OTP bypass**: `POST /auth/verify-otp` accepts the Redis-stored code **or the hardcoded literal `"123456"`**, unconditionally, in every environment (`auth.py` ~lines 104-106).
- **A default admin account** (`admin@coderealm.dev` / `AdminPass123!`) is created by `scripts/create_admin.py`, hardcoded in source.
- **Real-looking secrets as source defaults**: `core/config.py` hardcodes a Supabase Postgres URL with an embedded password, a Supabase key, a MongoDB Atlas URI with an embedded password, and a static `SECRET_KEY` fallback — all as Pydantic field defaults, not just `.env.example` placeholders.

## Execution engine

Two entirely separate implementations exist; only one is ever reached by a live request.

### Live path — `services/execution_service.py`

- **Python**: code is written to a temp file and run via `sys.executable` in a `subprocess.run()` call (off the event loop via `asyncio.to_thread`), 4-second wall-clock timeout. The generated "runner" script does its own internal `exec(user_code, namespace)`, heuristically guessing which top-level function to call and how to unpack the raw test-case input via `ast.literal_eval`.
- **JS/TypeScript/C++/Java/C#**: all funneled through **Node.js**. Anything that isn't Python gets regex-"transpiled" (`_clean_ts_cpp_java_code`) — type annotations stripped, `#include`/`using namespace std` removed, `cout<<`/`System.out.println`/`Console.WriteLine` rewritten to `console.log(...)` — then executed as JavaScript with `subprocess.run(["node", temp_path], timeout=4.0)`. This is a best-effort string transform, not real compilation; anything beyond trivial programs in these languages will misbehave or fail silently.
- **"Security"**: a substring blocklist on strings like `import os`, `from os`, `require('fs')`. Trivially bypassable (`__import__('os')`, string concatenation, `importlib`, base64-decoded module names). There is no OS-level sandboxing, no network isolation, no memory limit — the only real constraint is the 4-second subprocess timeout, and code runs with the full privileges of the backend process.

### Built, never wired — `core/worker.py`

A properly designed Docker sandbox: per-language images (`python:3.11-alpine`, `node:20-alpine`, `openjdk:17-alpine`, `gcc:13`), `mem_limit="256m"`, `cpu_quota=50000` (0.5 CPU), `network_mode="none"`, base64-smuggled code/inputs, real compile steps for Java/C++, a 2-second in-container timeout. Registered as an ARQ job (`run_code_task`) under `WorkerSettings`, which pre-pulls all four images on worker startup.

A repo-wide search for `enqueue_job` / `arq_pool.enqueue` turns up **zero call sites outside `worker.py` itself**. No API route ever enqueues this job. It's also absent from `render.yaml` — production has no worker service, and Render's environment wouldn't expose a Docker socket regardless. It only has a plausible runtime in local `docker-compose.yml` (which mounts `/var/run/docker.sock` into the `worker` container) — and even there, nothing calls it.

**Bottom line**: the security architecture the codebase clearly intended to ship (queue-mediated, container-isolated execution — matching the master architecture doc's explicit call for exactly this) exists and is well-built. It is simply never connected to the traffic it's meant to protect.

## Full API endpoint reference

All routers mount under `/api/v1` unless noted (`main.py`). Auth column: `public` = no auth, `optional` = works with or without a token (richer response when authenticated), `JWT` = bearer token required, or a named permission for admin routes.

### `auth.py` (also re-mounted at `/api/auth`)
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /register` | Create account, inactive until OTP verified (20/hr limit) | public |
| `POST /login` | Password grant → access+refresh JWT (20/min limit) | public |
| `POST /verify-otp` | Activate account — accepts real OTP or hardcoded `"123456"` | public |
| `POST /resend-otp` | Re-send code (10/hr limit) | public |
| `POST /refresh` | Exchange refresh token for new access token | public |
| `GET /me` | Current user | JWT |
| `GET /google`, `GET /google/callback` | Google OAuth2 flow | public |
| `GET /github`, `GET /github/callback` | GitHub OAuth2 flow | public |
| `POST /passkeys/register/options`, `/verify` | WebAuthn registration (no real attestation check) | JWT |
| `POST /passkeys/login/options`, `/verify` | WebAuthn login (same gap) | public |
| `GET /passkeys`, `DELETE /passkeys/{id}` | Manage registered passkeys | JWT |
| `GET /sessions`, `DELETE /sessions/{id}` | List/revoke device sessions (soft revoke only) | JWT |
| `POST /onboarding` | Set profile title/avatar/starting Elo from skill level | JWT |

### `user.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /profile` | Fetch profile, recompute streak | JWT |
| `POST /progress` | Persist completed node + **client-submitted** xp/coins/stars | JWT |
| `POST /hq/upgrade`, `/pet/upgrade`, `/hq/claim-passive` | HQ tier / pet evolution / idle income | JWT |
| `POST /feedback`, `GET /feedback/my` | Submit/list user feedback | JWT |

### `nodes.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /{node_id}/challenge` | Get-or-assign a challenge (authed → real assignment; anon → preview via `QuestionBankService`) | optional |
| `PATCH /{node_id}/challenge/draft` | Autosave code draft | JWT |
| `POST /{node_id}/challenge/swap` | Cycle to next alternate question, 0 LLM calls | JWT |

### `execution.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /run` | Run code against caller-supplied test cases | **public — see [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md)** |
| `POST /submit` | Run + grade + Elo/XP/coins/streak update, logs mistakes, checks achievements; auto-creates a placeholder `Challenge` row if `challenge_id` is unknown | JWT |

### `challenges.py` (legacy/parallel path overlapping `nodes.py`)
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /generate` | Fetch-or-batch-generate 10 AI questions per node/language; fires a background pre-generation task once the pool is nearly exhausted | optional |
| `POST /swap` | Legacy duplicate of the `nodes.py` swap route, operating directly on `Challenge`/`UserNodeAssignment` | JWT |
| `POST /feedback` | AI code review after execution | public |

### `practice.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /recommend` | Adaptive (Elo-banded) or revision (mistake-log) problem recommendation | JWT |
| `POST /diagnostic` | 3-question placement quiz — grading is a placeholder (`answer.lower() == 'a'`) | JWT |
| `POST /interview` | Spin up a private 45-minute contest for mock-interview practice | JWT |

### `contests.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /` | List contests | public |
| `POST /{id}/join` | Join (idempotent re-join) | JWT |
| `POST /{id}/submit` | Submit — flat +100 per solve, anti-cheat timer is a hardcoded constant (`120`), always runs via `execute_python_code` regardless of declared language | JWT |

### `leaderboards.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /global` | Top-50 by Elo/language/topic mastery, Redis-cached 5 min, hardcoded exclusion list for test-account username/email patterns | public |

### `ai.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /ai/mentor/chat` | General chat (AI Companion widget, daily briefing) | optional |
| `POST /ai/mentor/guidance` | Contextual in-challenge help; pulls last 3 `MistakeLog` rows if authenticated | optional |

### `career.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /recommend`, `/sprint-tickets`, `/interview/question`, `/interview/evaluate` | LLM pass-throughs, no persistence | public |

### `memory.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /ingest` | Background-ingest a local filesystem path (defaults to a developer machine path) | public |
| `POST /index`, `GET /context`, `GET /search`, `GET /file`, `POST /invalidate` | Query/manage the indexed project | public |

### `admin.py`
All gated by `require_permission("scope:action")`.
| Method & path | Purpose | Permission |
|---|---|---|
| `GET /analytics` | Platform metrics — **throws `NameError` on every call**, see [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md) | `users:view` |
| `GET /users` | Paginated user list, online/active-today flags | `users:view` |
| `DELETE /users/{id}` | Hard-delete a user | `users:ban` |
| `POST /users/{id}/sanction` | Warn/mute/suspend/ban | `users:ban` |
| `GET /challenges/pending` | Moderation queue | `challenges:approve` |
| `POST /challenges/{id}/review`, `/bulk-review` | Approve/flag/retire | `challenges:approve` |
| `GET /llm/usage` | LLM cost dashboard — always reports zero, its writer is dead code | `llm:view_usage` |
| `GET /logs/admin-actions` | Audit trail (genuinely populated) | `logs:view_admin_actions` |
| `GET /feedback`, `PATCH /feedback/{id}/status` | Feedback triage | `user:view_sanctions` / `user:apply_sanctions` |

### `health.py`
| Method & path | Purpose | Auth |
|---|---|---|
| `GET /health` | Liveness probe | public |
| `GET /ready` | Checks Postgres (`SELECT 1`), Mongo ping, Redis ping, Supabase client presence | public |

## Services (`backend/app/services/`)

| Service | Responsibility | Notes |
|---|---|---|
| `execution_service.py` | Code execution (live path) | See above — subprocess + regex "transpilation," no real sandbox |
| `game_service.py` | XP/leveling/Elo/streaks/achievements | See [FEATURES.md](./FEATURES.md#gamification-systems) |
| `assignment_service.py` | Node → challenge assignment for authenticated users | Backs `nodes.py` |
| `ai_mentor_service.py` | AI Mentor chat/guidance, challenge generation, feedback | See [AI_LLM.md](./AI_LLM.md) |
| `career_service.py` | Career recommendation, sprint tickets, interview prep | See [AI_LLM.md](./AI_LLM.md) |
| `memory_service.py` | Codebase-indexing/RAG (not user learning memory) | See [AI_LLM.md](./AI_LLM.md) |
| `question_bank_service.py` | AI question generation with Redis double-checked locking, public DTO shaping | See [AI_LLM.md](./AI_LLM.md) |
| `llm_gateway_service.py` | Centralized LLM gateway with usage logging | **Dead code — zero callers**, see [AI_LLM.md](./AI_LLM.md) |

## Background jobs

Only one ARQ function is registered: `run_code_task` (the Docker sandbox, see above), and it is never enqueued by anything. There are no scheduled digests, pre-generation jobs, notification workers, or outbox-drain jobs — despite the architecture doc calling for several of these.
