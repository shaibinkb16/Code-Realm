# AI Features

## 1. Deepen the AI Coding Coach
Today's mentor context is a 1500-character truncated message + skill rating + last 3 mistakes. Add a real hint-ladder state machine — hint → guiding question → partial reveal → full reveal — gated by attempt count and elapsed time, not just a mode-selector button the user can immediately jump to "reveal."

## 2. AI Code Reviewer with a scored rubric
Replace the current free-text "feedback" with a structured score across correctness / performance / readability / security / maintainability, shown after every submit. Reuses the existing `/challenges/feedback` endpoint — the change is a response schema, not a new pipeline. Directly enables the Refactoring Challenge mode ([NEW_GAME_MODES.md](./NEW_GAME_MODES.md) #9).

## 3. Mastery-aware difficulty generation
The Redis-locked generation pipeline in `question_bank_service.py` already exists and works well; feed it `UserTopicMastery`/`MistakeLog` data instead of just a global skill band, so generated challenges target a user's actual weak areas.

## 4. AI Bug Generator
Add a `bug_type` parameter (race condition, off-by-one, SQL injection, memory leak, incorrect validation, API timeout) to the existing challenge-generation call, purpose-built for the Debugging Arena mode.

## 5. Real multi-turn AI Interview Mode
`career_service.py`'s interview endpoints are currently one-shot question/evaluate calls with no continuity. Extend into an actual back-and-forth conversation — follow-up questions, architecture questions, a final holistic evaluation — closer to a real technical interview.

## 6. Real structured LLM outputs
Replace every ad hoc `json.loads()` + manual field-presence check with Pydantic-schema-forced generation. This is foundational: nothing else in this list is fully reliable until malformed LLM output is rejected-and-retried rather than silently patched with hardcoded fallback content.

## 7. Turn on the LLM Gateway
`LLMGatewayService` already implements usage logging and centralized retry/circuit-breaking logic — it just has zero callers today. Pointing the mentor, career, and question-generation services at it is a refactor, not a new build, and it's the prerequisite for real LLM cost analytics (see [ANALYTICS.md](./ANALYTICS.md)).

## 8. Data-grounded daily briefing
Developer HQ's "Briefing" tab is already AI-generated flavor text; ground it in real topic-mastery deltas ("you improved 8% on recursion this week, here's what's next") instead of generic copy — the data already exists, this is a prompt-construction change.

## 9. Adaptive placement diagnostic
`/practice/diagnostic` currently grades with a literal string match (`answer.lower() == 'a'`). Replace with a short, LLM-graded adaptive diagnostic that seeds per-topic mastery on day one instead of a single onboarding Elo guess.

## 10. AI-narrated boss lore
Cheap, high delight-per-token: generate short narration between boss phases that reacts to how close the player came to losing that phase — reuses the existing generation pipeline unchanged, pure content/flavor addition.

## 11. AI Post-Mortem retros
After a boss fight, duel, or difficult challenge, generate a short, specific retro ("you spent 40 seconds re-deriving the recursion base case — here's a targeted drill for that") using data already captured in submission history. Cheap to build on the existing mentor/feedback pipeline; likely the single highest delight-per-engineering-hour AI feature on this list. Also proposed as a moonshot in [MOONSHOTS.md](./MOONSHOTS.md) given its retention potential.

## 12. AI-generated personalized weekly quest content
Once the missions/quest system exists (see [ROADMAP.md](./ROADMAP.md)), use mastery/mistake data to generate the specific set of challenges that make up a given user's weekly quest, rather than a single fixed quest for everyone — turns a static feature into a personalized one for a relatively small incremental cost once the underlying mission system and mastery-aware generation (#3) both exist.

---

**Foundational note**: items #6 and #7 above are prerequisites, not just parallel options — every other AI feature on this list becomes materially more reliable and measurable once structured outputs and the LLM gateway are actually in place. They're ranked accordingly in [PRIORITIZATION.md](./PRIORITIZATION.md).
