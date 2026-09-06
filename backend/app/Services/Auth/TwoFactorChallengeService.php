<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Str;
use PragmaRX\Google2FALaravel\Facade as Google2FA;

final class TwoFactorChallengeService
{
    public function __construct(
        private readonly CacheRepository $cache,
    ) {}

    public function issueChallenge(User $user): string
    {
        $token = Str::random(64);

        $this->cache->put(
            $this->cacheKey($token),
            $user->getKey(),
            now()->addMinutes($this->ttlMinutes()),
        );

        return $token;
    }

    public function verifyChallenge(string $token, string $code): ?User
    {
        $userId = $this->cache->get($this->cacheKey($token));

        if ($userId === null) {
            return null;
        }

        /** @var User|null $user */
        $user = User::query()->find($userId);

        if ($user === null || ! $user->hasTwoFactorEnabled()) {
            return null;
        }

        if (! $this->verifyCode($user, $code)) {
            return null;
        }

        $this->cache->forget($this->cacheKey($token));

        return $user;
    }

    public function verifyCode(User $user, string $code): bool
    {
        $secret = $user->two_factor_secret;
        if ($secret === null) {
            return false;
        }

        $decrypted = decrypt($secret);

        if (Google2FA::verifyKey($decrypted, $code)) {
            return true;
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        if ($user->two_factor_recovery_codes === null) {
            return false;
        }

        /** @var array<int, string> $codes */
        $codes = decrypt($user->two_factor_recovery_codes);
        $normalized = trim($code);

        foreach ($codes as $index => $storedCode) {
            if (hash_equals($storedCode, $normalized)) {
                unset($codes[$index]);
                $user->forceFill([
                    'two_factor_recovery_codes' => encrypt(array_values($codes)),
                ])->save();

                return true;
            }
        }

        return false;
    }

    private function cacheKey(string $token): string
    {
        return 'two-factor-challenge:'.hash('sha256', $token);
    }

    private function ttlMinutes(): int
    {
        return (int) config('two_factor.challenge_ttl', 5);
    }
}
