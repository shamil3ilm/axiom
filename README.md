# Axiom

A production-ready **user management** application: a **Laravel 12 REST API** with token authentication, RBAC, TOTP two-factor, password reset, and email verification, paired with an **Angular 21 single-page frontend**.

Deploys free to Render + Vercel + Neon Postgres + Resend. Cost: **$0/month** for portfolio scale.

| Project | Description | Docs |
|---------|-------------|------|
| **`backend/`** | Laravel 12 API — Sanctum bearer tokens, spatie/laravel-permission RBAC, 2FA via google2fa, Postgres | [backend/README.md](backend/README.md) |
| **`frontend/`** | Angular 21 SPA — login + 2FA challenge, password reset, 2FA settings, admin user CRUD | [frontend/README.md](frontend/README.md) |
| **Deploy runbook** | End-to-end free-tier deployment (Render + Vercel + Neon + Resend) | [DEPLOY.md](DEPLOY.md) |
| **Security policy** | Threat model, disclosure, secret rotation | [docs/SECURITY.md](docs/SECURITY.md) |
| **Runbook** | Incident response, rollback, common failures | [docs/RUNBOOK.md](docs/RUNBOOK.md) |
| **Changelog** | Version history | [CHANGELOG.md](CHANGELOG.md) |

## Architecture

```
┌─────────────────────┐    HTTPS + Bearer token    ┌───────────────────────┐
│   Angular 21 SPA     │  ────────────────────────▶ │   Laravel 12 API      │
│   (Vercel)           │                            │   (Render Docker)     │
└─────────────────────┘                            └───────────────────────┘
                                                              │
                                                              ▼
                                                  ┌───────────────────────┐
                                                  │  Neon Postgres         │
                                                  │  (sessions, cache,     │
                                                  │   users, tokens)       │
                                                  └───────────────────────┘
                                                              │
                                                              ▼
                                                  ┌───────────────────────┐
                                                  │  Resend (SMTP)         │
                                                  │  password reset +      │
                                                  │  email verification    │
                                                  └───────────────────────┘
```

The SPA authenticates with `POST /api/login` and receives a Sanctum bearer token. If the account has 2FA enabled, the login endpoint returns a **short-lived challenge token** and the SPA prompts for a TOTP code at `POST /api/login/two-factor` before the real bearer is issued. Every subsequent request carries `Authorization: Bearer <token>`.

## Feature summary

- **Auth**: password login, TOTP two-factor (with recovery codes), password reset, signed email verification
- **RBAC**: `admin` and `user` roles via `spatie/laravel-permission`; user CRUD is admin-only and requires a verified email
- **Rate limiting**: per-email login throttle (5/min), password-reset throttle (3/hour), API throttle (60/min/user)
- **Security headers**: HSTS in prod, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP
- **Password rules**: 12+ chars, mixed case, numbers, symbols, `uncompromised()` check in production
- **Observability**: JSON logs to stdout, Sentry integration, request-ID correlation (`X-Request-Id`), `/api/health` probe with per-dependency latency
- **CI**: PHPUnit + Pint + PHPStan L6 against a real Postgres service; Angular build + ESLint + Prettier + Vitest

## Quick start (local development)

```bash
# Backend  →  http://127.0.0.1:8000
cd backend
composer install
cp .env.example .env
# Point .env at local MySQL (Laragon) or SQLite for zero setup — see backend/README.md
php artisan key:generate
php artisan migrate
php artisan db:seed --class=UserSeeder     # seeds admin@example.com / password
php artisan serve

# Frontend  →  http://localhost:4200
cd frontend
npm install
npm start
```

Open <http://localhost:4200>, sign in with `admin@example.com` / `password`.

## Deploying for free

See [DEPLOY.md](DEPLOY.md) for the end-to-end runbook. Total setup: ~30 minutes. Total cost: $0/month.

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Laravel 12, PHP 8.3+, Sanctum, spatie/laravel-permission, google2fa-laravel |
| Database | Postgres 16 (Neon in prod, SQLite in tests, MySQL locally optional) |
| Frontend | Angular 21, TypeScript 5.9, RxJS 7, SCSS |
| Testing | PHPUnit 11 (34 tests) + Vitest |
| Static analysis | PHPStan L6 (larastan), Laravel Pint |
| Observability | Sentry, JSON logging, request IDs |
| Deploy | Render (Docker) + Vercel + Neon + Resend |

## License

Built on the Laravel framework, open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
