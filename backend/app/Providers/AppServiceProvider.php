<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\CanResetPassword;
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
        $this->configureFrontendNotificationUrls();
    }

    /**
     * Point the framework's password-reset and email-verification notifications
     * at the Angular SPA rather than nonexistent server-rendered routes.
     *
     * ResetPassword: deep link into the SPA's /reset-password page — the SPA
     * reads token+email from the query string and calls POST /api/reset-password.
     *
     * VerifyEmail: keep the signature-bearing URL pointing at the API itself
     * (our GET /api/email/verify/{id}/{hash} endpoint), but rewrite the host
     * to APP_URL so the link works when reached from the outside world.
     */
    private function configureFrontendNotificationUrls(): void
    {
        ResetPassword::createUrlUsing(function (CanResetPassword $notifiable, string $token): string {
            $frontend = rtrim((string) config('app.frontend_url', ''), '/');

            return $frontend.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        });

        // Notifiables are always Eloquent models via the Notifiable trait; the
        // MustVerifyEmail contract alone doesn't expose getKey(). Narrow to
        // App\Models\User (our only notifiable) so PHPStan sees the method.
        VerifyEmail::createUrlUsing(function (User $notifiable): string {
            return URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes((int) config('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
            );
        });
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
