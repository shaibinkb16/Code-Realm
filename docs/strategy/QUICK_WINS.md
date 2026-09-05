# Quick Wins

Cheap, low-risk, high-value changes — most are single-file edits, none require new infrastructure. Ordered roughly by value-per-hour.

1. **Fix the admin analytics `NameError`** — one-line variable assignment bug in `GET /admin/analytics` (`backend/app/api/v1/admin.py`). Currently throws on every call.
2. **Add auth to `POST /execute/run`** — the single highest-leverage security fix available; the endpoint's own design already assumes auth exists elsewhere in the system.
3. **Remove the universal OTP bypass** (`"123456"` in `auth.py`), or gate it strictly behind a dev-only environment flag with a loud warning log.
4. **Remove hardcoded secret defaults from `core/config.py`** and rotate every credential that appears in git history (Supabase DB password, Supabase key, Mongo Atlas password, JWT secret).
5. **Rotate the default admin account** (`scripts/create_admin.py`) — generate a random password and force a change on first login instead of a fixed credential.
6. **Swap Boss Fight and Code Duel's plain `<textarea>` for the existing Monaco instance** already used in the Challenge Editor — pure UX parity, no new component needed.
7. **Delete confirmed-dead frontend files** — old `Navbar.tsx`, unused `ui/` primitives (`Badge`, `Button`, `Card`, `ProgressBar`), duplicate onboarding modals (`AdaptiveAssessmentModal`, `OnboardingTutorialModal`), and the two unused static data files (`challengesData.ts`, `careerData.ts`). Full list in [../audit/DEAD_CODE.md](../audit/DEAD_CODE.md). Smaller bundle, less confusion for new contributors.
8. **Either fix the Spotlight Tour's `data-tour` targeting or remove it** — it currently likely renders pointing at nothing on the current layout.
9. **Remove or clearly gate the fake Championship bracket** until it's real — a fast trust win either direction.
10. **Wire the already-built `LLMGatewayService`** as the one call path for LLM traffic — turns on the existing (currently permanently-empty) admin cost dashboard for free, with no new logic to write.
11. **Consolidate the two streak implementations** (`GameService.update_streak` and the near-duplicate in `api/v1/user.py`) into one shared function.
12. **Remove the static, non-data-driven "learner preference" line** in the AI Teacher panel footer, or wire it to real mastery data (see [PERSONALIZATION.md](./PERSONALIZATION.md)) — currently implies personalization that isn't happening.
13. **Measure real elapsed time for contest submissions** instead of the hardcoded `time_to_solve_seconds = 120` constant — makes the existing anti-cheat check capable of actually triggering.
14. **Deprecate `AdminConsole.tsx`** once confirming `AdminDashboardPortal` covers its one remaining use case (the "Preview Student View" round-trip) — one fewer UI to maintain.
