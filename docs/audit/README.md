# Code Realm — Technical Audit & Documentation

This folder documents what is **actually implemented** in the Code Realm codebase, as read directly from source (not from `docs/code-realm-master-architecture (1).md`, which is a target/planning document, not a description of the shipped system). It was compiled from four independent full-code passes over the backend, AI/LLM subsystem, frontend, and execution/gamification/infra layers, current as of commit `ae55aa6` on `main`.

Code Realm is a gamified programming-education platform: a React SPA where users move across a fantasy "realm" map, solve AI-generated coding challenges in a Monaco editor, fight bosses, duel other players, climb an Elo-ish leaderboard, and level up a base-building meta-layer — backed by a FastAPI service on Postgres/Redis with Gemini/Groq as LLM providers.

## Files in this folder

| File | Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full tech stack, deployment topology (Vercel/Render/Supabase/Upstash), local dev (Docker Compose), migration strategy |
| [BACKEND.md](./BACKEND.md) | FastAPI service: auth/security, database layer, execution engine, full API endpoint reference, services |
| [FRONTEND.md](./FRONTEND.md) | React app: routing approach, auth flow, state management, API communication patterns |
| [FEATURES.md](./FEATURES.md) | Every user-facing feature/screen and what it actually does end-to-end |
| [AI_LLM.md](./AI_LLM.md) | LLM providers/models, AI Mentor, question generation, career recommender, memory/RAG subsystem |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | All ~34 Postgres tables grouped by domain, migration history, what's modeled vs. actually used |
| [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md) | Ranked security/correctness findings — critical through informational |
| [GAPS_PLAN_VS_REALITY.md](./GAPS_PLAN_VS_REALITY.md) | Point-by-point comparison of the master architecture doc's plan vs. what's actually built |
| [DEAD_CODE.md](./DEAD_CODE.md) | Orphaned components, unused files, and dead backend code, with evidence |
| [TESTING.md](./TESTING.md) | What's actually tested, what isn't |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | Every env var, grouped, with inferred purpose |

## Headline findings

- **Frontend**: React 19 + TypeScript + Vite, no router installed — navigation is a hand-rolled tab state machine (`GameContext.activeTab`). Monaco editor only in the main Challenge Editor; Boss Fights and Duels use a plain textarea.
- **Backend**: Async FastAPI on Postgres (via a Supabase-hosted pooler) + Redis; MongoDB is connected but functionally inert (health-check ping only, no reads/writes anywhere).
- **AI**: A real 3-tier fallback chain (Gemini → Groq → hardcoded canned string), but the codebase's own purpose-built `LLMGatewayService` (with usage logging, request IDs) is dead code — nothing calls it, so the admin LLM cost dashboard always reports zero.
- **Execution**: The single biggest plan-vs-reality gap in the system. Live code execution is raw `subprocess.run()` with a bypassable substring blocklist as its only "security." A properly isolated Docker/ARQ sandbox (per-language images, memory/CPU limits, `network_mode="none"`) is fully built in `core/worker.py` — and is never enqueued by any API route.
- **Security**: `POST /execute/run` has no auth at all; a universal OTP bypass code (`"123456"`) is accepted in every environment; production-adjacent credentials (Supabase/Mongo passwords, a JWT secret) are committed as source-code defaults in `core/config.py`.
- **Gamification**: `POST /user/progress` accepts client-submitted XP/coins/stars and applies them without server-side recomputation; no endpoint anywhere uses an idempotency key, so double-submission can duplicate rewards.
- **Technical debt**: a meaningful fraction of the frontend (an old Navbar, unused UI primitives, two onboarding-modal variants, two static data files) and backend (the LLM gateway, the sandbox worker, an `AuditLog` model nothing writes to) is dead code left over from at least one prior redesign.

See [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md) for the full ranked list and [GAPS_PLAN_VS_REALITY.md](./GAPS_PLAN_VS_REALITY.md) for the complete plan-vs-reality table.
