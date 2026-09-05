# Frontend

React 19.2 + TypeScript ~6.0 + Vite 8 single-page app under `src/`. See [FEATURES.md](./FEATURES.md) for what each screen actually does; this file covers architecture, auth, and API communication.

## Navigation — there is no router

`react-router` (or any routing package) is **not installed**. Navigation is a hand-rolled state machine:

- `GameContext.activeTab: ActiveTab` (`'world' | 'challenge' | 'boss' | 'duel' | 'leaderboards' | 'championship' | 'hq' | 'admin'`) drives a `switch` in `App.tsx`'s `renderActiveView()`.
- `Sidebar.tsx` calls `setActiveTab(id)` on click to change views.
- A second, independent gate sits above this in `App.tsx`'s `AppContent`: it checks `user.role` — admins/super_admins land on `AdminDashboardPortal` (a completely separate full-page app, not part of the tab switch) instead of the gamified shell, with a manual "Preview Student View" toggle that lets an admin flip into the student experience and back via a banner.
- The auth flow has its own nested state machine inside `AuthLayout.tsx`: `viewMode: 'login' | 'register' | 'otp' | 'onboarding' | 'security'`.
- OAuth redirect tokens and error messages are caught by manually parsing URL hash/query params (`AuthContext.tsx`'s `fetchUser()`, `AuthLayout.tsx`) rather than through router-managed routes.

## State management

- **Global state**: `AuthContext.tsx` (user/auth), `GameContext.tsx` (active tab, profile/gamification state, AI chat history), `ToastContext.tsx` (toast notifications) — plain React Context + `useState`/`useEffect`, no external state library.
- **Persistence**: JWT access/refresh tokens and a few UI flags (spotlight-tour completion) live in `localStorage`.
- **Editor state**: Monaco is isolated to `ChallengeEditor.tsx`; it is not used in Boss Fight or Code Duel, which use a plain `<textarea>` instead — a real UX inconsistency between the main gameplay loop and its more dramatic variants.

## Auth flow (full picture)

1. **Email/password**: `EmailLoginForm.tsx` — login/register toggle, `PasswordStrength.tsx` client-side meter, email regex validation, show/hide password.
2. **Registration → OTP**: register triggers a 6-digit OTP screen (`AuthLayout.tsx`, `viewMode: 'otp'`) with a 60-second resend cooldown. Unverified-login attempts are specifically detected (`err.detail.message === "Account not verified"`) and silently redirected into the OTP flow.
3. **OAuth**: `SocialAuthButtons.tsx` does a hard `window.location.href` redirect to the backend's `/auth/google` / `/auth/github` — entirely backend-driven; the frontend just constructs the URL and later parses the return-trip hash params.
4. **Passkeys (WebAuthn)**: fully implemented client-side in `services/passkey.ts` — `navigator.credentials.create()`/`.get()`, base64url encode/decode helpers, register + login flows against the backend's passkey endpoints, feature-detected via `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable`. **The registration path sends a dummy public key** (`pubkey_${rawId.slice(0,16)}`) rather than the real attestation object — the browser-level prompt is genuine, but the crypto trust chain is incomplete on the client side too (matching the backend gap noted in [BACKEND.md](./BACKEND.md)).
5. **Session/passkey management**: `SessionManager.tsx` (reached via `AuthLayout`'s `viewMode: 'security'`) lists registered passkeys and active device sessions with revoke/delete actions.
6. **Onboarding**: `OnboardingFlow.tsx` — a 4-step wizard (language → title → skill level → career goal) mapping skill level to a starting Elo (300/500/800/1200), POSTs to `/auth/onboarding`. Shown once right after OTP verification.
7. **First-run tour**: `SpotlightTour.tsx` — an element-targeting spotlight overlay gated by `localStorage.coderealm_spotlight_completed`, targeting `data-tour="..."` attributes. It targets several attributes (`brand`, `world`, `challenge`, `boss`, `leaderboards`, `hq`, `hud`, `ai-btn`, `theme-toggle`) that don't appear to exist on the currently-mounted `Sidebar`/`HeaderBar` elements — likely a regression from an earlier Navbar-based layout (see [DEAD_CODE.md](./DEAD_CODE.md)).

Token storage/refresh: JWT access/refresh pair in `localStorage` (`coderealm_token`, `coderealm_refresh_token`). `services/api.ts`'s `fetchWithAuth` auto-attaches `Authorization: Bearer` and transparently calls `/auth/refresh` once on a 401, retrying the original request — a real interceptor, not a stub.

## Talking to the backend (`services/api.ts`)

- Base URL: `import.meta.env.VITE_API_URL`, falling back to auto-detection of localhost vs. production (`https://code-realm.onrender.com/api/v1`) via `window.location.hostname`.
- A single `ApiClient` class centralizes auth-header injection and the refresh-and-retry logic — but several feature components (`ChallengeEditor.tsx`, `BossFight.tsx`, `CodeDuel.tsx`, `Leaderboards.tsx`, `AdminConsole.tsx`) **bypass it and call `fetch()` directly**, duplicating header/token logic instead of reusing the class.
- Error handling is inconsistent by design: some methods (`login`, `register`) throw structured error objects for the UI to branch on; others (`runCode`, `submitCode`, `askAiMentor`) **swallow errors and return `null`**, referencing a "client sandbox engine" fallback message that has no actual implementation anywhere in the codebase.
- Roughly 30 endpoints are called in total, spanning auth, passkeys, sessions, onboarding, node/challenge CRUD, AI mentor, HQ/pet economy, feedback, and admin.

## Build & deploy

- `npm run build` → `tsc -b && vite build && node scripts/create-vercel-output.mjs` (a custom post-processing step shaping Vite's output for Vercel's expected structure).
- `vercel.json` — SPA rewrite-all-to-`index.html`.
- `vite.config.ts` is the stock `@vitejs/plugin-react` template with no customization.

## Data: static vs. backend-driven

Cross-checking every `data/*.ts` file against actual imports:

- **Actually used**: `realmsData.ts` (World Map's node graph/unlock structure) and `achievementsData.ts` (referenced for type/initial state, though the live achievement list shown to users is computed elsewhere — see [DEAD_CODE.md](./DEAD_CODE.md)).
- **Confirmed unused**: `challengesData.ts` and `careerData.ts` — hand-authored static content from what looks like an earlier, fully-static prototype, superseded once the backend gained AI generation endpoints. Never imported anywhere in `src/`.
- **Real gameplay content is 100% backend/AI-generated at runtime** — `ChallengeEditor.tsx`, `BossFight.tsx`, and `CodeDuel.tsx` all call `GET /challenges/generate` with skill-rating parameters; only catch-block fallback challenges are hardcoded inline (not sourced from `challengesData.ts`).
