# Plan vs. Reality

A point-by-point comparison of `docs/code-realm-master-architecture (1).md` (the team's own target-architecture document) against what the code actually does. Organized by the plan doc's own section numbers where useful.

| Plan called for (doc §) | What actually ships |
|---|---|
| Execution Sandbox — Firecracker/gVisor, queue-mediated (§17) | A Docker/ARQ sandbox is fully built in `core/worker.py` but **never enqueued by any route**; live traffic runs through raw `subprocess.run()` with a bypassable substring blocklist. See [BACKEND.md](./BACKEND.md#execution-engine). |
| `execution_jobs` table tracking every run (§17) | Does not exist in any migration or model — no per-run cpu/memory telemetry. |
| One `LLMGateway`, no feature calls providers directly (§18) | `LLMGatewayService` exists in code implementing exactly this, but has **zero callers** — the mentor, career, and question-generation services all call `call_llm_with_fallback()` directly, bypassing it. |
| Circuit breaker on repeated LLM failures (§18) | Not implemented — the real fallback is a flat sequential try/except cascade with no state or backoff. |
| Structured Pydantic-validated LLM outputs, reject-and-retry on malformed output (§18) | Bare `json.loads()` + manual `if field not in x: raise` checks; malformed output is patched with hardcoded fallback defaults and saved, not rejected. |
| `llm_usage_logs` table for cost/volume tracking (§18) | Table exists, is read by the admin dashboard, but is **never written to** — the dashboard permanently reports zero cost/usage regardless of real traffic. |
| Redis lock for concurrent question generation, keyed `node:lang:difficulty` (§19) | **Implemented faithfully** — double-checked locking with `SET NX EX 15`, polling losers, re-check inside the lock. One of the best-realized parts of the whole plan. |
| Auth required on `/execute/run` — "the single highest-risk endpoint" (§17/§20) | Ships with **no auth at all** — the doc identifies this exact risk and the code ships it open anyway. |
| Server-side-only scoring; idempotency keys on every state-mutating op (§15, §16) | `POST /user/progress` accepts client-submitted xp/coins/stars directly; no idempotency key is checked anywhere in the system. |
| Three DTO shapes per challenge — Internal/Public/Admin, hidden fields never leak (§22) | The public-facing boundary (`format_challenge_public()`) is genuinely implemented — hidden test cases and canonical solutions are correctly stripped before reaching a client. |
| Admin role & permission model, scoped permissions via dependency injection, not `role == "admin"` string checks (§23) | **Implemented faithfully** — `AdminRole`/`UserAdminRole` many-to-many model, `require_permission("scope:action")` on every admin route, `admin_action_logs` written on every mutation with before/after state. |
| MFA mandatory for any admin-role account (§23.5) | Not implemented — `mfa_enabled`/`mfa_secret_encrypted` columns exist, no TOTP/MFA flow anywhere. |
| `refresh_tokens` table for rotation + revocation (§24) | Table exists but isn't used for revocation — "revoke session" only flags a `UserSession` row; the JWT itself has no denylist. |
| Account lockout after N failed logins (§24) | `failed_login_attempts`/`locked_until` columns exist; nothing increments or checks them. |
| `rate_limit_violations`, `api_keys`, `notifications`, `user_wallet_transactions`, `outbox_events` tables (§2, §21, §25, §28) | **None of these exist** in any migration. No transactional outbox pattern anywhere — mutations commit directly. |
| Multi-dimensional rating: global / per-language / per-topic Elo driving adaptive difficulty (§27) | `UserLanguageMastery`/`UserTopicMastery` tables exist and are populated, but only feed leaderboard filtering — actual gameplay difficulty and rewards run off one global `rank_rating`. |
| Rating changes stored in `rating_history`, real Elo math (§27) | Elo formula is real (expected-score calculation), but explicitly **positive-sum only** — wins award `max(1, change)`, losses award 0 ("as per user preference" per an inline comment). Not competitive Elo; a one-way ratchet. |
| `RewardService` centralizing all XP/coin/Elo grants (§28) | Not built — reward math is duplicated with different hardcoded numbers across `execution_service.py`, `api/v1/execution.py`, and `api/v1/user.py`. |
| Split, sequenced migrations (`001_base`, `002_...`), never one giant file (§33) | Mostly followed early on, but `d2e3f4a5b6c7_master_architecture_upgrade.py` single-handedly creates/patches ~15 tables in one file — precisely the anti-pattern the doc warns against. |
| Background workers for pre-generation, notifications, spend ceilings, cleanup jobs (§21) | Only one ARQ job exists at all (the orphaned code-execution sandbox); no other background workers run. |
| Leaderboard segmentation: global/weekly/monthly/friends/per-realm, cursor pagination (§28) | Only a single global leaderboard exists; frontend filter tabs for Country/Guild/Weekly all call the same endpoint. |
| Question quality analytics driving `quality_score` from real behavior (§29) | Not implemented — no view/attempt/swap-rate tracking feeding a computed quality score. |

## Reading this table

Two clear patterns emerge:

1. **Concurrency-and-data-integrity mechanisms that are hard to get right tend to be genuinely implemented** — the Redis generation lock, the admin permission model, and the public/internal DTO boundary all match the plan closely.
2. **Mechanisms requiring an extra "wire it up" step, or that trade off convenience against correctness, tend to be built but disconnected, or skipped under deadline pressure** — the Docker sandbox, the LLM gateway, idempotency keys, and MFA all fall in this bucket. This is the pattern worth watching for in future feature work on this codebase: check not just "does the code for X exist" but "does anything actually call it."

See [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md) for the subset of these gaps that carry real security risk, and [DEAD_CODE.md](./DEAD_CODE.md) for the broader inventory of unreachable code.
