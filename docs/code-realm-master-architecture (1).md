# CODE REALM — MASTER ARCHITECTURE DOCUMENT (FINAL)
### Consolidated Schema, Security, Execution, LLM, Admin, and Operations Plan

This is the single authoritative document. It merges the original production revision, the admin console addition, and the full 125-point master change list into one coherent architecture with nothing dropped.

**Priority Legend**
🔴 P0 — Must implement before production
🟠 P1 — Strongly recommended
🟡 P2 — Add when scaling
🟢 P3 — Future enhancement

---

## 1. Core Architecture 🔴 P0

```
                    ┌─────────────────────┐
                    │      Vercel         │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │      API Layer      │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        PostgreSQL           Redis          LLM Gateway
        Source of Truth      Cache/Lock     Gemini/Groq
              │
              ▼
       Question Bank
              │
              ▼
       Execution Sandbox
```

**Remove:** PostgreSQL → MongoDB emergency failover. MongoDB is not a Postgres backup — structurally different data models with no automatic sync. Use Postgres retry/backoff (`tenacity`) and your host's native replica/failover instead.

**Layering (Item 45–46):**
```
API (FastAPI router)
  ↓
Service layer (QuestionBankService, AssignmentService, ChallengeService,
                SubmissionService, ExecutionService, MasteryService,
                EloService, AchievementService, LLMService, MentorService,
                AdminService)
  ↓
Repository layer (ChallengeRepository, UserRepository, etc.)
  ↓
PostgreSQL
```
Don't put everything into one `challenges.py` file. Each service owns one responsibility.

---

## 2. Final Table List 🔴 P0

```
users                              question_sets
user_profiles                      challenges
                                    challenge_test_cases
realms
map_nodes                          user_node_assignments
                                    user_node_assignment_history
languages
topics                             code_submissions

user_language_mastery              achievements
user_topic_mastery                 user_achievements
rating_history
                                    mistake_logs
notifications                      audit_logs
outbox_events

admin_roles                        api_keys
user_admin_roles                   execution_jobs
user_sanctions                     refresh_tokens
system_settings                    rate_limit_violations
admin_action_logs                  llm_usage_logs
                                    challenge_reports
user_wallet_transactions (P2)
```

This is the full production schema — the original 15-table design plus the question-bank redesign, the admin control system, and the security/observability tables. Every table below lists its complete field set.

---

## 3. `users` 🔴

```
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
username VARCHAR(50) UNIQUE NOT NULL
full_name VARCHAR(100) NULLABLE
hashed_password VARCHAR(255) NULLABLE   -- null for OAuth-only accounts
google_id VARCHAR(255) UNIQUE NULLABLE
github_id VARCHAR(255) UNIQUE NULLABLE
auth_provider VARCHAR(50) NOT NULL DEFAULT 'local'
role VARCHAR(20) NOT NULL DEFAULT 'user'      -- legacy simple flag; real authority is user_admin_roles
is_active BOOLEAN NOT NULL DEFAULT TRUE
email_verified BOOLEAN NOT NULL DEFAULT FALSE
failed_login_attempts INTEGER NOT NULL DEFAULT 0
locked_until TIMESTAMP NULLABLE
mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE
mfa_secret_encrypted VARCHAR(255) NULLABLE
timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
deleted_at TIMESTAMP NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
last_login_at TIMESTAMP NULLABLE
last_login_ip VARCHAR(45) NULLABLE

INDEXES: UNIQUE(email), UNIQUE(username), UNIQUE(google_id), UNIQUE(github_id)
```

## 4. `user_profiles` — gameplay state kept separate from identity

```
id UUID PRIMARY KEY
user_id UUID UNIQUE NOT NULL FK users(id) ON DELETE CASCADE
title VARCHAR(100) DEFAULT 'Code Realm Explorer'
avatar VARCHAR(255)
level INTEGER NOT NULL DEFAULT 1
xp INTEGER NOT NULL DEFAULT 0
next_level_xp INTEGER NOT NULL DEFAULT 1000
coins INTEGER NOT NULL DEFAULT 100
stars INTEGER NOT NULL DEFAULT 0
streak INTEGER NOT NULL DEFAULT 1
last_activity_at TIMESTAMP NULLABLE
rank VARCHAR(30) NOT NULL DEFAULT 'Bronze'
rank_rating INTEGER NOT NULL DEFAULT 500
pet_stage VARCHAR(30) NOT NULL DEFAULT 'Baby'
pet_level INTEGER NOT NULL DEFAULT 1
hq_level VARCHAR(50) NOT NULL DEFAULT 'Room'
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
```

## 5. `realms` 🔴

```
id VARCHAR(50) PRIMARY KEY
name VARCHAR(100) NOT NULL
tagline VARCHAR(255) NOT NULL
description TEXT NOT NULL
order_num INTEGER NOT NULL INDEX
theme_color VARCHAR(20) NOT NULL
icon VARCHAR(20) NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE     -- replaces is_unlocked; unlocking is per-user, not global
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
```
> Remove global `is_unlocked` — realm/node unlocking is a per-user fact, tracked in `user_node_progress`, not a property of the realm itself.

## 6. `user_node_progress` 🟠 — achievement history, separate from active assignment

```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
node_id VARCHAR(50) NOT NULL FK map_nodes(id) ON DELETE CASCADE
status VARCHAR(20) NOT NULL DEFAULT 'locked'   -- locked, unlocked, in_progress, completed
stars INTEGER NOT NULL DEFAULT 0
best_score INTEGER NULLABLE
attempts INTEGER NOT NULL DEFAULT 0
successful_attempts INTEGER NOT NULL DEFAULT 0
first_completed_at TIMESTAMP NULLABLE
last_completed_at TIMESTAMP NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()

INDEX: UNIQUE(user_id, node_id)
```
**Why separate from `user_node_assignments`:** assignment = *what question am I solving right now*; progress = *what have I achieved on this node, historically*. Mixing these responsibilities makes both harder to reason about.

## 7. `map_nodes`

```
id VARCHAR(50) PRIMARY KEY
realm_id VARCHAR(50) NOT NULL FK realms(id) ON DELETE CASCADE
title VARCHAR(150) NOT NULL
type VARCHAR(30) NOT NULL
x_coord INTEGER NOT NULL
y_coord INTEGER NOT NULL
difficulty VARCHAR(30) NOT NULL
min_skill_rating INTEGER NOT NULL DEFAULT 300
max_skill_rating INTEGER NOT NULL DEFAULT 2500
order_num INTEGER NOT NULL
prerequisites JSON NOT NULL DEFAULT []
icon_name VARCHAR(50) NOT NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
```
> Remove the direct `challenge_id` foreign key — a node must not permanently point to one question. It points to a `question_set` (via node_id/language_id lookup), which fans out to Primary + 2 Alternates.

---

## 8. `question_sets` 🔴 NEW — the critical structural change

```
Question Set
│
├── Primary
├── Alternate 1
└── Alternate 2
```

```
id UUID PRIMARY KEY
realm_id VARCHAR(50) NOT NULL FK realms(id)
node_id VARCHAR(50) NOT NULL FK map_nodes(id)
language_id UUID NOT NULL FK languages(id)
difficulty VARCHAR(30) NOT NULL
min_skill_rating INTEGER NOT NULL
max_skill_rating INTEGER NOT NULL
generation_model VARCHAR(60) NOT NULL         -- e.g. gemini-3.6-flash
prompt_version VARCHAR(30) NOT NULL           -- e.g. question-generator-v4
generation_version INTEGER NOT NULL DEFAULT 1
status VARCHAR(20) NOT NULL DEFAULT 'pending' -- pending, validating, active, retired, failed
quality_score FLOAT NOT NULL DEFAULT 0.0
content_hash VARCHAR(64) NOT NULL             -- dedupe key from normalized title/description/behavior
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()

CONSTRAINT: UNIQUE(node_id, language_id, difficulty)
```
> If you later want multiple sets per node/language/difficulty, add a `set_number`/`version` column instead of relaxing this constraint — keep one canonical "current" set resolvable without ambiguity.

## 9. `challenges` — full rebuilt field set

```
id VARCHAR(50) PRIMARY KEY
question_set_id UUID NOT NULL FK question_sets(id) ON DELETE CASCADE
realm_id VARCHAR(50) NOT NULL
node_id VARCHAR(50) NOT NULL
language_id UUID NOT NULL FK languages(id)
alternate_index INTEGER NOT NULL DEFAULT 0    -- 0 = Primary, 1 = Alt 1, 2 = Alt 2
title VARCHAR(150) NOT NULL
type VARCHAR(30) NOT NULL INDEX               -- puzzle, battle, bughunt, detective, mystery, speedrun, build, boss, explain
difficulty VARCHAR(30) NOT NULL
min_skill_rating INTEGER NOT NULL DEFAULT 300
max_skill_rating INTEGER NOT NULL DEFAULT 2500
description TEXT NOT NULL
story_context TEXT NULLABLE
initial_code TEXT NOT NULL
language VARCHAR(20) NOT NULL
canonical_solution TEXT NULLABLE
xp_reward INTEGER NOT NULL
coin_reward INTEGER NOT NULL
explanation TEXT NOT NULL
tags JSON NOT NULL DEFAULT []
hints JSON NOT NULL DEFAULT []
generated_by VARCHAR(50) NOT NULL DEFAULT 'ai'  -- human, ai
generation_model VARCHAR(60) NULLABLE
prompt_version VARCHAR(30) NULLABLE
validation_status VARCHAR(30) NOT NULL DEFAULT 'pending'
status VARCHAR(20) NOT NULL DEFAULT 'PENDING'   -- PENDING, VALIDATING, ACTIVE, RETIRED, FAILED
review_status VARCHAR(20) NOT NULL DEFAULT 'unreviewed'  -- unreviewed, approved, flagged, retired
report_count INTEGER NOT NULL DEFAULT 0
quality_score FLOAT NOT NULL DEFAULT 0.0
content_hash VARCHAR(64) NOT NULL INDEX
usage_count INTEGER NOT NULL DEFAULT 0
swap_count INTEGER NOT NULL DEFAULT 0
last_validated_at TIMESTAMP NULLABLE
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
```

**Challenge lifecycle (never treat a generated question as immediately production-ready):**
```
PENDING → VALIDATING → ACTIVE → RETIRED
                     ↘ FAILED
```

**Validation pipeline every AI-generated challenge must pass, in order:**
```
Schema validation
   ↓
Content validation
   ↓
Canonical solution validation
   ↓
Test-case validation
   ↓
Execution validation
   ↓
Duplicate detection (content_hash)
   ↓
Quality scoring
   ↓
ACTIVE
```

**Historical integrity rule:** once a user has submitted against challenge X, never mutate its meaning. To fix a bad question, create `challenge v2` and retire v1 — mutating an already-submitted-against challenge corrupts analytics and fairness.

## 10. `challenge_test_cases` (renamed from `test_cases`)

```
id UUID PRIMARY KEY
challenge_id VARCHAR(50) NOT NULL FK challenges(id) ON DELETE CASCADE
input_data TEXT NOT NULL
expected_output TEXT NOT NULL
description VARCHAR(255) NOT NULL
is_hidden BOOLEAN NOT NULL DEFAULT FALSE
order_num INTEGER NOT NULL DEFAULT 0
timeout_ms INTEGER NOT NULL DEFAULT 5000
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```
> 🔴 **Mandatory:** the frontend/public API response must only ever include `is_hidden = false` rows. Hidden test cases never leave the backend — enforce this at the DTO layer (Section 22), not by convention.

---

## 11. `languages`

```
id UUID PRIMARY KEY
name VARCHAR(30) NOT NULL          -- python, javascript, cpp, java
display_name VARCHAR(60) NOT NULL
version VARCHAR(20) NOT NULL
runtime VARCHAR(60) NOT NULL
compile_command TEXT NULLABLE
run_command TEXT NOT NULL
timeout_ms INTEGER NOT NULL DEFAULT 5000
memory_limit_mb INTEGER NOT NULL DEFAULT 256
enabled BOOLEAN NOT NULL DEFAULT TRUE
```
> Don't hard-code runtime/compile/run commands inside Python — make language support data-driven so adding a new language is a DB row, not a deploy.

## 12. `topics`
```
id UUID PRIMARY KEY
name VARCHAR(100) NOT NULL
category VARCHAR(50) NOT NULL
```

---

## 13. `user_node_assignments` — full rebuilt field set 🔴

```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
node_id VARCHAR(50) NOT NULL FK map_nodes(id) ON DELETE CASCADE
question_set_id UUID NOT NULL FK question_sets(id)
challenge_id VARCHAR(50) NOT NULL FK challenges(id) ON DELETE CASCADE
saved_code TEXT NULLABLE
swap_count INTEGER NOT NULL DEFAULT 0
is_completed BOOLEAN NOT NULL DEFAULT FALSE
started_at TIMESTAMP NOT NULL DEFAULT utcnow()
last_opened_at TIMESTAMP NOT NULL DEFAULT utcnow()
completed_at TIMESTAMP NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()

CONSTRAINT: UNIQUE(user_id, node_id)   -- prevents two active assignments for the same user/node
```

## 14. `user_node_assignment_history` 🔴 NEW

```
id UUID PRIMARY KEY
assignment_id UUID NOT NULL FK user_node_assignments(id) ON DELETE CASCADE
user_id UUID NOT NULL FK users(id)
node_id VARCHAR(50) NOT NULL
event_type VARCHAR(20) NOT NULL   -- ASSIGNED, SWAPPED, COMPLETED, RESET
challenge_id VARCHAR(50) NOT NULL
saved_code_snapshot TEXT NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**Draft persistence architecture (don't save every keystroke):**
```
Monaco → React state → debounce 1–2 sec → PATCH API → PostgreSQL
```
Also force-save on: blur, node change, swap, submit.

**Swap flow (LLM calls: 0):**
```
Primary → Swap → Alternate 1 → Swap → Alternate 2
```
If `swap_count >= 2`, return `NO_MORE_ALTERNATES` (unless regeneration is explicitly supported later).

**Swap code-handling decision:** on swap, reset the editor to the new challenge's `initial_code`, while preserving the previous code in `user_node_assignment_history` — code written for the old problem doesn't belong attached to an unrelated new one.

---

## 15. `code_submissions` — full rebuilt field set

```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
challenge_id VARCHAR(50) NOT NULL FK challenges(id) ON DELETE CASCADE
node_id VARCHAR(50) NOT NULL
language_id UUID NOT NULL FK languages(id)
execution_job_id UUID NULLABLE FK execution_jobs(id) ON DELETE SET NULL
submission_request_id VARCHAR(100) NOT NULL UNIQUE  -- idempotency key
submitted_code TEXT NOT NULL
code_hash VARCHAR(64) NOT NULL INDEX
language VARCHAR(20) NOT NULL
status VARCHAR(30) NOT NULL          -- passed, failed, syntax_error, timeout
test_cases_passed INTEGER NOT NULL DEFAULT 0
test_cases_total INTEGER NOT NULL DEFAULT 0
execution_time_ms INTEGER NOT NULL
memory_used_kb INTEGER NULLABLE
xp_earned INTEGER NOT NULL DEFAULT 0
coins_earned INTEGER NOT NULL DEFAULT 0
stars_earned INTEGER NOT NULL DEFAULT 0
elo_before INTEGER NULLABLE
elo_after INTEGER NULLABLE
attempt_number INTEGER NOT NULL DEFAULT 1
ip_address VARCHAR(45) NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**Anti-abuse rules:**
- 🔴 All scoring (`execution_time`, `test results`, XP, coins, Elo) is calculated **server-side only** — never trust client-submitted values for any of these.
- XP is awarded **only on first successful completion** of a given challenge — resubmitting a passing solution must not farm XP.
- Elo changes are calculated server-side and stored in `rating_history`; repeated submissions against the same challenge must not let a user manipulate rating indefinitely.

---

## 16. Idempotency 🔴 — critical, applies platform-wide

Add an `idempotency_key` (or the equivalent `submission_request_id` above) to every state-mutating operation that a double-click or retry could duplicate:
- submit
- swap
- reward grants
- challenge assignment

Without this, a double-click can award 2× XP, 2× coins, 2× Elo. The server checks for an existing record with the same key before processing and returns the prior result instead of reprocessing.

---

## 17. Execution Sandbox 🔴 — one of the most important areas

Never rely on unrestricted `subprocess.run()`. Production execution requires, enforced at the sandbox level:
- CPU limit
- Memory limit
- Timeout
- Process limit
- Filesystem isolation
- Network disabled
- Non-root execution
- Output limit (truncate stdout/stderr at a fixed byte cap)
- Input limit
- Ephemeral temporary directory, destroyed after run

**Target architecture:**
```
FastAPI → Execution Queue → Sandbox Worker (Firecracker/gVisor) → Result → FastAPI
```
This protects the API server itself from being taken down by expensive or malicious execution requests — inline `subprocess` in the request thread does not belong in production.

**`execution_jobs` table** (tracks every run, replaces fire-and-forget subprocess calls):
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
challenge_id VARCHAR(50) NULLABLE FK challenges(id)
status VARCHAR(20) NOT NULL DEFAULT 'queued'  -- queued, running, completed, failed, timeout, killed
language VARCHAR(20) NOT NULL
submitted_code_hash VARCHAR(64) NOT NULL
cpu_time_ms INTEGER NULLABLE
memory_kb INTEGER NULLABLE
exit_code INTEGER NULLABLE
stdout_truncated TEXT NULLABLE
stderr_truncated TEXT NULLABLE
sandbox_runtime VARCHAR(50) NOT NULL DEFAULT 'firecracker'
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
completed_at TIMESTAMP NULLABLE
```

**Execution abuse controls:**
- Per-user execution quota
- Per-IP execution quota
- Global execution quota (protects total infra spend regardless of per-user limits)
- Auth required on `/execute/run` — anonymous code execution is the single highest-risk endpoint in the system

---

## 18. LLM Gateway 🔴

All LLM operations (Question Generator, AI Mentor, Career recommender, Code feedback) route through one `LLMGateway` — no feature calls Gemini or Groq directly.

**Provider fallback chain (must be feature-specific, not blanket):**
```
Gemini → Groq → controlled rule-based fallback
```

**Retry policy:** connect timeout → read timeout → overall timeout → retry with exponential backoff → provider fallback → circuit breaker. Never retry endlessly.

**Circuit breaker (🟠):** if Gemini starts returning 429/500/503/timeouts repeatedly, stop sending it requests temporarily and route to Groq/fallback until it recovers.

**`llm_usage_logs` table** (🟠 NEW):
```
id UUID PRIMARY KEY
provider VARCHAR(30) NOT NULL
model VARCHAR(60) NOT NULL
feature VARCHAR(50) NOT NULL         -- question_generator, mentor, career, feedback
user_id UUID NULLABLE
request_id VARCHAR(100) NOT NULL
input_tokens INTEGER NULLABLE
output_tokens INTEGER NULLABLE
total_tokens INTEGER NULLABLE
latency_ms INTEGER NULLABLE
status VARCHAR(20) NOT NULL           -- success, error, fallback_triggered
error_type VARCHAR(50) NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```
This is what lets you see exactly how expensive Code Realm is, per feature, per provider, per user.

**Structured LLM outputs:** question generation must produce a Pydantic-validated schema —
```
QuestionSet
 ├── primary: Challenge
 ├── alternate_1: Challenge
 └── alternate_2: Challenge
```
Reject and retry on malformed output rather than persisting it.

**LLM timeout:** never allow an LLM call to hang the API indefinitely — enforce connect/read/overall timeouts unconditionally.

**Prompt injection protection:** user code and user chat messages can contain instructions like "ignore your previous instructions." Never blindly interpolate user content into privileged system prompts — keep SYSTEM / DEVELOPER / USER DATA clearly delimited and treat user content as data, never as instructions.

**AI Mentor safety & context:**
- The mentor must not have arbitrary access to the database, filesystem, API secrets, or execution environment — give it only a constructed **User Learning Context** (current node/challenge, recent mistakes, skill ratings, mastery, recent submissions, learning goals), not raw history dumps. This also reduces token cost.
- Use structured `mentor_memory` (preferred explanation level, common mistakes, weak/strong topics) rather than replaying full conversation transcripts.

---

## 19. Question Generation Concurrency 🔴

**Redis lock pattern**, keyed as `question_generation_lock:{node_id}:{language}:{difficulty}`:
```
Check DB
  ↓ missing
Acquire lock
  ↓
Check DB AGAIN (essential — a second check inside the lock)
  ↓ still missing
Generate → Validate → Persist → Release lock
```
**Expected behavior under load** — 100 users hit the same node in the same second:
```
Gemini calls = 1        (not 100)
Question Sets = 1       (not 100)
Challenges = 3           (Primary + 2 Alternates)
Assignments = 100        (one per user, all pointing at the same set)
```

**Background pre-generation (🟡 scaling enhancement)** removes even the "first user" LLM latency:
```
Admin activates node → background job → Gemini → 3 questions → validate → ACTIVE
```
Then every user, including the very first, hits Postgres only. LLM calls at request time: 0.

---

## 20. API Redesign 🔴

Replace ad hoc routes with resource-oriented ones:
```
GET   /api/v1/nodes/{node_id}
GET   /api/v1/nodes/{node_id}/challenge
PATCH /api/v1/nodes/{node_id}/challenge/draft
POST  /api/v1/nodes/{node_id}/challenge/swap
POST  /api/v1/challenges/{challenge_id}/feedback
```
instead of the old `GET /challenges/generate`.

**Auth requirements:**
- Required: challenge retrieval, swap, draft, execute, submit, mentor, career, memory, personalized leaderboard data, all `/admin/*` routes.
- Public: `/health`, `/ready`, login, register, OAuth initiation.

**Rate limiting (Redis, per endpoint):** login, register, OTP, resend-OTP, execute, submit, mentor, career, feedback, challenge generation, swap, draft — every one of these needs its own limit, not a single global limiter.

**Pagination:** every list-returning endpoint (`/submissions`, `/leaderboard`, `/mistakes`) must support `limit` + `cursor`. Avoid unbounded `GET` lists and avoid large offset pagination — use cursor pagination for leaderboards and submissions specifically.

**Standard response envelope:**
```json
// success
{ "success": true, "data": {} }

// error
{ "success": false, "error": { "code": "CHALLENGE_NOT_FOUND", "message": "Challenge not found" } }
```

**Centralized error codes:** `AUTH_REQUIRED`, `INVALID_TOKEN`, `USER_NOT_FOUND`, `NODE_NOT_FOUND`, `CHALLENGE_NOT_FOUND`, `QUESTION_SET_NOT_FOUND`, `NO_ALTERNATE_AVAILABLE`, `RATE_LIMITED`, `EXECUTION_TIMEOUT`, `EXECUTION_MEMORY_LIMIT`, `LLM_UNAVAILABLE`, `DATABASE_UNAVAILABLE`.

**Validation:** every request/response uses Pydantic schemas — never return SQLAlchemy models directly.

## 21. Transaction Boundaries & Outbox 🔴 / 🟠

A submission is transactional — submission record, assignment completion, XP, coins, stars, Elo, mastery, and achievement checks all commit together (`BEGIN … COMMIT`). Where operations genuinely can't share one transaction (e.g. triggering a notification or an analytics event), use the outbox pattern instead of a partial, inconsistent write.

**`outbox_events` table:**
```
id UUID PRIMARY KEY
event_type VARCHAR(50) NOT NULL
aggregate_type VARCHAR(50) NOT NULL
aggregate_id VARCHAR(100) NOT NULL
payload JSONB NOT NULL
status VARCHAR(20) NOT NULL DEFAULT 'pending'
attempts INTEGER NOT NULL DEFAULT 0
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
processed_at TIMESTAMP NULLABLE
```

**Background workers** (don't make every operation synchronous): question generation, LLM analytics aggregation, achievement processing, leaderboard refresh, analytics rollups, email, notifications, cleanup jobs.

---

## 22. Backend DTOs — never leak internal fields 🔴

Three distinct shapes per challenge, enforced at the API boundary:
```
ChallengeInternal   -- full row, backend-only (includes canonical_solution, hidden tests, generation metadata)
ChallengePublic     -- what the workstation receives (no canonical_solution, no hidden tests, no admin fields)
ChallengeAdmin      -- what the admin console receives (includes moderation/quality fields, not canonical_solution unless explicitly requested for review)
```
`GET /nodes/{id}/challenge` must never return `canonical_solution`, hidden test cases, internal generation metadata, or admin-only fields.

---

## 23. Admin Role & Control Console 🔴

An admin role touches nearly every subsystem above, so it gets its own schema and permission model rather than a single `role == "admin"` string check anywhere in the codebase (Item 87).

### 23.1 Schema

**`admin_roles`:**
```
id UUID PRIMARY KEY
name VARCHAR(30) UNIQUE NOT NULL     -- super_admin, content_admin, support_admin, security_admin
description VARCHAR(255) NULLABLE
permissions JSON NOT NULL DEFAULT []  -- e.g. ["users:ban","challenges:approve","logs:view"]
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**`user_admin_roles`** (many-to-many; a user can hold multiple roles):
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
role_id UUID NOT NULL FK admin_roles(id) ON DELETE CASCADE
granted_by UUID NULLABLE FK users(id) ON DELETE SET NULL
granted_at TIMESTAMP NOT NULL DEFAULT utcnow()
revoked_at TIMESTAMP NULLABLE
```

**`user_sanctions`** (bans/mutes/suspensions as first-class records):
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
type VARCHAR(20) NOT NULL             -- warn, mute, suspend, ban
reason TEXT NOT NULL
issued_by UUID NULLABLE FK users(id) ON DELETE SET NULL
expires_at TIMESTAMP NULLABLE         -- null = permanent
is_active BOOLEAN NOT NULL DEFAULT TRUE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**`system_settings`** (runtime-tunable config, no redeploy needed):
```
key VARCHAR(100) PRIMARY KEY          -- e.g. "llm_daily_spend_cap_usd", "execution_timeout_seconds"
value JSON NOT NULL
updated_by UUID NULLABLE FK users(id) ON DELETE SET NULL
updated_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
```

**`admin_action_logs`** (stricter companion to general `audit_logs`, before/after snapshots):
```
id UUID PRIMARY KEY
admin_user_id UUID NULLABLE FK users(id) ON DELETE SET NULL
action VARCHAR(100) NOT NULL           -- ban_user, approve_challenge, revoke_admin_role, change_setting
target_type VARCHAR(50) NULLABLE       -- user, challenge, api_key, system_setting
target_id VARCHAR(100) NULLABLE
before_state JSON NULLABLE
after_state JSON NULLABLE
ip_address VARCHAR(45) NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**`challenge_reports`** (user-flagged bad questions — quality control loop, Item 94):
```
id UUID PRIMARY KEY
challenge_id VARCHAR(50) NOT NULL FK challenges(id) ON DELETE CASCADE
reported_by UUID NULLABLE FK users(id) ON DELETE SET NULL
reason VARCHAR(50) NOT NULL            -- wrong_answer, unclear, offensive, duplicate, broken_tests
details TEXT NULLABLE
status VARCHAR(20) NOT NULL DEFAULT 'open'  -- open, reviewed, resolved, dismissed
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

### 23.2 Permission Model

Scoped permission strings checked via FastAPI dependency injection (`require_permission("users:ban")`) — **not** `if user.role == "admin"` scattered across the codebase:

| Scope | Example permissions |
|---|---|
| Users | `users:view`, `users:ban`, `users:edit_profile`, `users:grant_admin_role` |
| Content | `challenges:create`, `challenges:approve`, `challenges:retire`, `challenges:edit`, `challenges:regenerate` |
| LLM / AI | `llm:view_usage`, `llm:adjust_spend_cap`, `llm:force_fallback_mode` |
| Execution | `execution:view_jobs`, `execution:kill_job`, `execution:adjust_limits` |
| Security | `logs:view_audit`, `logs:view_admin_actions`, `security:revoke_sessions`, `security:view_rate_limit_violations` |
| System | `settings:view`, `settings:edit` |

`super_admin` holds every scope. Every other role gets only what its function needs.

### 23.3 Admin API Surface

| Method | Route | Purpose | Permission |
|---|---|---|---|
| GET | `/api/v1/admin/users` | List/search/filter users | `users:view` |
| POST | `/api/v1/admin/users/{id}/sanction` | Ban/mute/suspend | `users:ban` |
| POST | `/api/v1/admin/users/{id}/roles` | Grant/revoke admin role | `users:grant_admin_role` |
| GET | `/api/v1/admin/challenges/pending` | Unreviewed/flagged queue | `challenges:approve` |
| POST | `/api/v1/admin/challenges/{id}/review` | Approve/retire/regenerate | `challenges:approve` |
| GET | `/api/v1/admin/llm/usage` | Spend & volume dashboard | `llm:view_usage` |
| POST | `/api/v1/admin/llm/settings` | Adjust spend cap / force fallback | `llm:adjust_spend_cap` |
| GET | `/api/v1/admin/execution/jobs` | Live + historical job list | `execution:view_jobs` |
| POST | `/api/v1/admin/execution/jobs/{id}/kill` | Force-terminate a job | `execution:kill_job` |
| GET | `/api/v1/admin/logs/audit` | Query `audit_logs` | `logs:view_audit` |
| GET | `/api/v1/admin/logs/admin-actions` | Query `admin_action_logs` | `logs:view_admin_actions` |
| GET | `/api/v1/admin/security/rate-limit-violations` | Query violations | `security:view_rate_limit_violations` |
| POST | `/api/v1/admin/security/revoke-sessions/{user_id}` | Force-revoke refresh tokens | `security:revoke_sessions` |
| GET/PUT | `/api/v1/admin/settings` | View/edit `system_settings` | `settings:view` / `settings:edit` |

Every write route: (1) requires the matching permission via dependency, never a route-level role string check; (2) writes `admin_action_logs` with before/after state; (3) is itself rate-limited — an admin account, compromised or not, should still be bounded.

### 23.4 Admin Console (Frontend)

Separate route tree `/admin/*`, gated client-side by permissions from `/auth/me` — but every admin API call re-checks server-side regardless of what the UI shows. Screens: User Management, Content Review Queue, LLM Dashboard, Execution Monitor, Security Center, System Settings.

### 23.5 Admin-Specific Security

1. MFA mandatory for any account holding an `admin_roles` grant.
2. Shorter session lifetime for admin-scoped sessions (15–30 min), with re-auth for high-risk actions.
3. IP/device anomaly logging on admin logins via `audit_logs`.
4. No shared admin accounts — every action traceable to one `user_id`.
5. Least privilege by default — new grants start narrow (`support_admin`/`content_admin`), `super_admin` requires explicit justification.

---

## 24. Auth & Session Security 🔴

**`refresh_tokens`** (rotation + revocation, closing the gap where a stolen refresh token is valid until natural expiry):
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id) ON DELETE CASCADE
token_hash VARCHAR(255) UNIQUE NOT NULL
is_revoked BOOLEAN NOT NULL DEFAULT FALSE
replaced_by_id UUID NULLABLE          -- rotation chain
ip_address VARCHAR(45) NULLABLE
user_agent VARCHAR(255) NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
expires_at TIMESTAMP NOT NULL
```
Every refresh issues a new token and revokes the old one; reuse of an already-revoked token is a theft signal — revoke the entire session chain when detected.

**`api_keys`** (service-to-service / internal tooling, not reused user JWTs):
```
id UUID PRIMARY KEY
user_id UUID NULLABLE FK users(id) ON DELETE CASCADE
key_hash VARCHAR(255) UNIQUE NOT NULL   -- store hash, never raw key
label VARCHAR(100) NOT NULL
scopes JSON NOT NULL DEFAULT []
is_active BOOLEAN NOT NULL DEFAULT TRUE
last_used_at TIMESTAMP NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
expires_at TIMESTAMP NULLABLE
```

**Account lockout:** after N failed logins (`users.failed_login_attempts`), lock via `users.locked_until` — prevents credential stuffing.

**IDOR protection 🔴:** e.g. `PATCH /nodes/{node_id}/challenge/draft` must only ever modify the *authenticated* user's own assignment. Authority comes from `user_id = JWT identity`, never from a `user_id` field in the request body.

---

## 25. Rate Limiting & Abuse Tracking 🔴

**`rate_limit_violations`** (Redis TTLs disappear; persist history for pattern detection):
```
id UUID PRIMARY KEY
user_id UUID NULLABLE FK users(id) ON DELETE SET NULL
ip_address VARCHAR(45) NOT NULL
endpoint VARCHAR(150) NOT NULL
violation_count INTEGER NOT NULL DEFAULT 1
first_seen_at TIMESTAMP NOT NULL DEFAULT utcnow()
last_seen_at TIMESTAMP NOT NULL DEFAULT utcnow() ON UPDATE utcnow()
is_blocked BOOLEAN NOT NULL DEFAULT FALSE
```

| Endpoint | Suggested limit |
|---|---|
| `/execute/run` | 10/min, 30/hour per user |
| `/execute/submit` | 20/hour per user |
| `/ai/mentor/chat` | 15/hour per user |
| `/challenges/feedback` | 10/hour per user |
| `/auth/login` | 5/15min per IP |
| `/auth/resend-otp` | 3/10min per email |

---

## 26. Audit Logging 🔴

**`audit_logs`** (general-purpose, platform-wide):
```
id UUID PRIMARY KEY
user_id UUID NULLABLE FK users(id) ON DELETE SET NULL
action VARCHAR(100) NOT NULL          -- login, login_failed, password_change, oauth_link, role_change
resource_type VARCHAR(50) NULLABLE
resource_id VARCHAR(100) NULLABLE
ip_address VARCHAR(45) NULLABLE
user_agent VARCHAR(255) NULLABLE
metadata_json JSON NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```
Track especially: login, password change, OAuth linking, admin changes, challenge modifications, reward changes.

---

## 27. Mastery, Rating & Adaptive Learning 🟠

**Multi-dimensional rating** instead of one global number:
```
global_rating
language_rating   (per language)
topic_rating      (per topic)
```
e.g. Python 1100, Algorithms 850, Debugging 1250, JavaScript 650 — this is what makes adaptive difficulty meaningful.

**`rating_history`:**
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id)
domain_type VARCHAR(30) NOT NULL      -- global, language, topic
domain_id VARCHAR(50) NULLABLE
old_rating INTEGER NOT NULL
new_rating INTEGER NOT NULL
change_reason VARCHAR(50) NOT NULL
challenge_id VARCHAR(50) NULLABLE FK challenges(id)
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**Mastery calculation** should weigh attempts, successes, failure rate, recency, difficulty, time taken, and hints used — not a flat `passed / total`.

**`AdaptiveLearningService`** — inputs: Elo, mastery, recent mistakes, completion rate, attempt count, time taken, swap behavior, topic/language performance. Output: next difficulty, next topic, next challenge type.

**Spaced repetition for `mistake_logs`** (eventually): add `next_review_at`, `review_count`, `interval_days`, `difficulty_factor` so mistakes get rescheduled for review rather than logged and forgotten.

---

## 28. Leaderboards, Economy & Notifications 🟡

**Leaderboard segmentation (eventually):** global, weekly, monthly, friends, per-realm — each with cursor pagination (Item 41).

**`RewardService`** — centralize all XP/coin/Elo grants behind one service instead of scattering `coins += x` across `challenge.py`, `submit.py`, `achievement.py`.

**`user_wallet_transactions`** (🟡, prevents unexplained balance changes):
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id)
currency VARCHAR(20) NOT NULL     -- xp, coins
amount INTEGER NOT NULL
reason VARCHAR(100) NOT NULL
reference_id VARCHAR(100) NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**`notifications`:**
```
id UUID PRIMARY KEY
user_id UUID NOT NULL FK users(id)
type VARCHAR(50) NOT NULL
title VARCHAR(150) NOT NULL
message TEXT NOT NULL
data JSON NULLABLE
read_at TIMESTAMP NULLABLE
created_at TIMESTAMP NOT NULL DEFAULT utcnow()
```

**Streaks:** don't naively `streak += 1` — calculate against `last_activity_at` and `users.timezone` using calendar days, not elapsed hours.

**Feature flags (🟡):** for new challenge engine, new Elo system, new mentor, new map, new execution system — enables gradual rollout instead of big-bang releases.

---

## 29. Content Moderation & Question Quality 🟠

Before activating any AI-generated challenge, check for: validity, duplication (`content_hash`), difficulty accuracy, unsafe content, broken test cases, ambiguous wording, canonical solution correctness, language compatibility.

**Question quality analytics** — per challenge, track views, attempts, passes, failures, swaps, average attempts, average time, hint usage, completion rate, and derive `quality_score` from actual behavior rather than a static value set at generation time.

**Auto-flag for review** (never auto-delete): e.g. `swap_rate > 70% AND completion_rate < 20%` → mark `REVIEW_REQUIRED` in `challenge_reports`/`review_status`.

**Question regeneration:** retire → generate replacement → validate → activate. Never modify historical submissions when replacing a bad question — see the historical-integrity rule in Section 9.

**Prompt versioning:** every `question_sets` row stores `prompt_version` (e.g. `question-generator-v4`), so quality can be compared across prompt iterations over time.

---

## 30. Frontend Architecture 🟠

**State separation:**
```
Server state   → React Query / TanStack Query
Client/UI state → Zustand or context
Editor state    → Monaco, isolated from the above
```
Don't let individual components independently manage conflicting pieces of challenge state.

**Challenge lifecycle:**
```
Loading → Challenge loaded → Editor initialized → Draft restored → Autosave → Submit → Result → Progress update
```

**Offline handling:** local draft in Monaco while offline → reconciliation against server state (using `updated_at` for conflict detection) once connectivity returns — simplest conflict rule is last-write-wins by timestamp, escalate to explicit merge UI only if needed later.

**Loading UX:** skeleton states, retry affordances, explicit offline state, explicit error state — never a blank screen.

**Map performance:** load only realm + node metadata + user progress on the map view; fetch full challenge payload only when a node is opened.

---

## 31. Caching 🟡

Cache aggressively: realm list, map metadata, leaderboards, public challenge metadata.
Cache carefully or not at all: user draft, submission state, Elo, XP — these need explicit invalidation on every write (`DB update → invalidate Redis cache`), never TTL-only staleness.

Redis's role is coordination and short-lived cache (OTP, OAuth state, rate limits, generation locks, leaderboard cache, job coordination) — **not** the permanent source of gameplay state. Postgres remains that source of truth.

---

## 32. Observability 🔴

- Structured (JSON) logs, correlated via `X-Request-ID` propagated through API → LLM Gateway → DB → execution worker → background job.
- Metrics: API latency, DB latency, Redis latency, LLM latency/failures, execution latency, question-generation latency.
- Error tracking (Sentry or equivalent) on both backend and frontend.
- LLM cost dashboard: calls, tokens, estimated cost, failure rate, average latency per provider — sourced from `llm_usage_logs`.
- Meaningful health checks: `/health` = process alive; `/ready` = database + Redis + critical dependencies actually reachable.

---

## 33. Database & Infra Operations 🔴

- **Connection pooling:** Supabase pooler + properly configured SQLAlchemy async pool — never a fresh connection per request.
- **Backups:** automatic backups, point-in-time recovery, a defined retention policy, and periodic **restore testing** — an untested backup is not a real disaster-recovery plan.
- **Disaster recovery targets:** define RPO/RTO explicitly (e.g. RPO 15 min, RTO 1 hour) based on actual product requirements.
- **Separate DB credentials** for application, migrations, admin tooling, and analytics — application credentials should not be able to perform administrative operations.
- **Split migrations** — never one `massive_final_migration.py`. Sequence them (`001_base`, `002_question_sets`, `003_assignments`, `004_submission_upgrade`, `005_indexes`, `006_audit`, `007_outbox`, …).
- **Migration safety for rolling deploys:** expand → migrate → deploy → contract, so old and new app versions can coexist briefly without breaking.
- **Seed data** as separate, idempotent scripts per domain (realms, nodes, languages, topics, achievements) — never manual repeated inserts into production.
- **Environment separation:** development / staging / production, each with its own database, Redis, OAuth app, LLM keys, and frontend URL. Test every migration in staging first.

---

## 34. Security Hardening 🔴

- Security headers: CORS (locked to known origins), CSP where applicable, HSTS, `X-Content-Type-Options`, secure cookie flags, CSRF protection anywhere cookies are used for auth.
- Secrets (Gemini key, Groq key, DB password, JWT secret, OAuth secret) live only in environment/secret management — never in frontend code or committed config.
- Dependency pinning for Python/FastAPI/SQLAlchemy/Pydantic/Node/React, plus automated dependency vulnerability scanning.

**Security test matrix:** JWT manipulation, IDOR, SQL injection, XSS, CSRF, OAuth state attacks, rate-limit bypass, privilege escalation, sandbox escape, path traversal, command injection.

**Full testing matrix:** unit, integration, API, concurrency, security, execution-sandbox, LLM-mock, database-migration, E2E, load testing.

**Critical concurrency tests specifically for this system:** 100 users hitting the same node simultaneously; 100 users on the same challenge; 20 rapid swaps by the same user; 20 simultaneous submissions by the same user.

**Load testing targets:** 100 / 500 / 1000 concurrent users, measuring p50/p95/p99 API latency.

---

## 35. Final Reference Flows (LLM call counts as the correctness check)

**Question Bank flow:**
```
USER OPENS NODE → authenticate → check user_node_assignment
  EXISTS → return it
  MISSING → find question_set
      EXISTS → assign primary
      MISSING → acquire Redis lock → check DB again → still missing →
                Gemini/Groq → structured JSON → Pydantic → validate questions →
                validate test cases → execute solutions → duplicate detection →
                quality scoring → Postgres transaction (Primary + Alt1 + Alt2) →
                assign primary to user
```

**Swap flow — LLM calls: 0**
```
POST /nodes/{id}/challenge/swap → get assignment → get question_set →
check swap_count → find next alternate → write assignment history →
update assignment → return new challenge
```

**Resume flow — LLM calls: 0**
```
Login → open node → user_node_assignments → challenge_id + saved_code → Monaco restores exact state
```

**First-user flow with pre-generation — LLM calls: 0**
```
Admin activates node → background generator → Gemini → 3 questions →
validate → Postgres → ACTIVE
(later) user opens node → Postgres → primary, no LLM call at request time
```

---

## 36. The Core Architectural Correction

The single most important structural change in this entire document: stop modeling a challenge as **Node → Challenge**, and model it as:

```
Realm
  ↓
Node
  ↓
Question Set
  ├── Primary Challenge
  ├── Alternate Challenge 1
  └── Alternate Challenge 2
        ↓
  User Assignment
        ↓
  User Progress
        ↓
  Submission History
```

PostgreSQL is the authoritative state. Redis is the coordination/cache layer. The LLM Gateway is the generation layer. Sandbox workers are the execution layer. That is the clean senior-level boundary this system should be built against — everything else in this document (question bank, admin console, security, observability) is built on top of that separation, not around it.

---

## 37. Phased Rollout Priority

**🔴 Phase 1 — Must do now**
PostgreSQL as sole source of truth · Question Sets · Challenges · Challenge Test Cases · User Node Assignments · Assignment History · Draft persistence · Question swapping · Redis generation locks · LLM Gateway · Pydantic validation · Challenge validation pipeline · Execution sandbox security · Authentication · Rate limiting · Idempotency · Database indexes · Transactions · Auth on `/execute/run` · Minimal `super_admin` role + `admin_action_logs`

**🟠 Phase 2**
Adaptive Learning Engine · Mastery improvements · Mistake spaced-repetition scheduling · `llm_usage_logs` + spend ceiling · `audit_logs` · Outbox pattern · Background workers · Question quality analytics · Full admin question management + review queue · Observability · CI/CD · Staging environment · `refresh_tokens` rotation · `user_sanctions` + user management admin tools

**🟡 Phase 3**
Background pre-generation · Advanced leaderboards (weekly/monthly/friends/realm) · Notifications · Feature flags · Wallet transactions · Advanced analytics · Load testing · Recommendation engine · `system_settings` runtime config

**🟢 Phase 4**
PvP · Tournaments · Code Duels · Advanced AI Mentor memory · Social/friends · Guilds
