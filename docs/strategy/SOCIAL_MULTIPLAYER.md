# Social & Multiplayer

## Fixing what's already shipped but fake

### Real Code Duels — async "ghost race" first
Today's Duel opponent is a `Math.random()`-driven progress bar and the "AI Opponents" are hardcoded bots with fixed rating strings — no real opponent exists. The recommended first build does **not** require realtime infrastructure: race against a rival's *stored best submission* (time, from `code_submissions`) on the same problem, rendered as a "ghost" — the opponent's actual historical pace, honestly labeled as such. This ships fast, is honest about what it is, and validates whether real competitive pull actually drives retention before investing in full realtime infrastructure.

### Real Code Duels — full realtime 1v1 (later)
Once the async version validates demand, build genuine realtime matchmaking: WebSocket-based synchronization, live opponent progress, disconnect handling, and matchmaking by rating band. This is a real, substantial build (see [MOONSHOTS.md](./MOONSHOTS.md) for the "Live Boss Raid" variant at larger scale) — sequence it after the cheaper version proves the concept.

### Championship
Decide explicitly rather than leaving it mocked: either build a real bracket (natural once real Duels exist, since it's largely the same match engine run at a tournament cadence) or remove/hide it until it is real.

### Leaderboard segmentation
The frontend already has Country/Guild/Weekly filter tabs built — they currently all call the identical global endpoint. Making them real is comparatively cheap backend query work (a `WHERE` clause on country/guild, a date-windowed query for weekly) since the frontend doesn't need to change at all.

### Richer leaderboard ranking
Today's ranking is purely Elo-based. Consider factoring in accuracy, consistency, or the mastery data from [PERSONALIZATION.md](./PERSONALIZATION.md) — a leaderboard that rewards only raw rating can feel unfair to a user who's improving quickly but hasn't caught up in absolute terms yet.

## New social features

| Feature | Benefit | Complexity | Notes |
|---|---|---|---|
| Friends / follow | Medium | Medium | No social graph exists today; a prerequisite for "challenge a friend" and friends-only leaderboards. |
| Team/clan challenges | Medium — differentiator | High | Real moderation and matchmaking cost; recommend as a later-phase item once core social graph exists. |
| Code sharing / peer review | Medium, pairs well with Refactoring Challenge | Medium | Needs moderation tooling — the admin content-review queue already built for AI-generated challenges could extend to user-submitted reviews with modest changes. |
| Achievement sharing | Low–Medium | Low, once achievements are unified | Blocked on fixing the two disconnected achievement systems (see [MODULE_REVIEW.md](./MODULE_REVIEW.md)) — sharing a client-computed-only achievement that has no server record isn't meaningfully shareable. |

## Anti-cheat considerations for anything competitive

Since this product already has real risk here (unsandboxed execution, no idempotency), any new competitive mode should be built only after [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md)'s RewardService and sandboxed execution land — a real Duel or Championship built on top of the current reward/execution gaps would just add a new, higher-visibility surface for the same underlying exploits.
