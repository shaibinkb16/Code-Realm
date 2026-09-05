# Architecture Improvements

## Wire the sandbox worker
The hard part — per-language Docker images, memory/CPU limits, `network_mode="none"`, base64-smuggled code — is already built in `core/worker.py`. What's missing is a routing change: `POST /execute/run` and `/execute/submit` need to enqueue the existing ARQ job (`run_code_task`) instead of calling `subprocess` directly. This single change fixes the biggest security gap in the product (see [SECURITY.md](./SECURITY.md)) and, as a side effect, gives real multi-language support — today's non-Python "execution" is a regex-based transpilation hack into JavaScript, not real compilation.

**Follow-on**: once the sandbox is live, add the `execution_jobs` table (already specified in the architecture doc, never migrated) to capture real per-run cpu/memory/exit-code telemetry — this becomes cheap once the sandbox itself is producing that data anyway.

## Wire the LLM Gateway
`LLMGatewayService` already implements usage logging, request IDs, and latency tracking to spec. Point `ai_mentor_service.py`, `career_service.py`, and `question_bank_service.py` at it instead of each calling `call_llm_with_fallback()` directly. This is a refactor of call sites, not new logic, and it's the direct prerequisite for real LLM cost analytics (see [ANALYTICS.md](./ANALYTICS.md)) — the admin dashboard for this already exists and currently always shows zero.

## Build a RewardService
XP/coin/Elo grant logic is currently duplicated with different hardcoded numbers across `execution_service.py`, `api/v1/execution.py`, and `api/v1/user.py`. Centralizing it into one service is the natural place to also enforce server-side recomputation and idempotency keys (see [SECURITY.md](./SECURITY.md)) — the architectural fix and the security fix are the same piece of work.

## Resolve the Mongo question
MongoDB is connected and health-checked but functionally inert — no route or service reads or writes to it anywhere in the codebase. This ambiguity is pure maintenance cost today: a new contributor reasonably assumes it's part of the real data path. Two honest paths forward: remove the connection, health-check, and parallel seed script entirely; or give it a real, scoped job (e.g. storing large raw LLM generation payloads or logs that don't belong in relational rows). Either is better than the current in-between state.

## Reconcile the three deployment topologies
`render.yaml`, `.env.example`/`core/config.py`, and `docker-compose.yml` each describe a different picture of where this actually runs (see [../audit/ARCHITECTURE.md](../audit/ARCHITECTURE.md)). Recent commit history confirms Supabase is the real production database, not Render's own managed Postgres declared in `render.yaml`. Recommend picking one documented source of truth and updating the other config files (or explicit comments explaining the divergence) so deployment topology isn't something a new engineer has to reverse-engineer from git log archaeology.

## Introduce a staging environment
No genuinely separate staging environment currently exists — one `ENVIRONMENT` variable gates a handful of behaviors, but credentials and infrastructure shape are otherwise identical across "environments." As the reward/execution/social features above land, a real staging environment (separate DB, separate LLM keys, separate OAuth app) becomes increasingly important for testing migrations and reward-integrity changes safely before they touch production data.

## Split future large migrations
One existing migration (`d2e3f4a5b6c7_master_architecture_upgrade.py`) creates/patches roughly 15 tables in a single file — exactly the anti-pattern the architecture doc itself warns against. Any new tables from this plan (missions/quests, real achievements, `execution_jobs`) should ship as individually reviewable, sequenced migrations rather than repeating that pattern.
