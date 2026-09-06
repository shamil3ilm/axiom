# Axiom — Operations Runbook

Playbook for the on-call engineer (which today is probably you, alone). Keep it concise and specific.

## Service map

- **Backend** (`axiom-api`) — Render web service, Docker, region `oregon`. Dashboard: <https://dashboard.render.com>
- **Frontend** (`axiom`) — Vercel project, framework detected as "Other". Dashboard: <https://vercel.com>
- **Database** — Neon Postgres, one project, autoscale to zero. Dashboard: <https://console.neon.tech>
- **Email** — Resend, single sender domain. Dashboard: <https://resend.com>
- **Error tracking** — Sentry (optional). Dashboard: <https://sentry.io>

Repo: <https://github.com/shamil3ilm/axiom>. `main` is deployed on every push.

## Health & monitoring

- Backend health: `GET https://<render-url>/api/health` → JSON with `status`, per-check `ok` + `ms`
- Uptime: wire a free UptimeRobot / Better Stack monitor to `/api/health` (5-min interval — this does NOT violate Render's ToS because health-check pings are permitted; the ToS-forbidden pattern is pinging *to prevent sleep*)
- Sentry dashboard for exceptions (both backend and frontend when DSN set)
- Vercel Deployments tab for frontend build status
- Render Logs tab for backend stdout / stderr

## Common incidents

### 502 / 503 from the API

**First check:** `curl https://<render-url>/api/health` — does it respond at all, or is it a connection failure?

- **Connection failure or 502**: container is booting or failed to boot. Open Render → the failing deploy → **Logs** tab. Common causes:
  - Missing `APP_KEY` — verify env var exists; if you renamed the service, regenerate with `php artisan key:generate --show` locally and paste it in.
  - DB unreachable — verify `DB_HOST` spelling; check Neon dashboard is not paused. Neon free tier idles quickly but wakes on first query.
  - Migrations failed on boot — search log for `SQLSTATE`, fix the migration, redeploy. If you need to bypass a broken migration, temporarily set `SKIP_MIGRATIONS=true` in Render env, redeploy, then manually resolve.
- **503 with `{status: degraded}` payload** — `/api/health` returned JSON but a check failed. The response includes which check failed and why. Act on that specifically (usually DB or cache).

### Login stopped working

**First check:** Sign in via the API directly, bypassing the SPA:

```bash
curl -X POST https://<render-url>/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

- **200 with token** — the API is fine. Look at the browser console: CORS blocked, wrong `NG_APP_API_URL`, or the SPA is on an old cached bundle.
- **422 credentials incorrect** — password was rotated, DB is fresh (missing seeder), or the user is on a stale replica.
- **429** — hit login rate limit (5/min per email+IP). Wait 60s.
- **500** — check Render logs. Likely a config change broke bootstrap.

### Users can't reset password / verify email

**First check:** Resend dashboard → **Emails** tab. Are outbound emails leaving?

- If yes but not arriving: sender domain not verified, or the address bounced. Look at the specific delivery event.
- If no outbound events: verify `MAIL_MAILER=smtp`, `MAIL_HOST=smtp.resend.com`, `MAIL_PORT=465`, `MAIL_USERNAME=resend`, `MAIL_PASSWORD=<Resend API key>`, `MAIL_FROM_ADDRESS=<verified sender>`. In Render logs, search for `Symfony\Component\Mailer\Exception`.

### "CORS blocked" in browser

Almost always: `CORS_ALLOWED_ORIGINS` on Render doesn't exactly match the Vercel URL. Rules:

- No trailing slash
- Include the scheme (`https://…`)
- Comma-separate multiple origins
- Redeploy backend after changes (env changes trigger a redeploy automatically on Render)

### First request every 15 min is very slow

Expected — Render free tier sleeps after 15 min idle. `WarmupService` in the frontend mitigates by warming on app bootstrap, so this only affects users who land on the SPA cold.

If it's a real problem: upgrade to Render Starter ($7/mo, no sleep) or migrate to the Oracle Cloud path in `DEPLOY.md`.

## Rollback

### Backend

Render **Deploys** tab → find the last known-good deploy → **Rollback**. Zero downtime (spins up new container, then flips the routing).

If the bad deploy caused a migration that must also be reversed:
1. Rollback the deploy (this pins the image).
2. Manually run `php artisan migrate:rollback --step=1` — currently requires a paid Render plan for shell access, or run locally against the same Neon connection string.
3. If migration rollback isn't safe (destructive down step), take a Neon branch snapshot first: Neon dashboard → Branches → Create Branch from prod. Restore via branch swap if needed.

### Frontend

Vercel **Deployments** tab → find the last known-good production deploy → **⋯ menu** → **Promote to Production**. Instant.

## Log queries

Backend logs are JSON on stdout (Render captures them). Common jq filters when copy-pasting a log block locally:

```bash
# Recent errors
jq 'select(.level_name == "ERROR")'

# By request ID (correlate a single request across log lines)
jq 'select(.context.request_id == "abc-123-def")'

# Slow requests (custom logging required — placeholder)
jq 'select(.context.duration_ms > 1000)'
```

Add `LOG_LEVEL=debug` temporarily on Render to increase verbosity for a single incident — revert to `info` when done to avoid noise.

## Backups

- **Neon** free tier: automatic point-in-time restore for 24 hours. To keep longer history, create a branch weekly. Neon dashboard → Branches → Create Branch → name it `weekly-YYYY-MM-DD`.
- **Code**: GitHub is the source of truth; no local-only branches should exist for anything you can't afford to lose.
- **Secrets**: Render env vars, Vercel env vars, Resend keys, and Sentry DSN are not backed up automatically. Keep an encrypted copy (password manager) of the current values so a lost-account scenario is recoverable.

## Deploying a hotfix

1. Reproduce locally, write a failing test (`backend/tests/Feature/…`).
2. Fix; make the test pass; `composer check` locally.
3. Push to `main`. CI runs; Render auto-deploys backend; Vercel auto-deploys frontend on push.
4. Watch `/api/health` and Sentry for 5 minutes. Rollback if things get worse.

## Escalation

Solo project. There is no on-call rotation. If you're stuck and it's production-down:

1. Rollback first, diagnose second.
2. If rollback doesn't restore service (data corruption, DB migration), Neon point-in-time restore is the fastest lever.
3. If you're beyond your depth on a security incident, don't paper over it — take the site offline (Render → Suspend service, Vercel → Pause deployments), and reach out to a trusted second pair of eyes before restoring.
