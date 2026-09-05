# Module-by-Module Review

Every screen and service reviewed individually: current functionality, a quality rating, concrete problems, and the specific improvement opportunity each one unlocks. This is the detailed version of the product map — read [PRIORITIZATION.md](./PRIORITIZATION.md) for how these roll up into a ranked plan, and [../audit/](../audit/) for the underlying code citations.

Quality ratings: 🟢 Good (solid, ship-ready) · 🟡 Medium (works, has real gaps) · 🔴 Poor (broken, fake, or actively risky).

---

## Frontend modules

### Authentication & Onboarding
**Current functionality**: Email/password with OTP verification, Google/GitHub OAuth, WebAuthn passkeys, a 4-step onboarding wizard (language → title → skill level → career goal), a first-run spotlight tour, session/passkey management.
**Quality**: 🟡 Medium. The UX shell is comprehensive and the token refresh interceptor is genuinely well-built.
**Problems**: Passkey registration sends a placeholder public key instead of real attestation — security theater, not real WebAuthn. The spotlight tour targets `data-tour` attributes that don't exist on the current layout, so it likely renders pointing at nothing. Two dead onboarding-modal variants (`AdaptiveAssessmentModal`, `OnboardingTutorialModal`) sit unused alongside the real flow.
**Improvement opportunity**: Fix passkey attestation before marketing it as a security feature; either repair or delete the spotlight tour's targeting; delete the dead modals to reduce confusion for new contributors. Bigger opportunity: the 4-step onboarding only sets one skill-level string → one starting Elo. A short adaptive diagnostic (see [AI_FEATURES.md](./AI_FEATURES.md)) could seed real per-topic mastery on day one instead.

### World Map & Navigation
**Current functionality**: SVG bezier node graph over one hand-authored realm (17 nodes), each procedurally expanded into 100 client-side sub-levels (every 10th bughunt, every 25th speedrun, 100th boss), gated behind a 75/100 completion threshold per node.
**Quality**: 🟢 Good. A small amount of source data produces a huge-feeling progression system — genuinely clever design.
**Problems**: No router — navigation is a hand-rolled `activeTab` switch, which is fine at current scope but will get harder to extend cleanly as more modes are added (see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md)). Only one realm exists; the map doesn't yet reflect the schema's own richer `challenges.type` vocabulary (detective/mystery/build/explain are defined but never surfaced as distinct sub-level types).
**Improvement opportunity**: Add realms/sub-level types beyond bughunt/speedrun/boss using the schema groundwork already in place — see [NEW_GAME_MODES.md](./NEW_GAME_MODES.md). No new home screen exists either — see [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md).

### Challenge Editor (core gameplay loop)
**Current functionality**: Fetches an AI-generated challenge per node/skill-rating, Monaco editor, Run/Submit/Swap/Reset, live per-test pass/fail, confetti + reward toast, AI Teacher side panel.
**Quality**: 🟢 Good. This is the best-executed screen in the product — fast feedback, real editor, real AI-generated content.
**Problems**: Grading happens through an unsandboxed subprocess on the backend (see [SECURITY.md](./SECURITY.md)); reward math is duplicated with different hardcoded numbers across multiple backend files rather than centralized.
**Improvement opportunity**: Once execution is sandboxed and rewards are centralized (both backend fixes, not frontend ones), this screen becomes a fully trustworthy foundation to build every new game mode on top of, since it's already the right shape.

### Boss Fight
**Current functionality**: 3-phase escalating encounter, each phase independently AI-generated, HP bars, wrong answers damage the player.
**Quality**: 🟡 Medium. Real mechanic, real stakes (the player can lose).
**Problems**: Uses a plain `<textarea>` instead of Monaco — a dramatic moment gets a worse editor than routine practice.
**Improvement opportunity**: Trivial parity fix (swap in Monaco); bigger opportunity is extending to a 5-stage "final boss" using the architecture doc's own data-model→API→query-optimization→security→edge-cases arc — see [NEW_GAME_MODES.md](./NEW_GAME_MODES.md) and the "Living Codebase Boss" moonshot in [MOONSHOTS.md](./MOONSHOTS.md).

### Code Duels + AI Opponents
**Current functionality**: 150-second timed 1v1 against a selectable "AI" bot.
**Quality**: 🔴 Poor, specifically because of what it claims to be. The opponent's progress bar is `Math.random()` ticks, and the six "AI Opponents" are hardcoded bots with fixed rating/win-rate strings — there is no LLM involved and no real opponent at all.
**Problems**: This is the single most misleading feature name in the product. A user who understands what's happening under the hood may reasonably feel deceived.
**Improvement opportunity**: Highest-priority fix in the whole feature set — see the async "ghost race" proposal in [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md), which replaces the fake simulation with a real race against a stored historical submission, at a fraction of the cost of full realtime multiplayer.

### Championship
**Current functionality**: A qualifiers/semifinals/finals bracket UI.
**Quality**: 🔴 Poor. Entirely mocked — fabricated opponent names, no backend call, "Enter Finals" just switches tabs.
**Problems**: Same trust issue as Duels, arguably worse since a "championship" implies real competition against real people.
**Improvement opportunity**: Decide explicitly — either build a real bracket (natural once real Duels exist, since it's largely the same match engine at a different cadence) or remove/hide it until it's real. Leaving it as-is is the worst option of the three.

### Leaderboards
**Current functionality**: Real fetch from a global endpoint, Redis-cached, top-3 podium + ranked table, filter tabs for Global/Country/Guild/Weekly.
**Quality**: 🟡 Medium. The global leaderboard itself is real and reasonably built (test-account filtering, caching).
**Problems**: All four filter tabs call the identical endpoint — the segmentation is purely visual, which is a smaller version of the same "looks real, isn't" pattern as Duels/Championship. Ranking is purely Elo-based, ignoring accuracy, consistency, or code quality.
**Improvement opportunity**: Backend query work to make the tabs real is comparatively cheap since the frontend is already built for it — see [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md). Consider a richer ranking formula — see [PERSONALIZATION.md](./PERSONALIZATION.md) for the mastery data that could feed it.

### Developer HQ (base-building + pet)
**Current functionality**: 6-tier HQ progression with passive income, 5-stage pet evolution, a client-computed 10-achievement list, an AI-generated daily "briefing."
**Quality**: 🟢 Good. A genuinely complete, working coin-sink meta-layer.
**Problems**: The daily briefing is generic AI flavor text, not grounded in the user's actual mastery data. The achievement list here is disconnected from the backend's own (much sparser) achievement system.
**Improvement opportunity**: Ground the briefing in real topic-mastery deltas (cheap — the data exists, see [AI_FEATURES.md](./AI_FEATURES.md)); reconcile the two achievement systems (see below).

### Achievements
**Current functionality**: Two disconnected systems — a static seed list (`achievementsData.ts`, mostly unused for its content) and `DeveloperHQ`'s independently computed 10-achievement list from live stats; the backend itself has exactly one real achievement (`"first_blood"`), self-healing into existence rather than seeded.
**Quality**: 🔴 Poor, structurally. What the user sees (client-computed) has no backend record — achievements aren't portable, auditable, or usable for anything beyond client display (no server-side unlock event, no notification, no cross-device consistency).
**Improvement opportunity**: Design one real, server-authoritative achievement system (see [MOONSHOTS.md](./MOONSHOTS.md) and [../audit/GAPS_PLAN_VS_REALITY.md](../audit/GAPS_PLAN_VS_REALITY.md)) that both surfaces match against — this is foundational for any future social sharing of achievements.

### AI Teacher Panel / AI Companion
**Current functionality**: Two chat surfaces (in-challenge panel, global drawer) sharing a Hint/Explain/Socratic/Demonstrate mode pattern, backed by real API calls.
**Quality**: 🟡 Medium. Real integration, thin context.
**Problems**: Context is a 1500-char truncated message + skill rating + last 3 mistakes — no conversation history, no curriculum awareness. A footer in the Teacher panel displays a static, non-data-driven "learner preference" line, which is misleading in the same family as the Duels/Championship problem (implies personalization that isn't happening).
**Improvement opportunity**: See [AI_FEATURES.md](./AI_FEATURES.md) items 1 and 8 — deepen the context, ground the "learner preference" line in real data or remove it.

### Settings
**Current functionality**: Language/skill-level/title editor, theme toggle, feedback shortcut — reuses the onboarding endpoint.
**Quality**: 🟢 Good, small scope.
**Improvement opportunity**: Low priority; fine as-is.

### Feedback
**Current functionality**: Category/star-rating/message submission with a "My Reports" status view and admin fix-note replies.
**Quality**: 🟢 Good. A genuinely complete loop end to end — one of the best-built smaller features in the product.
**Improvement opportunity**: None urgent; a good template to follow when building other user-facing report/review flows (e.g. challenge reports feeding content moderation).

### Admin Console / Admin Dashboard Portal
**Current functionality**: Two UIs — an older `AdminConsole` reachable via a "Preview Student View" round-trip, and the real `AdminDashboardPortal` admins actually land on, with Overview/Users/Content/Feedback/AI/Logs tabs.
**Quality**: 🟢 Good (the portal) / redundant (the console).
**Problems**: Maintaining two near-duplicate admin UIs is pure overhead; the LLM usage tab will always show zero (see [AI_FEATURES.md](./AI_FEATURES.md)) until the gateway is wired.
**Improvement opportunity**: Deprecate `AdminConsole` once the portal covers everything it does; wire the LLM gateway to make the AI usage tab meaningful.

### Legal
**Current functionality**: Static Privacy/Terms/FAQ, no backend calls.
**Quality**: 🟢 Good, appropriately minimal.

---

## Backend modules

### Auth & Security service layer
**Current functionality**: JWT access/refresh, Argon2id hashing, OTP email verification, OAuth2 (Google/GitHub), WebAuthn endpoints, scoped admin RBAC.
**Quality**: 🟡 Medium — genuinely strong in places (RBAC), genuinely weak in others (passkeys, OTP).
**Problems**: Universal OTP bypass code accepted in every environment; session "revocation" doesn't invalidate the JWT itself; MFA and account-lockout columns exist unused. Full detail in [../audit/SECURITY_FINDINGS.md](../audit/SECURITY_FINDINGS.md).
**Improvement opportunity**: See [SECURITY.md](./SECURITY.md) for the prioritized fix list.

### Execution Engine
**Current functionality**: Two implementations — a live unsandboxed `subprocess`-based path, and a fully-built, unused Docker/ARQ sandbox.
**Quality**: 🔴 Poor (the live path) / 🟢 Good (the unused one).
**Problems**: This is the starkest gap in the entire codebase — real security work sitting disconnected from the traffic it's meant to protect.
**Improvement opportunity**: Top priority across this entire strategy — see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) and [TOP10.md](./TOP10.md) rank 1.

### Question/Challenge Generation Pipeline (`question_bank_service.py`)
**Current functionality**: Redis double-checked locking for concurrent generation, DTO boundary protection stripping hidden tests/solutions.
**Quality**: 🟢 Good — arguably the best-engineered backend service in the product.
**Problems**: No semantic duplicate detection beyond exact node/lang/difficulty matching; not yet fed by per-user mastery data.
**Improvement opportunity**: Feed `UserTopicMastery`/`MistakeLog` into generation prompts — see [PERSONALIZATION.md](./PERSONALIZATION.md) and [AI_FEATURES.md](./AI_FEATURES.md) item 3.

### AI Mentor Service
**Quality**: 🟡 Medium — see the Frontend AI Teacher/Companion entry above; this is its backend counterpart. Additionally: a five-phrase substring blocklist is the entire "prompt injection defense," and JSON parsing is ad hoc (`json.loads()` + manual field checks) rather than schema-validated.
**Improvement opportunity**: [AI_FEATURES.md](./AI_FEATURES.md) item 6 (real structured outputs) is the foundational fix everything else here depends on.

### Career Service
**Current functionality**: Four LLM-backed endpoints (recommend/sprint-tickets/interview question/evaluate), no persistence.
**Quality**: 🟡 Medium. Works, but every recommendation is thrown away after the request.
**Improvement opportunity**: Persist recommendations per user; extend interview mode into a real multi-turn conversation — see [AI_FEATURES.md](./AI_FEATURES.md) item 5.

### Memory/RAG Service
**Current functionality**: Indexes a filesystem path on the server (defaults to a developer's own machine path), naive keyword search, no LLM calls despite the framing.
**Quality**: 🔴 Poor, and arguably out of scope — this is a codebase-indexing tool bolted onto a gameplay product, not a user-facing learning feature.
**Improvement opportunity**: Either invest in it as a real internal dev-assistant tool (separate roadmap, not part of this product strategy) or deprioritize/remove it — it currently consumes schema and maintenance surface for a feature no player ever sees.

### Gamification / Game Service
**Current functionality**: Leveling, positive-sum-only Elo, streaks (two divergent implementations), one hardcoded achievement, HQ/pet economy.
**Quality**: 🟡 Medium. The mechanics are simple but functional; the reward-integrity gap is the real problem, not the game design.
**Problems**: See [../audit/SECURITY_FINDINGS.md](../audit/SECURITY_FINDINGS.md) finding #5 (client-controlled rewards, no idempotency).
**Improvement opportunity**: [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md)'s `RewardService` proposal directly addresses this.

### Contests / Practice Service
**Current functionality**: Contest join/submit (flat scoring, mocked anti-cheat timer), practice recommendation (Elo-banded or mistake-log-driven), a placeholder diagnostic quiz, an ad-hoc mock-interview mode.
**Quality**: 🟡 Medium — functional skeleton, several placeholder implementations left in from an MVP pass.
**Improvement opportunity**: Real anti-cheat timing (the field is already captured, just not measured); adaptive diagnostic grading — see [AI_FEATURES.md](./AI_FEATURES.md) item 9.

### LLM Gateway Service
**Current functionality**: Fully implements usage logging, request IDs, latency tracking — and is called by nothing.
**Quality**: 🟢 Good code, 🔴 zero real-world value today because it's disconnected.
**Improvement opportunity**: The single highest "free win" in the codebase — wiring existing, working code unlocks cost analytics with no new logic to write. See [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md).

### Background Jobs (ARQ Worker)
**Current functionality**: One registered job (the Docker sandbox executor), never enqueued.
**Quality**: 🟢 Good code, 🔴 zero real-world value today.
**Improvement opportunity**: Same category as the LLM gateway — see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md).

---

## Database & Infrastructure

### Database schema
**Current functionality**: ~34 tables, well-normalized in most areas, a genuinely thoughtful content graph (realm → node → question set → challenge → assignment → submission).
**Quality**: 🟡 Medium. Structurally sound where it matters most; several tables are modeled and never used (`AuditLog`, `KnowledgeGraphEdge`, `SemanticMemory`), and one migration creates ~15 tables in a single file.
**Improvement opportunity**: See [../audit/DATABASE_SCHEMA.md](../audit/DATABASE_SCHEMA.md) for the full table-by-table breakdown; [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) for the Mongo question specifically.

### Deployment & DevOps
**Current functionality**: Vercel (frontend) + Render (backend, Docker) + Supabase Postgres + Upstash Redis, with a parallel, unused MongoDB Atlas connection.
**Quality**: 🟡 Medium. Works, but three different config files describe three different topologies (see [../audit/ARCHITECTURE.md](../audit/ARCHITECTURE.md)), and no staging environment exists.
**Improvement opportunity**: Reconcile `render.yaml`/`.env.example`/`docker-compose.yml` into one documented source of truth; resolve the Mongo ambiguity (see above).
