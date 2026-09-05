# Code Realm — Product & Innovation Strategy

This folder is the product-improvement companion to [`docs/audit/`](../audit/) (the technical audit of what's actually implemented). Where the audit answers "what does the code do," this folder answers "what should we build next, and why" — grounded in that audit, not in assumptions. **Nothing has been implemented from this plan** — it's the plan to review before anything changes.

Code Realm today is a gamified programming-education app with a genuinely strong core loop (AI-generated challenge → Monaco editor → instant graded feedback → reward) sitting alongside several features that look real but aren't (a simulated Duel opponent, a fully mocked Championship bracket) and real infrastructure that's built but disconnected (a proper execution sandbox, a centralized LLM gateway). The throughline across this whole plan: **most of the highest-leverage work is finishing and wiring what's already been started, not inventing new systems from scratch.**

## How to read this folder

| File | What's in it |
|---|---|
| [MODULE_REVIEW.md](./MODULE_REVIEW.md) | Every screen and backend service reviewed individually — current functionality, quality rating, problems, improvement opportunity |
| [PROBLEMS.md](./PROBLEMS.md) | Every identified problem, categorized Critical → Low, with root cause and recommended fix |
| [QUICK_WINS.md](./QUICK_WINS.md) | Cheap, low-risk, high-value fixes — mostly single-file changes |
| [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md) | Dashboard, error states, mobile, accessibility |
| [GAMEPLAY_LOOP.md](./GAMEPLAY_LOOP.md) | The current core loop, what's engaging about it, what's missing at the meta layer |
| [NEW_GAME_MODES.md](./NEW_GAME_MODES.md) | 15 new game mode proposals, several building on schema groundwork that already exists |
| [AI_FEATURES.md](./AI_FEATURES.md) | 12 AI feature proposals — coaching, code review, generation, interview prep |
| [PERSONALIZATION.md](./PERSONALIZATION.md) | How the app can adapt to each user using data it already collects and throws away |
| [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) | Fixing the fake Duels/Championship, friends, teams, real leaderboard segmentation |
| [PERFORMANCE.md](./PERFORMANCE.md) | Frontend, backend, and LLM-latency optimization opportunities |
| [SECURITY.md](./SECURITY.md) | Prioritized security fix list (cross-referenced with the audit) |
| [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) | Wiring the sandbox, the LLM gateway, a RewardService, resolving the Mongo question |
| [ANALYTICS.md](./ANALYTICS.md) | What to measure and why |
| [MONETIZATION.md](./MONETIZATION.md) | Ethical monetization models that don't gate core learning |
| [MOONSHOTS.md](./MOONSHOTS.md) | 12 ambitious, differentiated ideas — full Feature/What/Why/How/Risk template |
| [PRIORITIZATION.md](./PRIORITIZATION.md) | Every recommendation scored on Impact/Effort/Risk and ranked P0–P3 |
| [ROADMAP.md](./ROADMAP.md) | Week-by-week plan from Week 1 through "Future" |
| [TOP10.md](./TOP10.md) | The 10 highest-value changes, each with dependencies called out |

## The headline finding

Almost everything needed to make Code Realm genuinely differentiated already half-exists in the codebase:

- A properly sandboxed Docker code executor is fully built (`core/worker.py`) and never invoked — live execution is unsandboxed `subprocess`.
- A centralized LLM gateway with usage logging is fully built (`llm_gateway_service.py`) and never called — the admin cost dashboard permanently shows zero.
- Per-language and per-topic skill mastery is tracked on every submission (`user_language_mastery`, `user_topic_mastery`) and only ever read for leaderboard filtering — real personalization data, thrown away.
- The challenge schema already anticipates modes beyond what's shipped (`detective`, `mystery`, `build`, `explain` types exist in the plan the schema was built from) — several "new" game modes in [NEW_GAME_MODES.md](./NEW_GAME_MODES.md) may be UI work away from shipping, not full builds.

The plan in this folder is organized around that finding: stabilize and wire what exists first (Weeks 1–4 in [ROADMAP.md](./ROADMAP.md)), then layer genuine multiplayer, personalization, and new content on top of a foundation that's actually trustworthy.

## Existing vs. improvement vs. new vs. experimental

Per the review's own ground rules, every recommendation in this folder is tagged as one of:
- **Existing functionality** — already shipped, described in [MODULE_REVIEW.md](./MODULE_REVIEW.md) and the audit
- **Improvement** — a fix or enhancement to something that already exists
- **New feature** — genuinely new capability, scoped and estimated
- **Experimental idea** — a moonshot worth exploring but not yet validated

This distinction is kept explicit throughout rather than presenting all three as equivalent asks.
