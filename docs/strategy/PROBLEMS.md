# Current Problems — Full List

Every problem identified across the audit and module review, categorized by severity, each with the full diagnostic template. Cross-referenced with [../audit/SECURITY_FINDINGS.md](../audit/SECURITY_FINDINGS.md) and [../audit/GAPS_PLAN_VS_REALITY.md](../audit/GAPS_PLAN_VS_REALITY.md) where a finding originates there.

## 🔴 Critical

### Unauthenticated code execution
- **Problem**: `POST /execute/run` requires no authentication and runs on an unsandboxed `subprocess`.
- **Why it matters**: An open compute-abuse surface on the API host itself; the project's own architecture doc names this the single highest-risk endpoint in the system.
- **Where it exists**: `backend/app/api/v1/execution.py`, `backend/app/services/execution_service.py`.
- **Current behavior**: Anyone can execute arbitrary code with only a bypassable substring blocklist (`import os`, etc.) as protection.
- **Recommended solution**: Add auth immediately; medium-term, route through the already-built Docker sandbox worker (`core/worker.py`).
- **Expected benefit**: Removes an open remote-code-execution-adjacent surface at near-zero product cost.
- **Estimated complexity**: Low (auth gate) → Medium (sandbox wiring).

### Reward integrity — client-controlled scoring, no idempotency
- **Problem**: `POST /user/progress` accepts client-submitted XP/coins/stars and applies them directly; no endpoint anywhere checks an idempotency key before granting rewards.
- **Why it matters**: A modified client can self-award unlimited progress; any reward-granting call can be duplicated for double rewards.
- **Where it exists**: `backend/app/api/v1/user.py`, `execution.py`, `contests.py`.
- **Current behavior**: Rewards are trusted or recomputed inconsistently per endpoint, with different hardcoded values in different files.
- **Recommended solution**: Build a single `RewardService` that recomputes rewards server-side and checks an idempotency key before granting anything.
- **Expected benefit**: Makes every leaderboard, HQ, and Elo number trustworthy — currently none of them fully are.
- **Estimated complexity**: Medium.

### Universal OTP bypass
- **Problem**: `POST /auth/verify-otp` accepts the literal string `"123456"` as a valid code for any account, unconditionally, in every environment.
- **Why it matters**: Quietly defeats email verification for anyone who reads the source.
- **Where it exists**: `backend/app/api/v1/auth.py` (~lines 104-106).
- **Current behavior**: No environment gate distinguishes dev from prod.
- **Recommended solution**: Remove entirely, or gate strictly behind `ENVIRONMENT == "development"`.
- **Expected benefit**: Closes a trivially exploitable account-verification bypass.
- **Estimated complexity**: Low.

### Real credentials committed as source defaults
- **Problem**: `core/config.py` hardcodes a Supabase Postgres URL with an embedded password, a Supabase key, a MongoDB Atlas URI with an embedded password, and a JWT `SECRET_KEY` fallback as Pydantic field defaults.
- **Why it matters**: Anyone with source access has plausible production-adjacent credentials.
- **Where it exists**: `backend/app/core/config.py`.
- **Current behavior**: Defaults are overridable by env vars but committed to git as-is.
- **Recommended solution**: Remove hardcoded defaults, require the env var and fail fast if missing; rotate every credential that appears in git history.
- **Expected benefit**: Removes a standing credential-leak risk.
- **Estimated complexity**: Low (code change) / Medium (credential rotation coordination).

## 🟠 High Priority

### Flagship "multiplayer" features are simulated
- **Problem**: Code Duels' opponent progress is `Math.random()`; the "AI Opponents" are hardcoded, not LLM-driven; Championship's entire bracket is fabricated.
- **Why it matters**: These are exactly the features most likely to be marketed as differentiators — shipping them as-is risks user trust once discovered.
- **Where it exists**: `src/components/duels/*`, `src/components/championship/Championship.tsx`.
- **Current behavior**: No real opponent, no real bracket, no backend call for either.
- **Recommended solution**: Build a real async version (see [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md)) or clearly relabel as "coming soon" until real.
- **Expected benefit**: Protects trust; the real build becomes the actual retention driver instead of a placeholder.
- **Estimated complexity**: Medium (async) → High (full realtime).

### Unsandboxed execution despite a sandbox already existing
- **Problem**: Live execution runs raw `subprocess.run()` while a properly isolated Docker sandbox (`core/worker.py`) sits fully built and unused.
- **Why it matters**: The security architecture the team clearly intended to ship exists and simply isn't connected.
- **Where it exists**: `backend/app/services/execution_service.py` vs. `backend/app/core/worker.py`.
- **Current behavior**: Zero call sites anywhere enqueue the sandbox job.
- **Recommended solution**: Wire `/execute/run` and `/execute/submit` to enqueue the existing ARQ job instead of calling `subprocess` directly.
- **Expected benefit**: Real isolation, real multi-language support (the current non-Python execution is a regex-based JS transpilation hack), for a routing change rather than a new build.
- **Estimated complexity**: Medium.

### Progression data collected and thrown away
- **Problem**: `user_language_mastery`/`user_topic_mastery` are populated on every submission but only read for leaderboard filtering; actual difficulty and rewards run off one global Elo.
- **Why it matters**: Users can't see or feel differentiated skill growth; adaptive difficulty is weaker than the data supports.
- **Where it exists**: `services/game_service.py`, `api/v1/practice.py`.
- **Current behavior**: Rich per-skill data written and never surfaced or used for selection.
- **Recommended solution**: Ship a skill-radar UI and feed mastery into challenge selection — see [PERSONALIZATION.md](./PERSONALIZATION.md).
- **Expected benefit**: High personalization payoff with no new backend writes required.
- **Estimated complexity**: Low–Medium.

### Passkey/WebAuthn crypto stubbed on both ends
- **Problem**: Registration sends/accepts a placeholder public key rather than a real attestation object.
- **Why it matters**: Provides the UX of strong phishing-resistant auth without the actual cryptographic guarantee.
- **Where it exists**: `src/services/passkey.ts`, `backend/app/api/v1/auth.py`.
- **Current behavior**: Backend "verification" only checks a Redis challenge nonce existed.
- **Recommended solution**: Implement real WebAuthn attestation/assertion verification on both ends, or mark passkey login as beta until it does.
- **Estimated complexity**: Medium–High.

### LLM Gateway and sandbox worker are dead code
- **Problem**: Both a centralized `LLMGatewayService` (usage logging, retry policy) and a Docker execution sandbox are fully implemented and called by nothing.
- **Why it matters**: Real engineering investment sitting unused; the admin LLM cost dashboard is permanently empty as a direct result.
- **Where it exists**: `backend/app/services/llm_gateway_service.py`, `backend/app/core/worker.py`.
- **Recommended solution**: Wire both as the default call paths — see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md).
- **Estimated complexity**: Low–Medium (mostly routing, not new logic).

## 🟡 Medium Priority

- **Admin analytics `NameError`** — `GET /admin/analytics` references an unassigned variable and throws on every call. *Fix*: one-line assignment. *Complexity*: trivial.
- **Two divergent streak implementations** — `GameService.update_streak` and a near-duplicate in `api/v1/user.py` use different date-diff logic. *Fix*: consolidate into one. *Complexity*: low.
- **Hardcoded default admin credentials** in `scripts/create_admin.py`. *Fix*: generate random password, force rotation. *Complexity*: low.
- **Leaderboard filter tabs are cosmetic** — Country/Guild/Weekly all hit the same endpoint. *Fix*: see [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md). *Complexity*: low–medium.
- **Two disconnected achievement systems** — static seed data vs. client-computed live list; backend has one real achievement. *Fix*: design one server-authoritative system. *Complexity*: medium.
- **Ad hoc LLM JSON parsing** — no Pydantic-schema enforcement anywhere; malformed output silently patched with hardcoded fallbacks. *Fix*: see [AI_FEATURES.md](./AI_FEATURES.md) item 6. *Complexity*: medium.
- **Mongo connection is functionally inert** — connected, health-checked, never read/written. *Fix*: remove or repurpose — see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md). *Complexity*: low.
- **Contest anti-cheat timer is a hardcoded constant** — can never actually trigger. *Fix*: measure real elapsed time. *Complexity*: low.
- **Diagnostic quiz grading is a placeholder string match** (`answer.lower() == 'a'`). *Fix*: see [AI_FEATURES.md](./AI_FEATURES.md) item 9. *Complexity*: medium.

## 🟢 Low Priority

- Dead frontend components shipping in the bundle for no reason (old `Navbar`, unused `ui/` primitives, duplicate onboarding modals, two unused static data files) — see [../audit/DEAD_CODE.md](../audit/DEAD_CODE.md). *Fix*: delete. *Complexity*: trivial.
- Editor inconsistency — Monaco only in the Challenge Editor, plain textarea in Boss Fight and Duels. *Fix*: swap in Monaco. *Complexity*: low.
- Spotlight tour targets `data-tour` attributes that don't exist on the current layout. *Fix*: re-attach or remove. *Complexity*: low.
- Static "learner preference" footer text in the AI Teacher panel that isn't data-driven. *Fix*: ground in real data or remove. *Complexity*: low.
- No accessibility (ARIA/keyboard-nav) treatment found in any reviewed component. *Fix*: dedicated pass, starting with modals. *Complexity*: medium.
