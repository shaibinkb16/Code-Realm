# AI / LLM Subsystem

Every "AI" feature in Code Realm — question generation, the AI Mentor, career advice, code feedback — ultimately calls into one 159-line file, `backend/app/core/llm_client.py`. This is **not** the centralized `LLMGateway` the master architecture doc describes; that gateway exists in code but is unreachable (see below).

## Providers & the real fallback cascade

1. **Tier 1 — Gemini.** Raw `httpx` POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` — no Google SDK. Model cascade: the `GEMINI_MODEL` env var (default `gemini-3.6-flash`) tried first, then hardcoded fallbacks `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`. **None of these version strings correspond to any Gemini model ever publicly released** as of this writing — they read as placeholder/aspirational model IDs rather than verified production names.
2. **Tier 2 — Groq.** Raw REST to `api.groq.com/openai/v1/chat/completions`, cascading through `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `groq/compound-mini`, `openai/gpt-oss-20b` at a flat temperature of 0.7.
3. **Tier 3 — "Built-in Local Engine."** Not a model at all: `generate_local_offline_response()` returns a hardcoded canned markdown string (text mode) or a single fixed JSON challenge object (JSON mode). The name ("Local Core Model Generator") reads as a deliberate obfuscation of the fact that it's a string literal — this is the true last-resort fallback.

Retry logic is a flat sequential `for`/`try-except` loop over all Gemini models, then all Groq models, sharing one 15-second timeout, no exponential backoff, no per-provider circuit breaker or state tracking. It's a linear cascade, not the stateful breaker the architecture doc calls for — though it does genuinely give the app zero-downtime behavior for demos, since Tier 3 always returns *something*.

Env vars: `AI_API_KEY` (Gemini key, despite the generic name), `GROQ_API_KEY`, `GEMINI_MODEL`.

## The real LLM Gateway is dead code

`backend/app/services/llm_gateway_service.py`'s `LLMGatewayService` implements exactly what the architecture doc describes: usage logging to `llm_usage_logs`, request IDs, latency tracking. **Nothing in the codebase calls it** — grepping the whole backend, the only match is its own class definition. `ai_mentor_service.py`, `career_service.py`, and (transitively) `question_bank_service.py` all call `call_llm_with_fallback()` directly, bypassing the gateway entirely.

Consequence: the admin `GET /admin/llm/usage` dashboard computes a real cost formula (`total_tokens × $0.00000015`) and a mentor-call-count widget against a table that is structurally guaranteed to be empty — a polished, seemingly production-grade analytics feature sitting on top of nothing.

## AI Mentor

`backend/app/services/ai_mentor_service.py` (462 lines) powers both:
- `AITeacherPanel.tsx` — in-challenge side panel (Hint / Explain / Socratic / Example modes) via `POST /ai/mentor/guidance`.
- `AICompanionModal.tsx` — global slide-in chat drawer ("AI Game Master & Tutor") via `POST /ai/mentor/chat`.

**Context actually assembled** (much thinner than the architecture doc's "constructed User Learning Context"): the user message truncated to 1,500 characters, a hardcoded instruction string per mode, the user's numeric skill rating (`UserProfile.rank_rating`, default 1000), and — guidance route only — the last 3 `MistakeLog` rows concatenated as `"{error_type}: {error_message}"`. No conversation history, no curriculum/progress graph.

**"Safety"**: a literal five-phrase substring blocklist (`"ignore previous instructions"`, `"system prompt"`, `"bypass security"`, `"drop table"`, `"sql injection"`) checked against the lowercased message. This is keyword matching, not structural prompt-injection defense — it does not delimit SYSTEM/USER content, and is trivially defeated by paraphrasing.

There is also a second, separate hand-written canned-response engine (`_generate_dynamic_tutor_fallback`) keyed on substring matches like `"briefing"`, `"loop"`, `"recursion"`, `"hint"`, used only when the entire `call_llm_with_fallback` call raises an exception — a fairly narrow window, since Tier 3 in `llm_client.py` already returns a string instead of raising.

`generate_challenge`/`generate_challenge_batch`/`generate_feedback` build large prompt templates asking Gemini for JSON challenges or code-review feedback. JSON is parsed with plain `json.loads()` plus manual `if field not in challenge: raise ValueError` checks — **no Pydantic schema validation**, despite the architecture doc's explicit "structured Pydantic outputs" requirement. On any parse/validation failure, the service falls back to a hardcoded set of 1–3 canned challenges (e.g. "sum 1 to n", "factorial") baked directly into the file.

The mentor's AI Teacher panel footer displays a static line — *"Learner Preference: Hands-on preference: High • Hint usage: Minimal"* — that is **hardcoded text, not derived from any real user data**.

## Question / challenge generation

`backend/app/services/question_bank_service.py` is the best-built piece of the AI stack:

- **Real Redis double-checked locking**: DB check → acquire `SET NX EX 15` lock keyed `question_generation_lock:{node_id}:{language}:{difficulty}` → if not acquired, poll the DB every 0.2s for up to ~4s waiting for the winner → re-check DB inside the lock → generate → persist → release in `finally`. This matches the architecture doc's design faithfully — 100 simultaneous requests for the same empty node correctly trigger exactly one generation call.
- **`format_challenge_public()`** does real DTO-boundary protection: strips hidden test cases (`is_hidden=True`) and canonical solutions before the payload ever reaches a client — a legitimately well-built security boundary.
- **No semantic duplicate detection** beyond "does a `QuestionSet` already exist for this node/lang/difficulty" — no similarity check across generated content.

## Career recommender

`backend/app/services/career_service.py`: four LLM-backed endpoints (`recommend`, `sprint-tickets`, `interview/question`, `interview/evaluate`), each a thin prompt-template-then-`json.loads()` wrapper around `call_llm_with_fallback(..., json_mode=True)`, each with a hardcoded single-item fallback on exception (e.g. always "Full-Stack Developer" as the fallback career). **No persistence** — recommendations are generated fresh per request, never stored against the user.

## Memory/RAG subsystem

`backend/app/services/memory_service.py` — despite living under an "intelligence" umbrella, this is a **codebase-indexing feature** (Cursor/Copilot-style project index), not per-user learning memory, and it's the least "AI" of all these features:

- `ingest_project`: walks a **filesystem path on the server**, default `root_path: str = "e:/Dream"` (hardcoded in `api/v1/memory.py`) — an obvious leftover from the original developer's local Windows machine, not something meaningful in a deployed container. Hashes files with SHA-256, diffs against `FileIndex` rows.
- `index_file`: its own docstring admits *"In a production system, this would call an LLM to generate summaries and extract graph edges"* — no LLM call actually happens. Symbol extraction is a naive line-by-line string check (`line.startswith("def ")`), not an AST/tree-sitter parse.
- `build_context`: calls itself a "Semantic/Keyword Search Phase," but a code comment admits it's *"Mocked as naive keyword for MVP without pgvector"* — it's literally a substring match on file paths (`if any(term in f.file_path.lower() for term in terms)`), no embeddings, no pgvector.
- `KnowledgeGraphEdge` and `SemanticMemory` models exist but are never written to or read from anywhere in the service — pure unused schema.
- This whole subsystem (`/memory/*` in `api/v1/memory.py`) is not wired into the AI Mentor's context construction at all — it's an entirely separate, unrelated feature.

## Frontend AI-facing features

| Component | What it actually is |
|---|---|
| `AITeacherPanel.tsx` | Real backend calls to `/ai/mentor/guidance`, 4 modes, hand-rolled markdown-ish renderer, static (non-data-driven) "learner preference" footer |
| `AICompanionModal.tsx` | Real backend calls to `/ai/mentor/chat` via `GameContext.sendAiMessage`, its own chat history, quick-prompt chips |
| `AIOpponentsSelector.tsx` | **Not LLM-driven at all** — 6 duel bots (Rookie/Logic/Speed/Debug/Algorithm/Architect Bot) with fixed rating/win-rate/specialty strings hardcoded client-side. No backend call despite the "AI" in the name. |

## Structured output summary

No Pydantic-schema-enforced LLM output exists anywhere in the system. Every "JSON mode" call is prompted with an inline JSON-schema description in the text prompt, then parsed via bare `json.loads()` with manual presence checks — ad hoc, not `pydantic`/`instructor`/function-calling based, despite the architecture doc's explicit description of structured, validated outputs.
