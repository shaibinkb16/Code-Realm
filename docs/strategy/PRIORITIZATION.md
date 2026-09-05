# Feature Prioritization

Every recommendation from this folder, scored on Impact/Effort/Risk (out of 10) and ranked P0–P3. P0 = do immediately, P1 = high-value next, P2 = useful improvement, P3 = future/experimental.

## P0 — do immediately

| Item | Impact | Effort | Risk | Source |
|---|---:|---:|---:|---|
| Auth + rate limit on `/execute/run`, remove OTP bypass, rotate secrets | 9 | 2 | 1 | [SECURITY.md](./SECURITY.md) |
| Wire the Docker sandbox to execution endpoints | 9 | 4 | 2 | [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) |
| Build a RewardService with idempotency | 8 | 5 | 3 | [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) |

## P1 — high-value next

| Item | Impact | Effort | Risk | Source |
|---|---:|---:|---:|---|
| Wire the LLM Gateway + populate usage logs | 7 | 3 | 1 | [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) |
| Skill-radar personalization UI (existing data) | 7 | 3 | 1 | [PERSONALIZATION.md](./PERSONALIZATION.md) |
| Real async Code Duels (ghost race) | 8 | 5 | 2 | [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) |
| AI Code Reviewer scored rubric | 7 | 4 | 2 | [AI_FEATURES.md](./AI_FEATURES.md) |
| Real structured LLM outputs (Pydantic-enforced) | 7 | 5 | 2 | [AI_FEATURES.md](./AI_FEATURES.md) |
| Mastery-aware adaptive difficulty | 7 | 5 | 2 | [PERSONALIZATION.md](./PERSONALIZATION.md) |
| Daily/Weekly missions system | 7 | 5 | 2 | [ROADMAP.md](./ROADMAP.md) |
| Real WebAuthn attestation verification | 6 | 6 | 3 | [SECURITY.md](./SECURITY.md) |

## P2 — useful improvements

| Item | Impact | Effort | Risk | Source |
|---|---:|---:|---:|---|
| Fix or cut Championship | 5 | 2 (cut) / 7 (build) | 2 | [MODULE_REVIEW.md](./MODULE_REVIEW.md) |
| New content modes (Detective/Optimization/Refactoring) | 6 | 4 | 2 | [NEW_GAME_MODES.md](./NEW_GAME_MODES.md) |
| Segmented leaderboards (country/guild/weekly, real) | 5 | 3 | 1 | [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) |
| Unified server-authoritative achievement system | 5 | 4 | 2 | [MODULE_REVIEW.md](./MODULE_REVIEW.md) |
| Friends/follow social graph | 5 | 5 | 2 | [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) |
| Real multi-turn AI Interview Mode | 5 | 4 | 2 | [AI_FEATURES.md](./AI_FEATURES.md) |
| Adaptive placement diagnostic | 5 | 4 | 1 | [AI_FEATURES.md](./AI_FEATURES.md) |
| Dedicated accessibility pass | 4 | 4 | 1 | [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md) |

## P3 — future / experimental

| Item | Impact | Effort | Risk | Source |
|---|---:|---:|---:|---|
| Full realtime 1v1 multiplayer | 7 | 8 | 5 | [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) |
| Live Boss Raid events | 7 | 8 | 4 | [MOONSHOTS.md](./MOONSHOTS.md) |
| Public challenge marketplace | 5 | 7 | 4 | [MOONSHOTS.md](./MOONSHOTS.md) |
| Team/clan challenges | 5 | 7 | 3 | [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) |
| Adaptive learning path generator | 6 | 9 | 4 | [MOONSHOTS.md](./MOONSHOTS.md) |
| Company-style sprint simulation | 6 | 8 | 4 | [MOONSHOTS.md](./MOONSHOTS.md) |
| Monetization tiers | 5 | 6 | 3 | [MONETIZATION.md](./MONETIZATION.md) |

## Reading this table

The P0/P1 tiers are dominated by "wire what already exists" work (sandbox, LLM gateway, reward integrity, personalization data) rather than new builds — this reflects the headline finding across the whole plan: the fastest path to a materially better product runs through finishing disconnected infrastructure before adding new systems. P3 items are uniformly higher-effort, higher-risk builds that depend on P0/P1 landing first, both technically (a RewardService needs to exist before a real competitive mode is trustworthy) and strategically (validate cheap versions before investing in expensive ones — see the async-then-realtime sequencing for Duels).
