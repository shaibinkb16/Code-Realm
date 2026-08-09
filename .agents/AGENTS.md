# Senior / Staff Software Engineering Rules

1. **Zero Demo / Zero Mock Policy**: Always build real production functionality. Never fabricate fake users, fake API responses, or fake success messages.
2. **Security First**: Server-side authorization, input validation, Argon2id/bcrypt password hashing, sanitized database operations, rate limiting, and zero hardcoded secrets.
3. **Database & Cache Integrity**: Use PostgreSQL for persistent data, migrations, proper foreign keys, constraints, and indexes. Use Redis for temporary caches/sessions with TTLs.
4. **Fault Tolerance & Reliability**: Centralized structured logging, health check endpoints (`/health`, `/ready`), graceful shutdown handling (`SIGTERM`), and zero swallowed errors.
5. **Architectural Cleanliness**: Enforce strict separation of concerns (Controllers -> Services -> Repositories -> Models/Schemas).
