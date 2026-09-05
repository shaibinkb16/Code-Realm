# Architecture & Deployment Topology

## Tech stack summary

### Frontend
| Layer | Actual usage |
|---|---|
| React 19.2 | Hooks + Context only. No Redux/Zustand/Jotai — despite the master architecture doc suggesting "Zustand or context," it's Context + `localStorage` throughout. |
| TypeScript ~6.0 | Loosely typed in places (`user: any` in `AuthContext`, `as any` casts in `DeveloperHQ.tsx`). |
| Vite 8 | Default `@vitejs/plugin-react` config, no customization. Custom post-build step `scripts/create-vercel-output.mjs` shapes the build for Vercel. |
| `@monaco-editor/react` | Real IDE editor, but only in `ChallengeEditor.tsx`. Boss Fights and Code Duels use a plain `<textarea>`. |
| `lucide-react`, `react-icons/gi` | Both actively used — general UI icons and fantasy/game-icon set for the World Map respectively. |
| `@phosphor-icons/react` | Declared in `package.json`, no import found anywhere in the codebase — likely unused. |
| `canvas-confetti` | Fired on challenge pass and boss defeat. |
| Routing | **None installed.** Navigation is `GameContext.activeTab` driving a `switch` in `App.tsx`, plus a separate top-level role-gate that routes admins into an entirely different app tree (`AdminDashboardPortal`) instead of a tab. |
| Audio | Hand-built Web Audio API oscillator synthesizer (`utils/audio.ts`) — no audio files. |

### Backend
| Layer | Actual usage |
|---|---|
| FastAPI, async | Lifespan-managed startup/shutdown; 13 routers mounted under `/api/v1` (`main.py`). |
| SQLAlchemy 2.0 + asyncpg | The only real datastore. Connection string points at a Supabase-hosted Postgres pooler. |
| Alembic | 13 linear revisions. `init_db()` also runs `Base.metadata.create_all` on every boot as a belt-and-suspenders fallback, swallowing exceptions. |
| `redis.asyncio` + `arq` | Redis is genuinely used (OTP, OAuth CSRF state, WebAuthn challenges, rate limiting, leaderboard cache). An ARQ worker pool is created but its one registered job is never enqueued (see [BACKEND.md](./BACKEND.md#execution-engine)). |
| `motor` / `pymongo` | Connected only for a health-check ping in `/ready`. No route or service ever reads/writes Mongo data — present but functionally inert. |
| `supabase-py` | Used purely to report a status flag in `/ready`; all real data access goes through SQLAlchemy directly, not the Supabase SDK. |
| `passlib[argon2]`, `pyjwt` | Argon2id password hashing; JWT HS256 access (15 min) + refresh (7 day) tokens. |
| `slowapi` | Listed in `requirements.txt`, **never imported anywhere**. Rate limiting is a hand-rolled Redis fixed-window counter instead. |
| `docker` (python package) | Powers the sandboxed executor in `core/worker.py` — built, never invoked in production. |
| LLM access | No provider SDK — raw `httpx` calls to Gemini's and Groq's REST APIs. |

## Deployment topology

Three different pictures of "where this runs" coexist across the repo's config files:

1. **`render.yaml`** (what's declared for the managed platform): one Docker web service (free plan, health-checked at `/api/v1/health`, `preDeployCommand: python scripts/migrate_db.py`), one managed Redis, one managed Postgres. **No worker service is declared.**
2. **`.env.example` / `core/config.py`** (what the app is actually configured to talk to): Supabase-hosted Postgres as "primary" database, a MongoDB Atlas URI as "fallback," and Upstash Redis (`rediss://` TLS, special-cased in `core/redis.py` to enable an SSL context for ARQ compatibility) — not Render's own Redis/Postgres.
3. **`docker-compose.yml`** (local dev): 4 services — `frontend` (bare `node:20-alpine` running `npm run dev`), `backend`, `worker` (ARQ, with `/var/run/docker.sock` mounted so it *could* run the sandboxed executor), `db` (Postgres 16), `redis` (7-alpine).

Recent commit history (`ae55aa6`, `d41895a`, `fa92be2` — all about "making migrations idempotent to handle pre-existing schema in Supabase") confirms Supabase is the real, currently-deployed database, not Render's managed Postgres declared in `render.yaml`.

```
                    ┌─────────────┐
                    │   Vercel    │   React 19 SPA
                    └──────┬──────┘
                           │ HTTPS / JWT
                           ▼
                    ┌─────────────┐
                    │   Render    │   FastAPI, Docker web service
                    └──────┬──────┘
              ┌────────────┼──────────────┬───────────────┐
              ▼            ▼              ▼               ▼
     Supabase Postgres  Upstash Redis  Gemini → Groq   MongoDB Atlas
     (source of truth)  (cache/OTP/    (LLM cascade)   (health-check
                         rate limits)                   ping only —
                                                         no real usage)
```

Code execution has a second, parallel topology that is defined but never reachable:

```
POST /execute/run ──► subprocess.run() on the API host itself     [LIVE PATH]
                        (4s timeout, substring blocklist only)

arq_pool.enqueue_job ──► Docker sandbox worker (core/worker.py)   [DEAD PATH]
                          per-language image, mem/cpu limits,
                          network_mode="none" — zero call sites
                          anywhere in the codebase enqueue this job
```

## Migration strategy

The Dockerfile's boot command runs `scripts/migrate_db.py`, which:
1. Runs a raw `Base.metadata.create_all` (SQLAlchemy) first.
2. Then runs `alembic upgrade head`.
3. Falls back to `alembic stamp head` if it detects a stale/unrecognized revision id in stderr ("Can't locate revision").

Several recent migrations were retrofitted to be conditionally idempotent (`if 'col' not in cols: add_column(...)`), rather than assuming a clean slate. Combined with the commit history noted above, this reads as a team that hit real schema drift against a shared, pre-existing Supabase database and patched around it defensively rather than resetting migration history. One migration in particular, `d2e3f4a5b6c7_master_architecture_upgrade.py`, single-handedly creates/patches roughly 15 tables — the exact "massive final migration" anti-pattern the architecture doc itself warns against.

## Environment separation

There is no evidence of a genuinely separate staging environment — one `ENVIRONMENT` variable (`production`/`development`) gates a handful of behaviors (e.g. OTP console-log fallback when SMTP isn't configured), but DB/Redis/OAuth/LLM credentials are the same shape across environments, just swapped by `.env` value.

## Local development

`docker-compose.yml` is the only place the full stack (frontend + backend + worker + Postgres + Redis) runs together. Notably, the compose file commits a plaintext `SECRET_KEY` and Postgres password (`coderealm_secret_pwd`) directly in the file — acceptable for local-only use, but worth knowing it's there.
