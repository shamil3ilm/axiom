# Security Policy

## Supported versions

Only the `main` branch is supported. Deploy from `main`; there are no release branches.

## Reporting a vulnerability

Do **not** open a public issue for security vulnerabilities. Email <security@shamil.dev> (or whichever address you monitor) with:

- A clear description of the issue and its impact
- Steps to reproduce (or a minimal PoC)
- Any suggested remediation, if you have one

Expect an acknowledgement within 3 business days. Once we have a fix, we'll coordinate disclosure with you.

## Threat model

Axiom is a small user-management app, but it handles credentials and personal data. The high-level threats considered:

| Threat | Mitigation |
|--------|------------|
| Credential stuffing on `/login` | Rate limiter (5/min per email+IP, 20/min per IP), bcrypt cost 12 |
| Account takeover via weak password | `Password::defaults()` = 12+ chars, mixedCase, numbers, symbols, `uncompromised()` in production |
| Session hijack via XSS-leaked token | Tokens live in `localStorage` (documented trade-off — see below); `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP-ready |
| CSRF | Not applicable — API uses stateless bearer tokens, not cookies. Sanctum stateful mode disabled outside development. |
| Session hijack via token reuse | Sanctum token expiration configured via `SANCTUM_TOKEN_EXPIRATION` (60 min in prod); `/logout` revokes the current token server-side |
| MITM | HTTPS enforced in production via `URL::forceScheme('https')` + `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| Account enumeration via `/forgot-password` | Endpoint always returns 200 regardless of whether the email exists |
| Brute-force TOTP guessing | 5/min rate limit on `/login/two-factor`, 6-digit code has 30-second window |
| Recovery code theft | Codes encrypted at rest; each code is single-use and hash-compared with `hash_equals` (constant-time) |
| SQL injection | Eloquent + query builder only; no raw string interpolation; validated at the Request boundary |
| XSS in QR SVG | Backend generates SVG from a trusted library (`bacon/bacon-qr-code`) with our own inputs; SPA marks it trusted at the single render site |
| Log injection / header injection | `RequestId` middleware regex-validates any incoming `X-Request-Id` before echoing (blocks CRLF) |
| PII in error reports | `SENTRY_SEND_DEFAULT_PII=false` by default |
| Dependency vulnerabilities | `composer audit` in CI; Dependabot/Renovate recommended |
| Secrets in git | `.env` in `.gitignore`; `.env.example` ships placeholders only; **rotate any secret ever committed** — see below |

### Documented trade-off: token storage

Bearer tokens are stored in `localStorage` for simplicity. This is vulnerable to XSS (a successful script injection can exfiltrate the token). Mitigations layered on top:

- Angular's default output sanitization is aggressive; no `bypassSecurityTrust*` used except at one controlled site (2FA QR SVG from our own backend)
- Strict Content-Security-Policy is straightforward to add and recommended for production hardening (not yet enforced)
- Short token TTL (60 min) limits the blast radius of a leaked token
- Sanctum's `token_prefix` support (`SANCTUM_TOKEN_PREFIX` env) enables GitHub's secret-scanning to catch accidentally committed tokens

For higher assurance, migrate to Sanctum's SPA mode with httpOnly cookies + CSRF. Deliberately not the default here because it complicates cross-origin deploys (Vercel + Render).

## Secret rotation

If any of these are exposed, rotate immediately:

| Secret | How to rotate |
|--------|---------------|
| `APP_KEY` | `php artisan key:generate --show`, update on Render, redeploy. **All existing sessions and encrypted 2FA secrets become undecryptable.** Only rotate this in a real incident. |
| `DB_PASSWORD` | Rotate in Neon dashboard → paste new value into Render env → redeploy |
| `MAIL_PASSWORD` (Resend API key) | Revoke old key in Resend dashboard → create new → update Render env → redeploy |
| `SENTRY_LARAVEL_DSN` | Rotate project DSN in Sentry → update env |
| Sanctum bearer tokens (all) | `php artisan sanctum:prune-expired --hours=0` on Render shell (upgrade to paid tier required for shell) OR run migration to truncate `personal_access_tokens` |
| User passwords (breach response) | Force-invalidate: set `remember_token = null` and `password_reset_required_at = now()` on affected rows, then email affected users a reset link |

## Compliance / disclosure obligations

None assumed. Add specifics here if the deployed instance handles regulated data (GDPR data subject requests, breach notification windows, etc.).

## Security-relevant tests

Run `composer test` in `backend/` to exercise:

- Login rate limiting activation
- 2FA challenge flow (issue + verify + expiry)
- Password reset with expired / mismatched token
- Email verification signature validation
- RBAC gates (unauthenticated 401, non-admin 403, unverified admin 403, admin allowed)
- Security headers presence on API responses
- `X-Request-Id` header injection protection

CI runs the full suite on every push to `main`.
