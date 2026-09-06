# Axiom — Backend (API)

**Laravel 12 REST API** for Axiom. Sanctum bearer-token authentication, RBAC via `spatie/laravel-permission`, TOTP two-factor authentication, password reset, email verification, structured logging, and a health probe.

## Tech stack

- Laravel 12, PHP 8.3+
- Laravel Sanctum — Bearer-token auth
- spatie/laravel-permission — RBAC (admin / user roles)
- pragmarx/google2fa-laravel + bacon/bacon-qr-code — TOTP 2FA
- sentry/sentry-laravel — error tracking
- Postgres 16 in production, SQLite in tests
- PHPUnit 11, PHPStan L6 (larastan), Laravel Pint

## Requirements

- PHP ≥ 8.3 with `pdo_pgsql`, `mbstring`, `bcmath`, `intl`, `zip`
- Composer 2

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=UserSeeder     # admin@example.com / password
php artisan serve                          # http://127.0.0.1:8000
```

> `composer run dev` runs `php artisan serve` + queue worker + log tailer + Vite in parallel.

### Seeded login

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password` | admin |

10 additional users are created via `UserFactory`, each assigned the `user` role.

## Configuration

The `.env.example` ships production-shaped: Postgres (Neon), Redis-less (DB cache/session), Resend SMTP, HTTPS session cookies, Sentry-ready.

For local development against Laragon MySQL, override:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=axiom
DB_USERNAME=root
DB_PASSWORD=
APP_ENV=local
APP_DEBUG=true
LOG_CHANNEL=single
```

For SQLite (fastest setup, zero deps):
```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite
```
Then `touch database/database.sqlite && php artisan migrate`.

### CORS

Allowed origins come from `CORS_ALLOWED_ORIGINS` (comma-separated). Defaults to Angular dev servers on `4200`. See [`config/cors.php`](config/cors.php).

### Sanctum tokens

Expiration comes from `SANCTUM_TOKEN_EXPIRATION` (minutes). Unset = tokens never expire. In prod: `60`. See [`config/sanctum.php`](config/sanctum.php).

## API reference

Base URL: `http://127.0.0.1:8000/api`

### Public endpoints

| Method | Endpoint | Rate limit | Description |
|--------|----------|------------|-------------|
| `GET` | `/health` | none | Health probe: DB + cache reachability, per-check latency. `200` healthy / `503` degraded. |
| `POST` | `/login` | 5/min per email+IP | Password step. Returns `{user, token, token_type}` OR `202` with `{two_factor_required, challenge_token}` if 2FA is enabled. |
| `POST` | `/login/two-factor` | 5/min per user or IP | Exchange challenge token + TOTP code for bearer. |
| `POST` | `/forgot-password` | 3/hour per email+IP | Emails a reset link. Always `200` (enumeration-safe). |
| `POST` | `/reset-password` | 3/hour per email+IP | Consume reset token + new password. |
| `GET` | `/email/verify/{id}/{hash}` | signed URL | Verify email from mail link. |

### Authenticated endpoints (`Authorization: Bearer <token>`)

| Method | Endpoint | Additional guards | Description |
|--------|----------|-------------------|-------------|
| `POST` | `/logout` | — | Revoke current bearer. |
| `POST` | `/email/verification-notification` | — | Resend the verification email. |
| `POST` | `/two-factor/enable` | 5/min | Generate + store secret. Returns `{secret, qr_svg, recovery_codes}`. |
| `POST` | `/two-factor/confirm` | 5/min | Confirm enrollment with a valid TOTP code. |
| `DELETE` | `/two-factor` | 5/min, password-guarded | Disable 2FA (requires current password in body). |
| `GET` | `/users` | `role:admin`, `verified` | List users (returned as `{data: [...]}`). |
| `POST` | `/users` | `role:admin`, `verified` | Create user (`name`, `email`, `password`, `password_confirmation`). |
| `DELETE` | `/users/{id}` | `role:admin`, `verified` | Delete user. Cannot delete yourself. |

### Password rules

Enforced via `Password::defaults()` in `AppServiceProvider`:
- Minimum 12 characters
- Mixed case
- At least one number
- At least one symbol
- Not present in the HaveIBeenPwned breach corpus (production only)

## Observability

- **Logs**: production stack fans out to stdout (Monolog `JsonFormatter`) + Sentry
- **Request IDs**: `X-Request-Id` middleware echoes upstream or generates a UUID; pushed into `Log::withContext` for every downstream log line and echoed back on the response
- **Sentry**: enable by setting `SENTRY_LARAVEL_DSN`. `SENTRY_TRACES_SAMPLE_RATE` defaults to 0.1
- **Health**: `GET /api/health` returns per-dependency latency; wire your uptime monitor here

## Quality gates

```bash
composer test           # PHPUnit — 34 tests, 96 assertions
composer test:coverage  # requires pcov / xdebug; fails below 80%
composer lint           # Laravel Pint (check only)
composer lint:fix       # Laravel Pint (auto-fix)
composer stan           # PHPStan level 6 via larastan
composer check          # all three: lint + stan + test
```

CI runs all of the above against a real Postgres 16 service.

## Project structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Auth/                       # Login, TwoFactor, PasswordReset, EmailVerification
│   │   ├── HealthController.php
│   │   └── UserController.php
│   ├── Middleware/
│   │   ├── RequestId.php               # X-Request-Id propagation
│   │   └── SecurityHeaders.php         # HSTS, X-Frame-Options, etc.
│   └── Resources/
│       └── UserResource.php            # Redacts password/secret/recovery on serialization
├── Models/User.php                     # HasApiTokens + HasRoles + MustVerifyEmail
├── Providers/AppServiceProvider.php    # Rate limiters, password rules, HTTPS
└── Services/Auth/
    └── TwoFactorChallengeService.php   # Challenge issue + verify + recovery codes
config/
├── cors.php                            # CORS_ALLOWED_ORIGINS env driven
├── sentry.php                          # Sentry SDK config
├── two_factor.php                      # Challenge TTL
└── permission.php                      # spatie/laravel-permission
database/
├── migrations/                         # users, sessions, cache, jobs, tokens, permissions, 2fa columns
└── seeders/
    ├── DatabaseSeeder.php
    ├── RolesSeeder.php                 # admin + user roles
    └── UserSeeder.php                  # seeded admin + 10 factory users
docker/
├── nginx.conf                          # Render single-container FPM+Nginx setup
├── supervisord.conf
└── entrypoint.sh                       # Runs migrations + config cache on cold boot
Dockerfile                              # Multi-stage prod image
routes/api.php
tests/
├── Feature/                            # LoginTest, TwoFactorTest, PasswordResetTest, EmailVerificationTest, UserManagementTest, HealthCheckTest, RequestIdTest, SecurityHeadersTest
└── Unit/Services/TwoFactorChallengeServiceTest.php
```

## License

Built on the Laravel framework, open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
