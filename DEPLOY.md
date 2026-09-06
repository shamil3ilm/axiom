# Axiom — Free Deployment Runbook

**Stack:** Vercel (frontend, free) + Render.com (backend, free web service) + Neon (Postgres, free) + Resend (email, free 3k/mo). Total cost: **$0/month**.

**Single trade-off:** Render's free web service **sleeps after 15 minutes of inactivity** and takes ~30–60 seconds to cold-boot on the first request after that. Acceptable for a demo / portfolio; not for production traffic. Upgrade to Render's $7/mo Starter tier to remove the sleep.

---

## 1. Database — Neon

1. Sign up at <https://console.neon.tech> (GitHub login works).
2. **Create Project** → name it `axiom`, region **US East (Ohio)** for lowest latency to Render Oregon (or match your Render region).
3. Neon shows a **Connection string**. You'll need the five parts individually:
   - `Host` → `ep-xxxxx-xxxxx.us-east-2.aws.neon.tech`
   - `Database` → `neondb` (or rename to `axiom` via the dashboard)
   - `Username` → `neondb_owner`
   - `Password` → shown once — copy it now
   - `Port` → `5432`
4. Keep the tab open — you'll paste these into Render in step 3.

Free tier: 0.5 GB storage, one project, autoscale to zero. Plenty for the seeded 11 users + tokens.

## 2. Email — Resend

1. Sign up at <https://resend.com>.
2. **API Keys** → **Create API Key** → name it `axiom-prod`, permission **Full Access**. Copy the `re_...` key.
3. **Domains** → either verify your own domain (recommended) or use the shared `onboarding@resend.dev` sender for testing.
4. Set the `MAIL_FROM_ADDRESS` env var to a verified sender.

Free tier: 3,000 emails/month, 100/day. Enough for password reset + email verification flows.

## 3. Backend — Render

1. Sign up at <https://render.com> (GitHub login).
2. **New +** → **Blueprint** → connect this repo (`shamil3ilm/axiom`). Render will detect `render.yaml` at the root and prompt you to create the `axiom-api` service.
3. Fill in the env vars marked `sync: false` in the blueprint:

   | Env var | Value |
   |---|---|
   | `APP_URL` | `https://axiom-api.onrender.com` (Render shows the final URL after creation — update after) |
   | `APP_FRONTEND_URL` | `https://axiom.vercel.app` (fill after Vercel deploy — see step 4) |
   | `DB_HOST` | Neon `Host` from step 1 |
   | `DB_DATABASE` | Neon `Database` |
   | `DB_USERNAME` | Neon `Username` |
   | `DB_PASSWORD` | Neon `Password` |
   | `MAIL_PASSWORD` | Resend `re_...` API key from step 2 |
   | `MAIL_FROM_ADDRESS` | Verified sender email |
   | `SANCTUM_STATEFUL_DOMAINS` | `axiom.vercel.app` (fill after Vercel deploy) |
   | `CORS_ALLOWED_ORIGINS` | `https://axiom.vercel.app` (fill after Vercel deploy) |
   | `SENTRY_LARAVEL_DSN` | (optional; leave blank to disable) |

4. Click **Apply** — Render builds the Docker image and runs the entrypoint, which caches config + runs migrations automatically.
5. First build takes ~5–8 minutes. Watch the deploy log for `Configuration cache created successfully` and `Database seeded`. Health check `/api/health` should turn green.
6. Once live, note the URL — something like `https://axiom-api-a1b2.onrender.com`.

### Seed the admin user (one-time)

Render's free tier doesn't expose a shell, so run the seeder via a temporary env var:

1. **Environment** → add `RUN_ONCE_SEED=true` → save.
2. Add this to the top of `backend/docker/entrypoint.sh` (temporarily, then revert):
   ```bash
   if [[ "${RUN_ONCE_SEED:-false}" == "true" ]]; then
       php artisan db:seed --class=UserSeeder --force
   fi
   ```
3. Trigger a manual deploy, verify admin user exists, then remove the flag.

Alternatively, seed locally against Neon:
```bash
DB_HOST=<neon-host> DB_DATABASE=<neon-db> DB_USERNAME=<neon-user> DB_PASSWORD=<neon-pass> \
  php artisan db:seed --class=UserSeeder --force
```

## 4. Frontend — Vercel

Before importing, edit `frontend/src/app/environment/environment.production.ts` and set `apiUrl` to your Render URL + `/api`. Commit + push. Vercel picks up whatever is committed.

1. Sign up at <https://vercel.com> (GitHub login).
2. **Add New** → **Project** → import `shamil3ilm/axiom`.
3. **Root Directory** → `frontend` (Vercel auto-detects `vercel.json`).
4. **Framework Preset** → **Other** (do not use "Angular" — that overrides our build command from `vercel.json`).
5. **Environment Variables** → nothing to add. The API URL is committed in `environment.production.ts`.
6. **Deploy** → Vercel runs `npm run build -- --configuration production` per `vercel.json`.
7. Once deployed, Vercel shows the URL — e.g. `https://axiom-a1b2.vercel.app`.

**To rotate the API URL later:** edit `environment.production.ts`, commit, push. Vercel auto-deploys on the push. No dashboard visit needed.

## 5. Wire the two together

Return to Render and update the deferred env vars now that both URLs exist:

- `APP_FRONTEND_URL` → `https://axiom-a1b2.vercel.app`
- `SANCTUM_STATEFUL_DOMAINS` → `axiom-a1b2.vercel.app`
- `CORS_ALLOWED_ORIGINS` → `https://axiom-a1b2.vercel.app`

Trigger a manual redeploy on Render for the CORS change to take effect.

## 6. Smoke test

Run through this checklist after the first successful deploy:

- [ ] `curl https://<render-url>/api/health` returns `200` with `{"status":"ok"}`.
- [ ] Open `https://<vercel-url>/login` → login form renders.
- [ ] Sign in with `admin@example.com` / `password` → redirects to `/users`.
- [ ] User list loads (should show 11 users from the seeder).
- [ ] Create a new user → appears in the list.
- [ ] Delete a user (not yourself) → disappears from the list.
- [ ] Log out → redirects to `/login` and the bearer token is cleared.
- [ ] Attempt a 6th failed login within 60s → returns `429 Too Many Requests`.
- [ ] Trigger password reset → email arrives from Resend within 30 seconds.

## Troubleshooting

**Deploy stuck at "Building" for > 10 minutes.** Render's free tier has limited build minutes and can queue during peak hours. Check the deploy log — if you see `Killed` mid-composer-install, the build ran out of memory. Solution: bump to the $7 Starter plan, or trim `composer.json` dev-only optional deps.

**502 from Render right after deploy.** Container failed to boot. Common causes:
- Missing `APP_KEY` — Render's `generateValue: true` should populate it, but if `render.yaml` was edited after service creation, regenerate manually via `php artisan key:generate --show`.
- DB unreachable — verify `PGSSLMODE=require` and the Neon host is spelled correctly (typos silently fail).

**"CORS blocked" in browser console.** `CORS_ALLOWED_ORIGINS` on Render doesn't match the Vercel URL exactly (protocol + host, no trailing slash). Redeploy backend after fixing.

**Login returns 419 or CSRF error.** Sanctum thinks the SPA is trying stateful auth. Verify `SANCTUM_STATEFUL_DOMAINS` contains only the Vercel host (no protocol, no path).

**Slow first request every ~15 min.** Render free tier sleeps. Options:
- Accept it (fine for portfolio).
- Wire an external uptime pinger (UptimeRobot free tier, 5-min interval) → violates Render's TOS if used to keep the service warm, so don't.
- Upgrade to Render Starter ($7/mo, no sleep).

## Alternative — Oracle Cloud Always Free (no cold starts)

If cold starts bother you and you're willing to spend 2 hours on VM setup:

1. Sign up for [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/) — get 2× ARM VMs (4 OCPU, 24 GB RAM total), forever free.
2. Provision one Ubuntu 22.04 ARM VM.
3. Install [Coolify](https://coolify.io) with the one-line installer — self-hosted Vercel/Heroku alternative.
4. Point Coolify at this repo, use the same `Dockerfile`, connect the same Neon Postgres. Coolify handles TLS via Let's Encrypt.

Vercel still handles the frontend (free forever). Total cost stays $0, no cold starts.
