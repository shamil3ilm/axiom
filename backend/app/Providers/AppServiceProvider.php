<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureHttps();
        $this->configurePasswordRules();
        $this->configureRateLimiters();
    }

    private function configureHttps(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }

    private function configurePasswordRules(): void
    {
        Password::defaults(function () {
            $rule = Password::min(12)
                ->mixedCase()
                ->numbers()
                ->symbols();

            return $this->app->environment('production')
                ? $rule->uncompromised()
                : $rule;
        });
    }

    private function configureRateLimiters(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email', '');
            $key = Str::lower($email).'|'.$request->ip();

            return [
                Limit::perMinute(5)->by($key),
                Limit::perMinute(20)->by((string) $request->ip()),
            ];
        });

        RateLimiter::for('password-reset', fn (Request $request) => Limit::perHour(3)
            ->by(Str::lower((string) $request->input('email', '')).'|'.$request->ip()));

        RateLimiter::for('two-factor', fn (Request $request) => Limit::perMinute(5)
            ->by($this->requestSignature($request)));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($this->requestSignature($request)));
    }

    private function requestSignature(Request $request): string
    {
        $user = $request->user();

        return $user !== null ? 'user:'.$user->getKey() : 'ip:'.$request->ip();
    }
}
