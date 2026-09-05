# Gameplay Loop Analysis

## The loop today

```
Start                World Map, no surfaced "what should I do today"
   ↓
Pick challenge       Open a map node → AI-generates (or fetches) a challenge at the node's skill band
   ↓
Solve                Monaco editor, Run for immediate per-test feedback
   ↓
Evaluate             Server-side grading (currently unsandboxed — see PROBLEMS.md)
   ↓
Reward               XP/coins/stars, confetti, Elo change (positive-sum only)
   ↓
Continue             HQ/pet coin sink, next node — no daily/weekly structure pulling the user back tomorrow
```

## What's working

The moment-to-moment loop is genuinely engaging: fast feedback, a real code editor, confetti, sound, and an immediate reward on success. This is the hardest part of a coding-education product to get right, and Code Realm's Challenge Editor gets it right. The 100-sub-level-per-node structure gives a strong sense of continuous, granular progress even though it's generated from a small amount of source data — a good design decision worth preserving as new content is added.

## What's missing at the meta layer

Three concrete gaps separate "fun in the moment" from "a reason to come back tomorrow":

### 1. Elo is a one-way ratchet
Wins award `max(1, change)`, losses award 0. This means rating stops feeling earned once a user plateaus — there's no real risk, so no real reward either. A rating that can only go up eventually reads as a participation counter, not a skill signal. Fixing this is a design choice, not just a technical one: a fully symmetric Elo might feel punishing in an educational context, so the recommendation is a middle ground — small, capped downside on loss (e.g. losses cost up to half of what an equivalent win would grant) rather than either extreme.

### 2. No daily/weekly mission structure
There is currently no server-side concept of "today's mission" or "this week's quest." The Developer HQ's daily "briefing" is AI-generated flavor text, not a structured, trackable set of goals. This is one of the highest-leverage retention mechanics missing from the product — see [NEW_GAME_MODES.md](./NEW_GAME_MODES.md) and [ROADMAP.md](./ROADMAP.md) for the proposed missions system.

### 3. The competitive/social modes are fake
Code Duels and Championship both look like social pull mechanics but currently involve no other real person or real competition. A user who figures this out has no reason to treat "beating the leaderboard" or "winning a duel" as a real accomplishment. See [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) for the fix path.

## Recommended loop, once the above lands

```
Start                Dashboard strip: streak, today's mission, recommended next challenge (mastery-aware)
   ↓
Pick challenge       World Map OR a mission-driven suggestion OR a new mode (Debugging Arena, Detective, etc.)
   ↓
Solve                Monaco (consistently, across all modes)
   ↓
Evaluate             Sandboxed execution + AI Code Reviewer rubric (not just pass/fail)
   ↓
Reward               XP/coins/stars via a centralized, idempotent RewardService; Elo with real (capped) downside
   ↓
Reflect              AI post-mortem: what was slow, what to drill next (see MOONSHOTS.md)
   ↓
Continue             Mission progress updates, mastery radar updates, real social signal (async ghost race result, leaderboard movement)
```

The change from today's loop to this one is almost entirely additive — nothing about the working Challenge Editor core needs to be rebuilt, only extended.
