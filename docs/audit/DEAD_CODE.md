# Dead & Orphaned Code Inventory

Evidence points to at least one significant redesign that left the previous iteration's files in place rather than deleting them. Several CSS custom properties in `src/index.css` are explicitly commented as "fallback aliases for existing components being refactored," which corroborates this directly.

## Frontend — components never imported anywhere

| File | What it was superseded by |
|---|---|
| `src/components/layout/Navbar.tsx` | An entire alternate top-nav HUD, superseded by `Sidebar.tsx` + `HeaderBar.tsx` in the actual `App.tsx` tree. |
| `src/components/auth/RealmVisualization.tsx` | An unused animated SVG constellation intended for the auth screen's left panel — `AuthLayout.tsx` uses its own inline showcase instead. |
| `src/components/onboarding/AdaptiveAssessmentModal.tsx` | Superseded by `OnboardingFlow.tsx`. |
| `src/components/onboarding/OnboardingTutorialModal.tsx` | Superseded by `SpotlightTour.tsx`. |
| `src/components/ui/Badge.tsx`, `Button.tsx`, `Card.tsx`, `ProgressBar.tsx` | Every screen uses raw `<div>`/inline `style={{}}` and CSS classes directly instead of these primitives. Only `ui/Toast.tsx` and `ui/FormattedText.tsx` from the same folder are actually wired in. |

## Frontend — static data superseded by AI generation, never imported

| File | Original purpose |
|---|---|
| `src/data/challengesData.ts` | Hand-authored Python/JS challenges + `bossBattlesData` — an early fully-static prototype of the challenge system. |
| `src/data/careerData.ts` | Career paths and virtual-company "sprint tickets" — same era, same fate. |

Both were superseded once the backend gained `GET /challenges/generate` (real AI generation). Real gameplay content is confirmed to be 100% backend-driven at runtime; only inline catch-block fallback challenges remain hardcoded, and they're not sourced from these files.

## Frontend — parallel/duplicate systems (not dead, but redundant)

- **Two admin UIs**: `AdminConsole.tsx` (earlier, simpler, reachable only via the in-shell "Preview Student View" round-trip) and `AdminDashboardPortal.tsx` (the full-page portal admins actually land on at login — clearly the newer, more complete one: Overview/Users/Content/Feedback/AI/Logs tabs, bulk-review, online-now tracking).
- **Two achievement systems**: the static seed list in `data/achievementsData.ts` (referenced mostly for its type/initial state) vs. `DeveloperHQ.tsx`'s independently computed 10-achievement list derived live from profile stats. These are disconnected — a user's real achievement badges come from the latter.
- **Two streak implementations**: `GameService.update_streak` (backend, `game_service.py`) and a near-duplicate `update_user_streak` free function in `api/v1/user.py`, using different date-diff semantics (`>1 day` reset vs. exact `== today - 1`). Not dead, but a maintenance hazard — a fix applied to one won't apply to the other.

## Backend — built, never called

| File / symbol | Status |
|---|---|
| `backend/app/services/llm_gateway_service.py` (`LLMGatewayService`) | Zero callers anywhere in the codebase. See [AI_LLM.md](./AI_LLM.md). |
| `backend/app/core/worker.py` (`run_code_task`, the Docker sandbox) | Registered as an ARQ job, never enqueued by any route. See [BACKEND.md](./BACKEND.md#execution-engine). |
| `backend/app/models/memory.py` (`KnowledgeGraphEdge`, `SemanticMemory`) | Modeled, migrated, never read or written anywhere in `memory_service.py`. |
| `backend/app/models/*.py` (`AuditLog`) | Model exists, nothing ever writes to it — `AdminActionLog` (a separate, stricter table) is the one actually populated. |
| `slowapi` (in `requirements.txt`) | Never imported anywhere — rate limiting is hand-rolled via Redis instead. |

## Backend — two seed paths for two databases

`backend/scripts/seed_data.py` (Postgres) and `backend/scripts/migrate_mongo.py` (Mongo) seed the **identical** starter realm/challenge/test-case content independently. No backend code ever reads from the Mongo side (see [ARCHITECTURE.md](./ARCHITECTURE.md) and [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)) — this looks like an in-progress or abandoned migration between the two databases, with the Mongo path kept alive but unused.

## Why this matters for future work

Before extending or "fixing" any of the following, confirm whether it's actually live: the LLM gateway usage dashboard (its data source is dead), the sandbox worker (looks production-ready, isn't wired), the Mongo connection (looks like a real datastore, isn't one), or either achievement/admin-UI pair (easy to edit the wrong one and see no effect in the product). A quick grep for callers/imports before editing avoids wasted work on unreachable code.
