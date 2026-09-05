# Monetization

## Principle

Keep the full core loop free and unlocked: the World Map, AI-generated challenges, execution/submission, and leaderboards should never be paywalled. Monetize depth and convenience, not the ability to learn or progress — paywalling anything on that list would directly undercut the product's own reason to exist.

## Recommended models

### Premium AI Coach tier
Deeper mentor context (see [AI_FEATURES.md](./AI_FEATURES.md) item 1) and unlimited AI Interview Mode sessions. This tier is naturally cost-aligned since it's LLM-usage-bound anyway — once the LLM Gateway is wired (see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md)), real per-user cost data exists to price this correctly instead of guessing.

### Cosmetic HQ/pet items
The HQ tier and pet-evolution economy already exist purely as coin sinks. Cosmetic-only premium skins/themes add revenue without touching gameplay fairness — a well-established, low-risk model in gamified products generally.

### Role-adaptive Interview Mode (premium)
Once built (see [MOONSHOTS.md](./MOONSHOTS.md) item 3), a paid tier that adapts interview tone/question style to a specific target role/company profile is a plausible premium differentiator distinct from generic interview-prep tools.

### Team/classroom plans
A plausible channel given the learning-platform framing, contingent on the social/team features in [SOCIAL_MULTIPLAYER.md](./SOCIAL_MULTIPLAYER.md) landing first — a classroom plan needs at minimum a way for an instructor to see aggregate (not individual-invasive) progress across a roster.

## Explicitly avoid

- Paywalling core challenges, execution, or submission limits.
- Paywalling the leaderboard or basic progression (XP/coins/Elo).
- Any mechanic that would make a free user feel unable to meaningfully progress — this would contradict both the product's stated goal and the "avoid manipulative engagement mechanics" principle this whole plan is built around.

## Sequencing

Monetization is explicitly a later-phase concern in [ROADMAP.md](./ROADMAP.md) — it depends on the AI Gateway being wired (for cost-aware pricing) and on real engagement data (from [ANALYTICS.md](./ANALYTICS.md)) existing to validate that a premium tier would actually be used before investing in billing infrastructure.
