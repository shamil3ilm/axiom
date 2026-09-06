<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Two-Factor Challenge TTL (minutes)
    |--------------------------------------------------------------------------
    |
    | How long a two-factor challenge token remains valid after being issued
    | by the login endpoint. The user must complete the TOTP step before
    | this expires, otherwise they must re-authenticate with their password.
    |
    */
    'challenge_ttl' => (int) env('TWO_FACTOR_CHALLENGE_TTL', 5),
];
