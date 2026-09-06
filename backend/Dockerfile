# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the Axiom Laravel backend.
# Runs on Render.com's free web service tier: a single container listening
# on $PORT (Render sets 10000 by default). Uses PHP-FPM + Nginx inside the
# same image so the free plan's 1-service limit is enough.
#
# Layers are ordered so composer install re-uses cache when only app code
# changes. Vendor and node modules never make it into the runtime layer.

# --- Stage 1: composer deps --------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

# Copy only the lock manifest first so dep resolution is cached until
# composer.json / composer.lock actually change.
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# --- Stage 2: runtime --------------------------------------------------------
FROM php:8.3-fpm-alpine AS runtime

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=production \
    PORT=10000

RUN apk add --no-cache \
        nginx \
        supervisor \
        bash \
        icu-dev \
        postgresql-dev \
        oniguruma-dev \
        libzip-dev \
        libxml2-dev \
        curl \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        bcmath \
        intl \
        opcache \
        zip

# Tuned opcache for a long-lived worker — safe defaults for production.
RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.enable_cli=0'; \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=16'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.validate_timestamps=0'; \
    } > /usr/local/etc/php/conf.d/opcache.ini \
    && { \
        echo 'expose_php=Off'; \
        echo 'memory_limit=256M'; \
        echo 'upload_max_filesize=8M'; \
        echo 'post_max_size=8M'; \
    } > /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html

# Composer binary from the vendor stage — we need it in runtime to rebuild
# the classmap once the full app tree is in place (the vendor stage only
# had composer.json + composer.lock, so its autoloader doesn't know about
# app/ classes).
COPY --from=vendor /usr/bin/composer /usr/local/bin/composer

# Vendor first (cached), then the rest of the app.
COPY --from=vendor /app/vendor ./vendor
COPY . .

# Post-install artisan tasks that composer skipped in the vendor stage
# (they need the full app tree, not just composer.json).
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
