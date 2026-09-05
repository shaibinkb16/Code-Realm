# Security Improvements

Full ranked writeup with file:line citations lives in [../audit/SECURITY_FINDINGS.md](../audit/SECURITY_FINDINGS.md). This is the priority checklist for planning purposes.

## P0 — do immediately
- Add authentication (and rate limiting) to `POST /execute/run` — the project's own architecture doc names this the highest-risk endpoint in the system, and it currently ships with no auth at all.
- Remove the universal OTP bypass code (`"123456"`), accepted unconditionally in every environment.
- Remove hardcoded, real-looking credential defaults from `core/config.py` (Supabase DB password, Supabase key, Mongo Atlas password, JWT secret) and rotate every credential that has appeared in git history.

## P1 — high-value next
- Wire code execution through the already-built Docker sandbox (`core/worker.py`) instead of raw `subprocess` — real isolation for a routing change, not a new build.
- Implement real WebAuthn attestation/assertion verification for passkeys, or clearly mark the feature as beta/unsupported until it exists — today it provides the UX of strong auth without the cryptographic guarantee.
- Build a `RewardService` with server-side recomputation and idempotency keys, closing the client-controlled-reward gap on `POST /user/progress` and preventing duplicate reward grants anywhere in the system.

## P2 — useful improvements
- Fix the `NameError` in `GET /admin/analytics` (trivial, but it's a broken admin-facing endpoint today).
- Rotate the default admin credentials created by `scripts/create_admin.py`.
- Wire the already-modeled but unused MFA columns (`mfa_enabled`, `mfa_secret_encrypted`) into a real TOTP flow, at least for admin-role accounts, per the architecture doc's own recommendation.

## P3 — future/hardening
- Real JWT/session revocation — today "revoking" a session only flags a database row; the bearer token itself stays valid until natural expiry. Needs either a short-lived-access-token + real-refresh-denylist design, or a full JWT denylist.
- Wire up the already-modeled account-lockout columns (`failed_login_attempts`, `locked_until`) to actually prevent credential stuffing.
- A dedicated security test pass covering exactly the areas the audit found untested: OAuth flows, passkey registration/login, admin RBAC boundary checks, and non-Python execution paths.

## Why this ordering

The P0 items are all cheap (auth gates, secret removal, one deleted string) and close the highest-blast-radius gaps. The P1 items require real engineering (wiring the sandbox, building a service) but the *hard part of each is already done* elsewhere in the codebase — this is "finish what's started," not "build from scratch," which is why they're sequenced before the newer capability work in [ROADMAP.md](./ROADMAP.md).
