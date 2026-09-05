# Performance Improvements

## Frontend

- **Bundle bloat from dead code**: confirmed-unused components (old `Navbar`, unused `ui/` primitives, duplicate onboarding modals) ship in the production bundle today for no reason — free removal, no tradeoff. See [../audit/DEAD_CODE.md](../audit/DEAD_CODE.md).
- **Duplicated API-call logic**: several components (`ChallengeEditor`, `BossFight`, `CodeDuel`, `Leaderboards`, `AdminConsole`) bypass the shared `ApiClient` and call `fetch()` directly, duplicating auth-header and error-handling logic. Beyond code cleanliness, this means a future global change (adding a request-id header for tracing, changing refresh-token logic) has to be applied in multiple places instead of one — a real risk of drift, not just style.
- **No router**: acceptable at current scope, but as more modes are added (see [NEW_GAME_MODES.md](./NEW_GAME_MODES.md)) the hand-rolled `activeTab` switch will need to grow carefully to avoid becoming an unmaintainable single file — worth revisiting once 3-4 more modes are added.

## Backend

- **LLM latency stacking**: the 3-tier fallback cascade (Gemini → Groq → canned) shares one 15-second timeout per tier, so a worst-case challenge-generation request can take 30+ seconds before falling back to the canned response. Recommend tightening per-tier timeouts and prioritizing the architecture doc's own "background pre-generation" idea — admin activates a node, generation happens in the background, so no user-facing request ever waits on an LLM call for popular nodes.
- **Startup cost**: the app runs `Base.metadata.create_all` on every boot in addition to Alembic migrations. Harmless at current scale but an unnecessary cold-start cost worth gating to development-only before it becomes a real latency line item as the schema grows.
- **Reward math duplication**: beyond the integrity issue (see [PROBLEMS.md](./PROBLEMS.md)), having XP/coin calculation logic duplicated across three files also means any future performance optimization (e.g. batching reward writes) has to be done three times.

## Database

- **Leaderboard query**: currently joins against mastery tables for filtering; worth an index review specifically on this path as user count grows, since it's one of the more frequently-hit read paths in the product.
- **Cache pattern to reuse**: the leaderboard's 5-minute Redis cache is a good, already-proven pattern in this codebase — apply the same shape to `/practice/recommend` and public challenge metadata, both of which are read far more often than they change.

## What NOT to prioritize yet

No evidence of N+1 query problems, missing critical indexes, or actual production load issues was found in the audit — this is a pre-scale codebase, and the performance opportunities above are about avoiding future pain (LLM latency, bundle bloat, cache misses) rather than fixing current measured bottlenecks. Recommend instrumenting the analytics in [ANALYTICS.md](./ANALYTICS.md) before investing further in performance work, so future optimization is guided by real numbers rather than speculation.
