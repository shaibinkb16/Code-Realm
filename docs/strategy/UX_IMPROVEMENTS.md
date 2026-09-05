# UX Improvements

## No real "home" screen

The World Map is the landing view today, but nothing on it surfaces a daily mission, streak status, or "pick up where you left off" prompt — a user has to already know what to do next. A lightweight dashboard strip above the map would show: current level/XP/streak, a recommended next challenge (already computable from the existing Elo-banded `/practice/recommend`), and — once built, see [ROADMAP.md](./ROADMAP.md) — a daily mission checklist and recent achievements.

## Silent error swallowing

`services/api.ts` deliberately swallows errors on several calls (`runCode`, `submitCode`, `askAiMentor`) and returns `null`, referencing a "client sandbox engine" fallback that doesn't actually exist anywhere in the codebase. In practice this likely means users see a silent, unexplained failure rather than useful feedback. Every one of these call sites needs a real, specific error state — "the server couldn't run your code, try again" is a small change with an outsized trust payoff.

## Editor inconsistency

Monaco is used only in the Challenge Editor; Boss Fight and Code Duels — arguably the more dramatic, higher-stakes moments — fall back to a plain `<textarea>`. This is called out again here because it's genuinely one of the more visible polish gaps: a user who's impressed by the main editor experience gets a noticeably worse one in the "big moment" screens. Fix is in [QUICK_WINS.md](./QUICK_WINS.md).

## Mobile code editing

No mobile-specific handling was found for Monaco anywhere in the reviewed code. A full IDE keyboard experience on a phone screen is a rough problem industry-wide, not unique to this app. Rather than trying to make full Monaco editing comfortable on mobile, consider a simplified "view + short answer" mobile mode — multiple-choice "spot the bug" variants, or read-only code review of a past submission — for on-the-go engagement that doesn't require a full keyboard.

## Accessibility

No evidence of ARIA roles, focus management, or keyboard-navigation treatment was found in any component reviewed. This is worth a dedicated pass once the higher-severity items in [PROBLEMS.md](./PROBLEMS.md) are addressed. The highest-value starting point is the modal-heavy surfaces — onboarding, settings, feedback, node detail — since modals are the most common place focus-trapping and keyboard-escape actually matter for usability.

## Inconsistent design-system usage

The audit found that the entire `ui/` primitives folder (`Badge`, `Button`, `Card`, `ProgressBar`) is defined but never imported — every screen instead uses raw `<div>`s with inline styles or ad hoc CSS classes. This isn't just dead code (see [QUICK_WINS.md](./QUICK_WINS.md)) — it also means there's no actual shared design-system layer enforcing visual consistency across screens today, even though one was clearly intended. Worth deciding explicitly: either revive and actually adopt those primitives, or delete them and document the ad hoc pattern as the real convention, so future contributors aren't confused about which approach to follow.

## Loading/empty states

Not exhaustively audited component-by-component, but several list-driven screens (Leaderboards, Feedback's "My Reports", Admin's user list) should be checked specifically for a real empty state (new user, zero data) versus just an empty table — a common gap in gamified apps where the "day one" experience matters disproportionately for retention.
