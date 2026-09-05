# Security & Risk Findings

Ranked by severity. File:line references reflect `main` at commit `ae55aa6`.

## Critical

### 1. Real-looking credentials hardcoded as source defaults
**File**: `backend/app/core/config.py`
A Supabase Postgres connection string with an embedded password, a Supabase key, a MongoDB Atlas URI with an embedded password, and a static JWT `SECRET_KEY` fallback are all committed as Pydantic field *defaults* — not just placeholders in `.env.example`.
**Impact**: anyone with source access has plausible production-adjacent credentials, whether or not the env vars are actually overridden at deploy time.
**Fix**: remove the hardcoded defaults entirely (require the env var, fail fast if missing); rotate every credential that appears in git history.

### 2. `POST /execute/run` has no authentication
**File**: `backend/app/api/v1/execution.py`
This endpoint runs arbitrary user-supplied code against user-supplied test cases with zero auth requirement — directly contradicting the project's own architecture doc, which explicitly names this "the single highest-risk endpoint in the system."
**Impact**: combined with finding below (unsandboxed execution), this is an open, unauthenticated code-execution surface on the API host itself — usable for resource exhaustion or as a stepping stone if the blocklist bypass (below) is exploited.
**Fix**: require auth at minimum; ideally also rate-limit per-IP and route through the sandboxed executor (see [BACKEND.md](./BACKEND.md#execution-engine)).

### 3. Universal OTP bypass code
**File**: `backend/app/api/v1/auth.py` (~lines 104-106)
`POST /auth/verify-otp` accepts the Redis-stored one-time code **or the hardcoded literal string `"123456"`**, unconditionally, with no `ENVIRONMENT` gate distinguishing dev from prod.
**Impact**: quietly defeats email verification for anyone who reads the source (or guesses).
**Fix**: remove entirely, or gate it strictly behind `ENVIRONMENT == "development"` with a loud log warning.

## High

### 4. Unsandboxed code execution in the live path
**File**: `backend/app/services/execution_service.py`
Live execution is raw `subprocess.run()` with a bypassable substring blocklist (`import os`, `require('fs')`, etc. — defeated by `__import__('os')`, string concatenation, or equivalents) as the only control. No OS-level sandboxing, no network isolation, no memory limit — only a 4-second wall-clock timeout.
**Impact**: a properly isolated Docker sandbox already exists in `core/worker.py` (per-language containers, memory/CPU limits, `network_mode="none"`) but is never invoked by any route — the fix is largely "wire up what's already built," not build something new. See [BACKEND.md](./BACKEND.md#execution-engine).

### 5. Client-controlled reward values, no idempotency anywhere
**File**: `backend/app/api/v1/user.py` (`POST /progress`)
This endpoint accepts client-submitted `xp`/`coins`/`stars` values and applies them directly to the profile with no server-side recomputation. More broadly, **no endpoint in the system** (`/execute/submit`, `/user/progress`, contest submit) checks an idempotency key before granting rewards.
**Impact**: a modified client can award itself arbitrary XP/coins on this path; a duplicated/retried request on any reward-granting endpoint can farm rewards indefinitely. This directly violates the architecture doc's own "all scoring is server-side only" and idempotency mandates.
**Fix**: recompute rewards server-side from the actual submission/session state; add a `submission_request_id`-style idempotency key to every state-mutating, reward-granting call.

### 6. Passkey/WebAuthn crypto is stubbed on both ends
**Files**: `src/services/passkey.ts` (frontend), `backend/app/api/v1/auth.py` (backend)
Registration sends/accepts a placeholder public key (`pubkey_${rawId.slice(0,16)}`) rather than a real attestation object. Backend "verification" only checks that a Redis-stored challenge nonce existed, not a real signature.
**Impact**: the feature provides the UX of strong phishing-resistant auth without its actual cryptographic guarantee — a compromised or spoofed client could register an arbitrary "passkey."
**Fix**: implement real WebAuthn attestation/assertion verification (e.g. via `py_webauthn` / `@simplewebauthn`) on both ends before treating this as a production auth factor.

## Medium

### 7. Admin analytics endpoint throws `NameError`
**File**: `backend/app/api/v1/admin.py` (~line 118)
`GET /admin/analytics` references `pending_bugs`, a variable that is never assigned anywhere in the function (a query result's `.scalar()` is computed but never captured into that name).
**Impact**: this route raises a runtime `NameError` / HTTP 500 on every call as currently written. Not a security issue by itself, but a live, broken admin dashboard widget.
**Fix**: assign `pending_bugs = res_bugs.scalar()` (or equivalent) before the return statement.

### 8. Hardcoded default admin credentials
**File**: `backend/scripts/create_admin.py`
Creates a super-admin account with a fixed email/password (`admin@coderealm.dev` / `AdminPass123!`).
**Impact**: if this script has run against any reachable environment and the password was never rotated afterward, it's a standing admin-takeover path.
**Fix**: generate a random password at creation time and force a change on first login; never print/commit a real credential.

### 9. Session "revocation" doesn't invalidate the JWT; MFA/lockout columns are inert
**Files**: `backend/app/api/v1/auth.py`, `backend/app/models/user.py`
`DELETE /auth/sessions/{id}` only flags a `UserSession` row — the bearer token itself has no denylist and stays valid until natural expiry. `users.mfa_enabled`/`mfa_secret_encrypted` and `failed_login_attempts`/`locked_until` columns exist but nothing reads, increments, or enforces them.
**Impact**: "revoke this device" is a UI-only action; there's no real credential-stuffing lockout despite the schema being ready for one.
**Fix**: track active JWTs (or short-lived access tokens + a real refresh-token denylist) for true revocation; wire up the existing lockout columns in the login path.

## Implemented as designed (for contrast)

The permission-scoped admin RBAC model (`AdminRole`/`UserAdminRole`, `require_permission("scope:action")` dependency injection, before/after-state `AdminActionLog` writes on every mutating admin action) is genuinely built to the architecture doc's specification — worth calling out since so much of this list is about gaps, not to leave the impression nothing in the security layer works as intended.

## Suggested remediation order

1. Add auth to `/execute/run` (§2) — smallest change, largest immediate risk reduction.
2. Remove the OTP bypass (§3) and rotate/relocate the hardcoded secrets (§1).
3. Wire `/execute/*` through the existing Docker sandbox worker (§4) instead of raw `subprocess`.
4. Make `/user/progress` (and any other reward-granting endpoint) recompute rewards server-side and add idempotency keys (§5).
5. Fix the `NameError` in `/admin/analytics` (§7) — trivial one-line fix.
6. Rotate the default admin credentials (§8) and confirm whether that script has ever run against a live environment.
7. Implement real WebAuthn verification (§6) or clearly mark passkey login as beta/unsupported until it does.
