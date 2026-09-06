#!/usr/bin/env bash
# Container entrypoint: prep runtime config, run migrations, then hand off
# to supervisord (which starts php-fpm + nginx).
#
# Runs on every cold boot on Render's free tier. Keep it idempotent and
# fail loudly if the app can't start — a silent-failure container will
# just serve 502s.

set -euo pipefail

: "${PORT:=10000}"
export PORT

# Substitute $PORT into the nginx config (nginx.conf uses ${PORT}).
# sed is always in Alpine so we don't need to pull in gettext for envsubst.
sed -i "s#\${PORT}#${PORT}#g" /etc/nginx/nginx.conf

# Ensure runtime dirs exist and are writable. Render's ephemeral filesystem
# resets between deploys, so we do this every boot rather than at build.
mkdir -p storage/logs storage/framework/{cache,sessions,views,testing}
chmod -R ug+rwx storage bootstrap/cache

# One-shot Laravel bootstrap: cache config/routes/views for perf, then run
# any pending migrations against the linked database. --force is required
# because APP_ENV=production disables the interactive prompt.
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

if [[ "${SKIP_MIGRATIONS:-false}" != "true" ]]; then
    php artisan migrate --force --no-interaction
fi

# One-shot seeder toggle. Set SEED_ON_STARTUP=true in Render env, redeploy,
# then REMOVE the flag afterward — otherwise every deploy creates 10 more
# factory users. UserSeeder is idempotent for the admin account (uses
# updateOrCreate), but the factory-generated users are not.
if [[ "${SEED_ON_STARTUP:-false}" == "true" ]]; then
    echo "==> SEED_ON_STARTUP=true — running UserSeeder"
    php artisan db:seed --class=UserSeeder --force --no-interaction || true
fi

# Warm the app + confirm the container is healthy before nginx exposes 8080.
# A failed boot here surfaces in Render's deploy log instead of the health check.
php artisan about --only=environment || true

exec "$@"
