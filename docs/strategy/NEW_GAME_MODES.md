# New Game Modes

**Grounded finding worth repeating**: the schema behind Code Realm's challenges defines a `type` field with values `puzzle, battle, bughunt, detective, mystery, speedrun, build, boss, explain` — but only `puzzle`/`boss`/`bughunt` (every 10th sub-level)/`speedrun` (every 25th) are actually surfaced as distinct gameplay in the World Map today. `detective`, `mystery`, `build`, and `explain` may already be closer to shippable than a from-scratch mode would be — confirm what the column already accepts before treating the ideas below as full builds rather than UI + content work.

Each mode below is tagged **New** (genuinely new build), **Extends** (builds on an existing type/mechanic), or **Fixes** (repairs something already shipped but fake).

## 1. Debugging Arena — *Extends `bughunt`*
Broken code with hidden bugs, limited time, limited attempts, difficulty scales with bug count/subtlety. Reuses the existing grading pipeline entirely; the work is prompt engineering and a new mode wrapper, not new infrastructure.

## 2. Code Battle — *Fixes Code Duels*
Two players get the same problem; win by correctness → execution time → memory, in that order — all three are already recorded per-submission in `code_submissions`. See [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) for the async-first build path that avoids realtime infrastructure.

## 3. Code Survival — *New*
Continuously escalating problems; one mistake costs a life or reduces score. Needs the adaptive-difficulty engine from [PERSONALIZATION.md](./PERSONALIZATION.md) to feel fair rather than arbitrary — shipping this before adaptive difficulty risks feeling punishing rather than exciting.

## 4. Boss Challenge, extended — *Extends Boss Fight*
Take the architecture doc's own 5-stage example (fix data model → implement API → optimize query → fix security issue → handle edge cases) and map it onto the existing 3-phase Boss Fight mechanic for a "final boss" tier per realm.

## 5. Code Detective — *Extends `detective`*
A small, realistic broken multi-file mini-app with logs, API responses, and failing tests. The ask is root-cause identification, not just a patch — the highest-differentiation mode on this list relative to typical LeetCode-style platforms, and closest to what real on-call debugging actually feels like.

## 6. Code Escape Room — *New*
A chain of small puzzles gating a "room," fitting the World Map's existing node/sub-level visual language almost directly — could ship as a special node type rather than a whole new screen.

## 7. Reverse Engineering Challenge — *New, cheap*
Input/output pairs only, no source given; the user must reproduce the behavior. Reuses the existing test-case grading engine unchanged — this is purely new content, no new infrastructure.

## 8. Optimization Challenge — *New, cheap*
Working code is given; score on correctness AND execution time/memory. Both `execution_time_ms` and `memory_used_kb` are already captured per submission and simply never used for scoring today — this is a scoring-formula change plus new content, not a new pipeline.

## 9. Refactoring Challenge — *Extends `build`*
Ugly-but-correct code in; graded partly by the AI Code Reviewer rubric ([AI_FEATURES.md](./AI_FEATURES.md) item 2) rather than tests alone — this is the mode most worth pairing with a real code-quality scoring feature since "does it pass" alone can't grade a refactor.

## 10. Speedrun, standalone — *Extends existing speedrun sub-levels*
Currently just every 25th sub-level inside a node; promote it to a first-class mode with a visible countdown and its own leaderboard segment (see [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md)).

## 11. Explain Mode — *Extends `explain`*
The user must write a plain-language explanation of a given piece of code (or their own prior solution) before/instead of writing new code — graded by the AI Mentor. Doubles as the anti-cheat mechanic described in [MOONSHOTS.md](./MOONSHOTS.md)'s "Explain to Pass."

## 12. Mystery Mode — *Extends `mystery`*
A challenge with a deliberately incomplete spec — the user must ask the AI Mentor clarifying questions before the full problem is revealed, closer to how a real, vague engineering ticket actually arrives. Genuinely differentiated and directly reuses the existing AI Mentor chat infrastructure.

## 13. Live Refactor Chain — *New, higher effort*
A sequence of small refactors where each stage's starting code is the previous stage's submitted solution — rewards consistent code quality across a session rather than one-off correctness, and naturally produces "Time Capsule"-style history data (see [MOONSHOTS.md](./MOONSHOTS.md)).

## 14. System Design Sketch — *New, higher effort, high differentiation*
A lightweight, text/diagram-based system-design mode ("design a rate limiter," "design a URL shortener") graded by the AI Mentor against a rubric rather than test cases — extends the product beyond pure algorithmic coding into the skill area (`System Design`) already listed in the personalization skill categories but currently untouched by any actual gameplay.

## 15. Daily Challenge — *New, cheap, high retention value*
One shared challenge per day, same for every user, with a dedicated leaderboard for that day only. Reuses the existing generation pipeline (generate once, serve to everyone) and the existing leaderboard infrastructure — mostly a scheduling and UI change, directly supports the missions system in [ROADMAP.md](./ROADMAP.md).
