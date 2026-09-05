# Database Schema

Postgres is the sole real datastore, accessed exclusively through SQLAlchemy 2.0 async ORM + `asyncpg`. All ~34 tables live across 13 `backend/app/models/*.py` files, built up over 13 linear Alembic revisions (`f6fef5d1d916` → `350ada93de22` → `dca4cae984b9` → `69e702491500` → `8f35dd7f8a21` → `1268ec569d5d` → `a8d29b01c3e4` → `b9e30c12f4d5` → `c1f2e3d4a5b6` → `d2e3f4a5b6c7` → `e3f4a5b6c7d8` → `0948791d464b` → `7556e8d7de9e`).

MongoDB (via Motor/pymongo) is connected but has **zero application usage** — no collection is ever read or written by any route or service. `scripts/migrate_mongo.py` seeds a starter realm/challenge into Mongo collections identical to what `scripts/seed_data.py` seeds into Postgres, suggesting an in-progress or abandoned migration between the two, with Mongo now inert.

## Tables by domain

### Identity & auth
`users`, `user_profiles`, `user_sessions`, `passkeys`, `auth_events`, `refresh_tokens`

- `users`: email/username/password (Argon2), OAuth provider ids (Google/GitHub), role flag, `is_active`, `email_verified`, `mfa_enabled`/`mfa_secret_encrypted` (columns exist, **no code path uses them**), `failed_login_attempts`/`locked_until` (columns exist, **nothing increments or checks them**).
- `user_profiles`: XP, coins, stars, streak, `rank`/`rank_rating` (the single gameplay Elo), `pet_stage`/`pet_level`, `hq_level`, `completed_node_ids` (JSON), `node_stars` (JSON).
- `refresh_tokens`: modeled for rotation/revocation, but not actually used for revocation logic — "revoke session" only flags a `user_sessions` row; the JWT itself has no denylist.

### Content graph
`realms` → `map_nodes` → `question_sets` → `challenges` → `test_cases`, `user_node_assignments`, `user_node_assignment_history`, `user_node_progress`

This is the AI-generated-challenge pipeline's backbone: a `question_set` fans out into a Primary + up to 2 Alternate `challenges`; a `user_node_assignment` row tracks which challenge a given user currently has open on a given node, with `user_node_assignment_history` recording swap/reset events.

### Gamification
`rating_history`, `achievements`, `user_achievements`

- `achievements` currently has exactly one row seeded/self-healed into existence (`"first_blood"`) — see [FEATURES.md](./FEATURES.md) and [GAPS_PLAN_VS_REALITY.md](./GAPS_PLAN_VS_REALITY.md).

### Submissions
`code_submissions` — one row per graded run, includes `elo_before`/`elo_after`, XP/coins/stars earned, execution time.

### Contests
`contests`, `contest_participants`, `contest_submissions`

### Learning / mastery
`languages`, `topics`, `user_language_mastery`, `user_topic_mastery`, `mistake_logs`

`user_language_mastery`/`user_topic_mastery` exist and are populated, but only actually feed **leaderboard filtering** — they don't drive adaptive difficulty selection the way the architecture doc's "multi-dimensional rating" design intends.

### Admin / governance
`admin_roles`, `user_admin_roles`, `user_sanctions`, `system_settings`, `admin_action_logs`, `challenge_reports`, `llm_usage_logs`, `audit_logs`

- `admin_roles`/`user_admin_roles` back a genuine many-to-many scoped-permission model (`require_permission("scope:action")`), one of the better-realized parts of the whole system.
- `admin_action_logs` is actually written on every admin mutation (before/after state).
- `audit_logs` **model exists but nothing ever writes to it** — general auth/security events (login, password change, OAuth linking) are not actually logged there despite the table being migrated in.
- `llm_usage_logs` **model exists, is read by the admin dashboard, but is never written to** — its only writer (`LLMGatewayService.generate`) has zero callers. The admin "LLM cost dashboard" will always report zero regardless of real Gemini/Groq traffic.

### Feedback
`user_feedback` — category, star rating, message, status (pending/in-progress/resolved), admin fix notes. This is a genuinely complete, working feature end-to-end.

### Project-memory RAG (unrelated to gameplay)
`memory_file_index`, `memory_symbol_index`, `memory_knowledge_graph_edges`, `memory_semantic`

This backs a `/memory` router that indexes a **filesystem path on the server**, not user learning history — see [AI_LLM.md](./AI_LLM.md#memoryrag-subsystem). `memory_knowledge_graph_edges` and `memory_semantic` are modeled but never read or written anywhere in `memory_service.py`.

## Tables the architecture doc calls for that don't exist in any migration

| Planned table | Purpose in the plan | Status |
|---|---|---|
| `execution_jobs` | Per-run tracking (cpu/memory telemetry, sandbox job status) | Absent |
| `outbox_events` | Transactional outbox pattern for non-transactional side effects | Absent |
| `api_keys` | Service-to-service auth, separate from user JWTs | Absent |
| `rate_limit_violations` | Persisted history of rate-limit breaches for pattern detection | Absent |
| `user_wallet_transactions` | Ledger for every XP/coin grant, preventing unexplained balance changes | Absent |
| `notifications` | In-app notification feed | Absent |

## Notable schema-level observations

- One migration, `d2e3f4a5b6c7_master_architecture_upgrade.py`, creates/patches roughly 15 tables in a single 300-line file — the "massive final migration" the architecture doc explicitly warns against avoiding.
- Several later migrations were retrofitted to check for existing columns/tables before adding them (`if 'col' not in cols: ...`), evidence of schema drift against a shared Supabase instance that had to be patched around rather than reset.
- The app also runs `Base.metadata.create_all` on every boot in addition to Alembic (`database.py`'s `init_db()`), meaning any model class with no corresponding migration will still get its table silently created at startup — a safety net that also masks migration gaps.
