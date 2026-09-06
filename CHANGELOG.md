# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this repo doesn't tag releases yet, so entries are grouped by phase.

## [Unreleased]

_Nothing pending._

## Phase 5 — Frontend catch-up + docs — 2026-09-06

### Added

- `AuthService` methods for the full new auth surface: two-factor login step (`verifyTwoFactor`), `forgotPassword`, `resetPassword`, `resendVerificationEmail`, `enableTwoFactor`, `confirmTwoFactor`, `disableTwoFactor`.
- New Angular pages: `/two-factor` (TOTP challenge after password step), `/forgot-password`, `/reset-password?token=&email=`, `/settings/two-factor` (enroll → QR + recovery codes → confirm → active → disable).
- `VerifyBannerComponent` at the top of `/users` when the current user's email is unverified, with a "Resend verification email" action.
- README rewrites (root, backend, frontend), `docs/SECURITY.md` (threat model + secret rotation), `docs/RUNBOOK.md` (incident playbook), this `CHANGELOG.md`.

### Changed

- `ApiService.getUsers()` now unwraps `{data: […]}` from the JSON:API-shaped resource response.
- `UserFormComponent` requires a password confirmation and enforces the 12-character minimum in the UI.
- `UserListComponent` renders role / verify / 2FA pills per user; delete uses a nicer confirm copy.
- `UsersComponent` gained a header with the signed-in user, a "Security" link to `/settings/two-factor`, and an in-page sign-out button.

### Fixed

- Login handled the 2FA branch: on `202` with `two_factor_required`, the SPA now routes to `/two-factor` with the challenge token in router state (not the URL) instead of failing.

## Phase 4 — Free deployment — 2026-09-06

### Added

- `backend/Dockerfile` (multi-stage, `php:8.3-fpm-alpine` runtime, opcache tuned, single container running php-fpm + nginx under supervisord).
- `backend/docker/{nginx.conf,supervisord.conf,entrypoint.sh}` — nginx listens on `$PORT`, entrypoint caches config + runs migrations + swaps `${PORT}` via sed, honors `SKIP_MIGRATIONS`.
- `render.yaml` — Render Blueprint declaring the free web service, all env vars, `/api/health` health check, auto-deploy from `main`.
- `frontend/vercel.json` — SPA rewrite, immutable cache on hashed assets, no-cache on `index.html`, edge-level security headers.
- `frontend/scripts/generate-environment.mjs` + `build:vercel` npm script — templates `environment.production.ts` from Vercel build env vars, fails loudly on missing `NG_APP_API_URL`.
- `frontend/services/warmup.service.ts` — fire-and-forget `/api/health` on app bootstrap to mask Render cold starts.
- `DEPLOY.md` — copy-pasteable Neon → Resend → Render → Vercel runbook + Oracle Cloud alternative.

### Changed

- Production DB: **MySQL → Postgres** (Neon has no MySQL free tier). Tests still on SQLite in-memory; CI switched to `postgres:16` service for parity. No schema changes needed (migrations use portable Schema Builder).
- Free-tier friendly defaults: `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION` all use `database` so no separate Redis is required.

## Phase 3 — Observability — 2026-09-06

### Added

- `sentry/sentry-laravel` wired via `Integration::handles()` in `withExceptions`; DSN + traces sample rate + PII flag driven by env.
- `RequestId` middleware (prepended) — accepts `X-Request-Id` from upstream if well-formed (regex-guarded to block CRLF injection), otherwise generates a UUID. Pushed into `Log::withContext`, echoed on the response.
- `stdout_json` Monolog channel (`JsonFormatter`) + `production` stack (`stdout_json` + `sentry`). `.env.example` prod default: `LOG_CHANNEL=production`.
- `HealthController` at `GET /api/health` — per-dependency (DB, cache) `ok` + `ms`, 200 healthy / 503 degraded.
- Frontend `ErrorReporter` (lazy `@sentry/browser` import — kept out of bundle when no DSN) + `GlobalErrorHandler` wired via `provideAppInitializer`.
- Tests: `HealthCheckTest`, `RequestIdTest`.

## Phase 2 — Quality gates — 2026-09-06

_Rolled into Phases 0 and 1a-c._ Coverage floor of 80% enforced via `composer test:coverage`; PHPStan level 6 clean; Pint auto-format across the tree including scaffolding files.

## Phase 1 — Security hardening + RBAC + password reset + email verification + 2FA — 2026-09-06

### Added

- `SecurityHeaders` middleware (HSTS in prod, X-Frame-Options DENY, nosniff, referrer-policy, permissions-policy, COOP).
- `AppServiceProvider`: force HTTPS in prod, `Password::defaults()` = 12+ chars mixedCase/numbers/symbols (uncompromised in prod), named rate limiters (login, password-reset, two-factor, api).
- Sanctum token expiration wired to `SANCTUM_TOKEN_EXPIRATION` env.
- CORS driven by `CORS_ALLOWED_ORIGINS` env (comma-separated).
- `UserResource` strips password / bearer / 2FA secret / recovery codes on serialization.
- **RBAC** via `spatie/laravel-permission` — `admin` and `user` roles seeded; user CRUD gated behind `role:admin` + `verified` middleware.
- **Password reset** — `POST /api/forgot-password` (enumeration-safe 200), `POST /api/reset-password` using the framework Password broker.
- **Email verification** — signed `GET /api/email/verify/{id}/{hash}`, `POST /api/email/verification-notification` for resend.
- **TOTP 2FA** — `pragmarx/google2fa-laravel`, migration adds `two_factor_{secret,recovery_codes,confirmed_at}`, `POST /api/two-factor/{enable,confirm}` + `DELETE /api/two-factor` (password-guarded). Two-step login: 202 + `challenge_token` → `POST /api/login/two-factor` for bearer. QR SVG via `bacon/bacon-qr-code`.
- 27 feature tests + 2 unit tests covering all of the above (34 tests, 96 assertions total including Phase 3).

### Changed

- `UserController::store` now requires `password_confirmation` and applies `Password::defaults()`; new users automatically get the `user` role.
- `UserController::destroy` refuses to delete the currently authenticated user.
- `User` model implements `MustVerifyEmail`, uses `HasRoles`, hides 2FA fields in serialization.

## Phase 0 — Foundation — 2026-09-06

### Added

- Git repo initialized; pushed to <https://github.com/shamil3ilm/axiom>.
- Root `.gitignore` consolidating monorepo ignores.
- GitHub Actions CI at `.github/workflows/ci.yml`: PHPUnit + Pint + PHPStan L6 for backend, `npm ci && npm run build && npm test` + ESLint + Prettier for frontend, both against Postgres service on push/PR to `main`.
- `backend/`: larastan L6 (`phpstan.neon`), Laravel Pint config (`pint.json`) with `declare_strict_types`, unified `composer check` entry point, `composer test:coverage` gated at 80%.
- `backend/.env.example`: production-shaped defaults (Postgres, Redis-less DB cache, SMTP, HTTPS session cookies, env-driven CORS + Sanctum expiration).
- `frontend/eslint.config.js` (flat config, `angular-eslint` 21) + `.prettierrc.json` + `.prettierignore` with `lint` / `format` npm scripts.

## Baseline

- Laravel 12 backend with Sanctum + user CRUD endpoints.
- Angular 21 SPA with login + user management page.
