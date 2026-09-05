# Development Roadmap

Timeline sized to this project's actual scope (a small-to-mid-size full-stack app with one active codebase, not a large team) — adjust pacing to actual team capacity.

## Week 1 — Stabilize
- Add auth + rate limiting to `POST /execute/run`.
- Remove the universal OTP bypass; gate strictly to dev if kept at all.
- Remove hardcoded secret defaults from `core/config.py`; rotate leaked credentials.
- Fix the `GET /admin/analytics` `NameError`.
- Delete confirmed-dead frontend files (old Navbar, unused UI primitives, duplicate onboarding modals, unused static data).
- Rotate the default admin credentials.

## Week 2 — Wire what's already built
- Route `/execute/run` and `/execute/submit` through the existing Docker sandbox worker.
- Wire `LLMGatewayService` as the single call path for the AI Mentor, career, and question-generation services.
- Swap Boss Fight and Code Duel to use the existing Monaco instance instead of a plain textarea.

## Week 3 — Integrity + personalization
- Build the `RewardService`: server-side recomputation, idempotency keys on every reward-granting endpoint.
- Ship the skill-radar personalization UI off existing mastery data (no new backend writes required).
- Add the `execution_jobs` table now that the sandbox is producing real per-run telemetry.

## Week 4 — AI depth
- Real structured LLM outputs (Pydantic-schema-enforced generation) across mentor, career, and question-generation calls.
- AI Code Reviewer scored rubric on every submit.
- Wire mastery-aware selection into `/practice/recommend` and challenge generation.

## Month 2 — Real engagement loops
- Ship async "ghost race" Code Duels (real opponent data, no realtime infra).
- Ship a Daily/Weekly missions system.
- Decide and execute on Championship — rebuild for real using the Duels match engine, or remove it.
- Unify the two disconnected achievement systems into one server-authoritative design.

## Month 3 — New content modes
- Debugging Arena, Code Detective, Optimization Challenge, Refactoring Challenge — built on the existing `challenges.type` schema groundwork (see [NEW_GAME_MODES.md](./NEW_GAME_MODES.md)).
- Real segmented leaderboards (country/guild/weekly).
- Adaptive placement diagnostic replacing the current placeholder quiz.

## Future — Differentiation
- Friends/social graph, then real-time 1v1 multiplayer once async Duels have validated demand.
- Live Boss Raid events.
- Public challenge marketplace.
- AI Post-Mortem retros and role-adaptive Interview Mode.
- Monetization tiers, once cost data from the wired LLM Gateway supports pricing decisions.
- The larger moonshots (Company-Style Sprint Simulation, Adaptive Learning Path Generator) — deliberately sequenced last since each depends on multiple earlier systems (missions, mastery-aware generation, persisted career data) being proven individually first.

## Sequencing logic

Weeks 1–4 are entirely about closing security/integrity gaps and connecting infrastructure that's already built — this is deliberate: shipping new competitive or AI-driven features on top of an unsandboxed executor or an exploitable reward system would just add more surface area to the same underlying problems. Month 2 onward is where genuinely new user-facing value starts shipping, on a foundation that's actually trustworthy by that point.
