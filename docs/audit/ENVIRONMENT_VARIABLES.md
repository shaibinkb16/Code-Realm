# Environment Variables

Sourced from `.env.example` at the repo root, grouped by concern, with purpose inferred from actual usage in `backend/app/core/config.py` and callers.

## Core
| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `production` / `development` — gates a handful of behaviors, e.g. OTP falls back to console-logging the code when SMTP isn't configured. |
| `SECRET_KEY` | JWT signing secret (HS256). **Ships with a hardcoded fallback value as a Pydantic field default in `core/config.py`** — see [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md). |

## Database
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase-hosted Postgres connection string (asyncpg driver), the actual primary datastore. **Also ships with a real-looking hardcoded default including an embedded password** in `core/config.py`. |
| `SUPABASE_URL` | Used only to construct the Supabase client checked in `/ready`. |
| `SUPABASE_KEY` | Same — health-check only, not used for actual data access (SQLAlchemy talks to Postgres directly). |

## Fallback database
| Variable | Purpose |
|---|---|
| `MONGODB_URL` | MongoDB Atlas connection string. Connected for a health-check ping only — no route or service reads/writes Mongo data. Also ships with a hardcoded default including an embedded password. |

## Redis
| Variable | Purpose |
|---|---|
| `REDIS_URL` | Upstash Redis, `rediss://` (TLS) — `core/redis.py` special-cases this scheme to build an SSL context for the ARQ pool. |
| `REDIS_HOST`, `REDIS_PORT` | Alternate non-URL connection form, used by local Docker Compose (`redis:6379`). |

Redis backs: OTP codes, OAuth CSRF state, WebAuthn challenge nonces, the hand-rolled rate limiter, and leaderboard response caching. An ARQ worker pool is also created here but its one job is never enqueued (see [BACKEND.md](./BACKEND.md#execution-engine)).

## LLM / AI
| Variable | Purpose |
|---|---|
| `AI_API_KEY` | Gemini API key (the name is generic but this is specifically the Gemini key — see `core/llm_client.py`). |
| `GROQ_API_KEY` | Groq API key, the second fallback tier. |
| `GEMINI_MODEL` | Overrides the first model tried in the Gemini cascade; defaults to `gemini-3.6-flash` in code — a version string that does not correspond to any publicly released Gemini model. |

## Email / OTP
| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Outbound email for OTP verification codes. When unset, the backend falls back to logging the OTP to the console instead of sending it — this fallback is not gated by `ENVIRONMENT`, only by whether SMTP config is present. |

## OAuth
| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth2 authorization-code flow. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` | GitHub OAuth2 authorization-code flow, same pattern. |

## Misc
| Variable | Purpose |
|---|---|
| `FRONTEND_URL` | Used to construct CORS allow-list and OAuth redirect targets back to the SPA. |

## Flag

Several of the variables above (`DATABASE_URL`, `SUPABASE_KEY`, `MONGODB_URL`, `SECRET_KEY`) have **real-looking values hardcoded as Pydantic field defaults in `backend/app/core/config.py`**, not just as placeholders in `.env.example`. These are overridable by actual environment variables at deploy time, but they are committed to source control as-is. See [SECURITY_FINDINGS.md](./SECURITY_FINDINGS.md) for the full writeup and recommended remediation.
