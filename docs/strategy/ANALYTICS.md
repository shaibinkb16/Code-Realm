# Analytics

## Core product metrics

- **DAU / session length** — standard, currently not instrumented anywhere found in the audit.
- **Challenge completion rate** — pass rate per challenge, segmented by difficulty band.
- **Drop-off by node/sub-level** — watch the World Map's 75/100 completion gate specifically; it's a deliberate friction point worth measuring closely, since it's exactly the kind of grind mechanic that can either build satisfying momentum or cause silent churn depending on tuning.
- **Retry rate per challenge** — feeds directly into the architecture doc's own `quality_score` concept, which is defined in the `challenges` table schema but never actually computed anywhere in the code today. This is a case where the schema already anticipated the metric; only the computation is missing.
- **Hint-usage rate by AI Teacher mode** (Hint/Explain/Socratic/Demonstrate) — tells you whether users are learning or just extracting answers, and which mode framing actually gets used.
- **Difficulty-band distribution of submissions** — are users actually spread across skill bands, or clustering at one band regardless of true skill? Directly validates whether the adaptive-difficulty work in [PERSONALIZATION.md](./PERSONALIZATION.md) is working once shipped.
- **Session length and return frequency**, segmented by whether a user has an active streak — validates whether streak mechanics are actually driving the return behavior they're designed for.

## The foundational, two-birds-one-stone item

Populate `llm_usage_logs` by wiring the LLM Gateway (see [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md)). This single change unlocks real LLM cost/volume/latency analytics on an admin dashboard that already exists today and currently always reports zero regardless of actual Gemini/Groq traffic — no new dashboard work required, only a data source.

## Feature-specific analytics worth adding once new features ship

- **Duels/Championship (once real)**: match completion rate, win-rate distribution by rating band (validates the matchmaking/scoring is fair), abandonment rate mid-match.
- **Missions/quests (once built)**: daily/weekly completion rate, which mission types get skipped most often.
- **AI Code Reviewer (once built)**: correlation between review scores and actual mastery improvement over time — the single best signal for whether the feature is teaching anything or just producing a number.

## What to avoid collecting

Per the product's own educational framing, avoid collecting anything beyond what's needed to answer the questions above — no fine-grained keystroke telemetry, no unnecessary device fingerprinting, no personal data beyond what auth already requires. Analytics here should measure learning and engagement outcomes, not surveil behavior for its own sake.
