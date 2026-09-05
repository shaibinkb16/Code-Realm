# Personalization

## The core opportunity

The single highest-leverage personalization opportunity in the entire codebase costs almost nothing on the backend: `user_language_mastery` and `user_topic_mastery` are already written on every submission and are currently only read for leaderboard filtering. This is a case of data collected and thrown away, not data that needs to be newly captured.

## What to build

### 1. A real per-skill breakdown UI
Surface the existing mastery tables as a visible radar/bar breakdown:

```
Algorithms       ███████░░░ 72%
Debugging        █████████░ 91%
Backend          ██████░░░░ 60%
Database         █████░░░░░ 50%
System Design    ███░░░░░░░ 30%
```

This is a frontend change plus one new read endpoint — not a data-model change. It should live on the new dashboard/home strip proposed in [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md) and in Developer HQ.

### 2. Mastery-driven challenge recommendation
`/practice/recommend` currently only bands on global Elo. Feed it the same per-topic mastery data so "recommended next challenge" targets a user's actual weakest tracked topic, not just their overall skill band. This is the same underlying change needed for [AI_FEATURES.md](./AI_FEATURES.md) item 3 (mastery-aware generation) — both should be built together.

### 3. Mastery-driven mission/quest content
Once a missions system exists ([ROADMAP.md](./ROADMAP.md)), generate a user's specific weekly quest content from their weakest topics rather than a fixed list for everyone.

### 4. A real diagnostic on day one
Replace the placeholder onboarding skill-level question with a short adaptive diagnostic ([AI_FEATURES.md](./AI_FEATURES.md) item 9) that seeds real per-topic mastery immediately, instead of starting every new user's mastery data from a blank slate that only fills in after dozens of submissions.

## What NOT to build yet

Full behavioral personalization (adjusting UI density, notification cadence, pacing based on inferred attention/fatigue signals) is a reasonable future direction but not justified until the basic skill-mastery personalization above is shipped and validated — it would add real complexity (more state, more edge cases, harder to debug "why did the user see this") for a payoff that's speculative until the simpler version proves out.

## Why this is different from a generic "add personalization" ask

Unlike most personalization proposals, none of the recommendations above require new instrumentation, new consent flows, or new data collection — the mastery tables are already populated by existing gameplay. The entire cost here is in reading and acting on data that already exists, which is exactly why it's prioritized highly in [PRIORITIZATION.md](./PRIORITIZATION.md) and [TOP10.md](./TOP10.md).
