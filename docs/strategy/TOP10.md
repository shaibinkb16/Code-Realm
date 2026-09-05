# Recommended Top 10

The 10 highest-value changes across this entire plan, in order, each with dependencies called out explicitly.

## Rank 1 — Wire the Docker sandbox to execution endpoints
**Why**: the security fix is already built (`core/worker.py`), just disconnected from live traffic. **Impact**: 9/10 · **Effort**: 4/10 · **Priority**: P0 · **Dependencies**: none.

## Rank 2 — Auth + remove OTP bypass + rotate secrets
**Why**: the smallest change on this entire list with the largest immediate risk reduction. **Impact**: 9/10 · **Effort**: 2/10 · **Priority**: P0 · **Dependencies**: none.

## Rank 3 — Build a RewardService with idempotency
**Why**: every economy and leaderboard number in the product is currently untrustworthy without this. **Impact**: 8/10 · **Effort**: 5/10 · **Priority**: P0 · **Dependencies**: none.

## Rank 4 — Wire the LLM Gateway
**Why**: unlocks real cost analytics and centralized retry/circuit-breaking for free — the code already exists. **Impact**: 7/10 · **Effort**: 3/10 · **Priority**: P1 · **Dependencies**: none.

## Rank 5 — Real async Code Duels
**Why**: replaces the single most visible piece of fake gameplay in the product with something real, cheaply, without realtime infrastructure. **Impact**: 8/10 · **Effort**: 5/10 · **Priority**: P1 · **Dependencies**: RewardService (rank 3), for fair, tamper-resistant scoring.

## Rank 6 — Skill-radar personalization UI
**Why**: the highest payoff-per-effort item on the entire list — the mastery data already exists, this is a read-and-display feature. **Impact**: 7/10 · **Effort**: 3/10 · **Priority**: P1 · **Dependencies**: none.

## Rank 7 — AI Code Reviewer scored rubric
**Why**: turns free-text feedback into a real, comparable learning signal, and unlocks the Refactoring Challenge mode. **Impact**: 7/10 · **Effort**: 4/10 · **Priority**: P1 · **Dependencies**: real structured LLM outputs.

## Rank 8 — Mastery-aware adaptive difficulty
**Why**: closes the biggest gap between "data we have" and "experience we deliver" in the whole product. **Impact**: 7/10 · **Effort**: 5/10 · **Priority**: P1 · **Dependencies**: skill-radar UI (rank 6) for the user-facing half; benefits from the LLM Gateway (rank 4) being wired first for reliable generation.

## Rank 9 — Daily/Weekly missions system
**Why**: the missing "reason to come back tomorrow" — new schema, but self-contained and doesn't block on anything else. **Impact**: 7/10 · **Effort**: 5/10 · **Priority**: P1 · **Dependencies**: none blocking, though richer once mastery-aware generation (rank 8) exists.

## Rank 10 — Fix or cut Championship
**Why**: a shipped feature that's fully fabricated is a trust liability either way — the recommendation is to decide and act, not to leave it as-is. **Impact**: 5/10 · **Effort**: 2/10 (cut) / 7/10 (build for real) · **Priority**: P2 · **Dependencies**: real Duels (rank 5), if building the bracket for real, since it likely reuses the same match engine at a different cadence.

---

Full scoring for every recommendation in this plan (not just the top 10) is in [PRIORITIZATION.md](./PRIORITIZATION.md); the week-by-week sequencing is in [ROADMAP.md](./ROADMAP.md).
