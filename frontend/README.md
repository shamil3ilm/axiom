# Axiom — Frontend (SPA)

**Angular 21 single-page application** for Axiom. Authenticates against the [Laravel API](../backend/README.md) via Sanctum bearer tokens with a full auth surface: password login, TOTP two-factor challenge, forgot / reset password, email verification banner, 2FA enrollment, and admin user CRUD.

## Tech stack

- Angular 21 with standalone components
- TypeScript 5.9 (strict), RxJS 7, SCSS
- ESLint 9 (flat config, angular-eslint) + Prettier 3
- Vitest for unit tests
- Built with `@angular/build` (esbuild)

## Requirements

- Node.js ≥ 20 (current LTS) with npm

## Setup

```bash
npm install
npm start                                # http://localhost:4200
```

Ensure the [backend](../backend/README.md) is running at `http://127.0.0.1:8000`.

### Log in

```bash
# In backend/
php artisan db:seed --class=UserSeeder
```

Then sign in at <http://localhost:4200/login> with `admin@example.com` / `password`.

## How auth works

1. **Login step 1** — `POST /api/login` returns either a bearer token OR (if 2FA is enabled) a `202` with `{two_factor_required: true, challenge_token}`.
2. **Login step 2 (only when 2FA on)** — the SPA navigates to `/two-factor`, prompts for a TOTP code, then calls `POST /api/login/two-factor` to exchange the challenge for a real bearer.
3. `AuthService` stores the token + user in `localStorage` and exposes `currentUser$` for reactive templates.
4. `authInterceptor` attaches `Authorization: Bearer <token>` to every outgoing API request.
5. `authGuard` protects `/users` and `/settings/two-factor`.
6. Logout calls `POST /api/logout` (revoking the token) and clears local state.
7. `WarmupService` fires a fire-and-forget `GET /api/health` at bootstrap to mask Render's free-tier cold-start (see below).

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginComponent` | — |
| `/two-factor` | `TwoFactorChallengeComponent` | requires router state from `/login` |
| `/forgot-password` | `ForgotPasswordComponent` | — |
| `/reset-password?token=…&email=…` | `ResetPasswordComponent` | — |
| `/users` | `UsersComponent` | `authGuard` (backend also enforces `role:admin` + `verified`) |
| `/settings/two-factor` | `TwoFactorSettingsComponent` | `authGuard` |
| `/`, `**` | → redirect to `/users` | — |

## Environments

Per build target via `fileReplacements` in [`angular.json`](angular.json):

| Build target | File | API URL source |
|--------------|------|----------------|
| `ng serve` (development) | `src/app/environment/environment.development.ts` | Hardcoded `http://127.0.0.1:8000/api` |
| `ng build` (production) | `src/app/environment/environment.production.ts` | **Generated at build time** by `scripts/generate-environment.mjs` from `NG_APP_API_URL` (fails build loudly if missing) |

## Build

```bash
npm run build                # production build (uses committed environment.production.ts)
npm run build:vercel         # regenerates environment.production.ts from env, then builds
```

On Vercel the build command is `npm run build:vercel`. Set these env vars in the Vercel dashboard:

| Name | Purpose |
|------|---------|
| `NG_APP_API_URL` | **Required.** Backend API base URL, e.g. `https://axiom-api.onrender.com/api` |
| `NG_APP_SENTRY_DSN` | Optional. Enables Sentry error reporting |
| `NG_APP_RELEASE` | Optional. Sentry release tag (falls back to `VERCEL_GIT_COMMIT_SHA`) |

## Backend cold-start mitigation

Render's free web service tier sleeps after 15 minutes of inactivity. Instead of using a keep-alive ping (which violates Render's ToS), `WarmupService.warm()` fires a fire-and-forget `GET /api/health` at bootstrap via `provideAppInitializer`. The container wakes while the user is still reading the login form; by the time they submit credentials, the API is warm. Only the first visitor after an idle period ever sees the delay.

## Error reporting

`ErrorReporter` + `GlobalErrorHandler` catch uncaught exceptions and forward to Sentry when `NG_APP_SENTRY_DSN` is configured. `HttpErrorResponse` is filtered out — those are handled per-request by the pages that made the call, so re-reporting would duplicate every 422.

The Sentry SDK is **lazy-loaded via dynamic import** and is not in `package.json`. Hobby builds without a DSN never pay the ~40 KB bundle cost. To enable Sentry, install the SDK yourself: `npm install --save-dev @sentry/browser`.

## Tests

```bash
npm test                     # Vitest
npm run test:coverage
npm run lint                 # ESLint
npm run format:check         # Prettier
```

## Project structure

```
src/app/
├── api.config.ts                       # API base URL export
├── app.config.ts                       # Providers: router, HttpClient + interceptor, error handler, app initializer
├── app.routes.ts                       # Lazy-loaded routes
├── app.ts                              # Root shell (topbar + <router-outlet>)
├── environment/                        # base / dev / prod (prod regenerated at build)
├── guards/auth.guard.ts                # Route protection
├── interceptors/auth.interceptor.ts    # Bearer token injection
├── services/
│   ├── api.ts                          # ApiService — user CRUD, unwraps {data: [...]}
│   ├── auth.service.ts                 # AuthService — login/2FA/reset/verify/enroll
│   ├── error-reporter.ts               # Sentry (lazy) forwarder
│   └── warmup.service.ts               # Cold-start mitigation ping
├── shared/global-error-handler.ts      # Angular ErrorHandler swap-in
├── pages/
│   ├── login/                          # Password step + link to forgot-password
│   ├── two-factor-challenge/           # TOTP code step
│   ├── forgot-password/                # Email input
│   ├── reset-password/                 # Reads token/email from query, new password
│   ├── users/                          # Admin CRUD + verify banner + settings link + logout
│   └── two-factor-settings/            # Enable/confirm/disable 2FA, QR + recovery codes
└── components/
    ├── user-form/                      # Create user (12+ char password, confirmation)
    ├── user-list/                      # List with role/verify/2FA pills + delete
    └── verify-banner/                  # Resend verification email
```

## Additional resources

- [Angular CLI Overview](https://angular.dev/tools/cli)
- Backend endpoint reference: [../backend/README.md](../backend/README.md)
- Free-tier deployment runbook: [../DEPLOY.md](../DEPLOY.md)
