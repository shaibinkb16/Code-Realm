# Features & Functionality

Every user-facing feature/screen, what it actually does end-to-end, and how real vs. mocked it is. Cross-reference [BACKEND.md](./BACKEND.md) and [AI_LLM.md](./AI_LLM.md) for the underlying implementation of anything AI-generated or backend-driven.

## World Map

`WorldMap.tsx` renders `data/realmsData.ts` (client-side static data — the only realm content that's hand-authored rather than AI-generated) as an SVG bezier-curve node graph. One realm is currently defined ("EPIC 17-POINT CODE REALM," 17 nodes). Each node client-side-generates **100 sub-levels** (`generate100SubLevels()`) — every 10th is a bug hunt, every 25th a speedrun, the 100th a boss fight. A node unlocks the next only once **75 of its 100 sub-levels are completed** — a deliberately grindy pacing mechanism built from a tiny (17-object) source data file. Clicking a node opens `NodeDetailModal.tsx` (paginated in blocks of 25) to pick a specific sub-level.

## Challenge Editor — the core gameplay loop

`ChallengeEditor.tsx` fetches an **AI-generated** challenge (title, story, test cases, hints) from `GET /challenges/generate` on mount, parameterized by node/skill-rating/sub-level. Monaco editor with Run/Submit/Swap/Reset controls, live per-test-case pass/fail, confetti + XP/coin/star reward toast on submit, and an AI feedback modal after grading. The right-hand rail is `AITeacherPanel.tsx` (see [AI_LLM.md](./AI_LLM.md)). "Swap Question" regenerates an alternate via the question-set mechanism (0 additional LLM calls if a set already exists).

## Boss Fight

`BossFight.tsx` — a 3-phase encounter where each phase's challenge is independently AI-generated at escalating skill rating. Boss/player HP bars; a wrong answer deals damage back to the player (the player can lose); a correct answer deals 1000 damage per phase. Uses a plain `<textarea>`, not Monaco — a notably cruder editing experience than the main Challenge Editor despite being a more dramatic moment.

## Code Duels

`CodeDuel.tsx` + `AIOpponentsSelector.tsx` — a 150-second timed 1v1 against a selectable bot. **Despite the "AI Opponents" name, this is not LLM-driven**: six bots (Rookie/Logic/Speed/Debug/Algorithm/Architect Bot) with fixed rating/win-rate/specialty strings are hardcoded client-side in `AIOpponentsSelector.tsx`. The opponent's "progress" during a duel is simulated with client-side `Math.random()` ticks, not a real competing solve. Elo change and XP are awarded on win/loss/timeout.

## Championship

`Championship.tsx` is **entirely decorative** — a fully hardcoded mock bracket (qualifiers/semifinals/finals) with fabricated opponent names ("CipherLord," "ByteNinja"). There is no bracket API, no real tournament backend. Clicking "Enter Finals Match" simply switches the active tab to Duel.

## Leaderboards

`Leaderboards.tsx` performs a real fetch to `GET /leaderboards/global` (Redis-cached 5 minutes server-side), falling back to a single-entry self-leaderboard on error. Top-3 podium + ranked table. Filter tabs for Global/Country/Guild/Weekly exist in the UI, but **all four call the identical `/leaderboards/global` endpoint** — the segmentation is visual only. The backend query hardcodes an exclusion list for test-account username/email patterns (`admin%`, `%@test.com`, `explorer_%`, etc.), implying seed/test data has repeatedly leaked into what's otherwise treated as the production leaderboard.

## Developer HQ

`DeveloperHQ.tsx` + `AchievementGallery.tsx` — four sub-tabs:
- **Workspace**: HQ tier progression (6 tiers: Room → Tech Empire) with real `api.upgradeHq()`/passive-income-claim calls, each tier unlocking buildings that grant passive daily coin income.
- **Companion**: pet evolution (5 stages, flat 500-coin cost per stage) via `api.upgradePet()` — the pet, "Pyra" the dragon, is also reflected in the HUD.
- **Achievements**: 10 achievements computed **client-side, live**, from real profile stats — a different, richer set than the one seeded in `data/achievementsData.ts` (see [DEAD_CODE.md](./DEAD_CODE.md) for why two systems exist).
- **Briefing**: an AI-generated daily personalized "mission" via the mentor chat endpoint.

## Admin

Two separate near-duplicate UIs coexist (see [DEAD_CODE.md](./DEAD_CODE.md) for detail):
- **`AdminDashboardPortal.tsx`** — the actual full-page portal admins/super_admins land on at login (dark executive-dashboard styling): Overview, Users, Content moderation queue, Feedback triage, AI/LLM usage dashboard, Logs. Backed by the genuinely-implemented `admin.py` permission model (see [BACKEND.md](./BACKEND.md)).
- **`AdminConsole.tsx`** — an earlier, simpler admin UI still reachable as a normal tab inside the gamified shell, used for the "Preview Student View" round-trip.

## AI Teacher / AI Companion

See [AI_LLM.md](./AI_LLM.md) for full implementation detail. Two distinct chat surfaces share the same Hint/Explain/Socratic/Demonstrate mode pattern: `AITeacherPanel.tsx` (embedded, challenge-scoped) and `AICompanionModal.tsx` (global slide-in drawer, own chat history in `GameContext.aiChatMessages`).

## Settings

`SettingsModal.tsx` — language/skill-level/title preference editor, theme toggle (light/dark, real and functional, driven by `GameContext`), feedback shortcut. POSTs to `/auth/onboarding` (reuses the onboarding endpoint for updates rather than a dedicated settings endpoint).

## Feedback

`FeedbackModal.tsx` — category + star-rating + message submission, plus a "My Reports" tab showing status (pending/in-progress/resolved) with admin fix notes visible to the user. A genuinely complete bug-report loop end-to-end, wired to both `user.py`'s and `admin.py`'s feedback endpoints.

## Legal

`LegalModal.tsx` — static Privacy/Terms/FAQ content, no backend calls, accordion FAQ layout.

## Practice & Contests (backend-supported, lighter frontend presence)

- **Practice** (`practice.py`): adaptive (Elo-banded) or revision (mistake-log-driven) problem recommendation; a 3-question diagnostic quiz whose grading is a placeholder string match (`answer.lower() == 'a'`); a mock-interview mode that spins up a private, time-boxed `Contest` row.
- **Contests** (`contests.py`): list/join/submit, flat +100-point scoring per solve regardless of time or partial credit, an "anti-cheat" timer check that's a hardcoded constant and can therefore never actually trigger.

## Gamification systems

See [BACKEND.md](./BACKEND.md#services) and [GAPS_PLAN_VS_REALITY.md](./GAPS_PLAN_VS_REALITY.md) for implementation detail. Summary of what's rendered in the UI:

| Mechanic | Where it shows up |
|---|---|
| XP + level (with next-level threshold, level-up toast) | HUD (`Sidebar`/`HeaderBar`), Challenge Editor reward toast |
| Coins, stars | HUD, HQ/pet upgrade screens |
| Daily streak | HUD; drives the pet's "mood" in Developer HQ |
| Rank tier + Elo (`rank_rating`, 10-tier enum Bronze → "Code Champion") | HUD, Leaderboards |
| Pet companion ("Pyra" the dragon, 5 evolution stages) | Developer HQ |
| Developer HQ base-building (6 tiers, passive income) | Developer HQ |
| Achievement badges (two parallel lists — see [DEAD_CODE.md](./DEAD_CODE.md)) | Developer HQ → Achievements tab |
| Per-node/per-sub-level star ratings (0–3) | World Map, Node Detail Modal |

All of the HUD elements above are rendered redundantly in both `Sidebar.tsx` and the now-orphaned `Navbar.tsx` — see [DEAD_CODE.md](./DEAD_CODE.md).
