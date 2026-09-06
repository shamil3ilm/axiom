<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\Auth\TwoFactorChallengeService;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Container\Container;
use Illuminate\Contracts\Encryption\Encrypter as EncrypterContract;
use Illuminate\Encryption\Encrypter;
use PHPUnit\Framework\TestCase;

final class TwoFactorChallengeServiceTest extends TestCase
{
    private TwoFactorChallengeService $service;

    private Repository $cache;

    protected function setUp(): void
    {
        parent::setUp();

        // Bind an encrypter into the container so global encrypt()/decrypt()
        // helpers work without a full Laravel bootstrap.
        $container = Container::getInstance();
        $encrypter = new Encrypter(str_repeat('a', 32), 'AES-256-CBC');
        $container->instance('encrypter', $encrypter);
        $container->instance(EncrypterContract::class, $encrypter);

        // Bind a minimal config so config('two_factor.challenge_ttl') works.
        $container->instance('config', new \Illuminate\Config\Repository([
            'two_factor' => ['challenge_ttl' => 5],
        ]));

        $this->cache = new Repository(new ArrayStore);
        $this->service = new TwoFactorChallengeService($this->cache);
    }

    protected function tearDown(): void
    {
        Container::setInstance(null);
        parent::tearDown();
    }

    public function test_issue_challenge_returns_a_random_token(): void
    {
        $user = new User;
        $user->id = 1;

        $token = $this->service->issueChallenge($user);

        $this->assertNotEmpty($token);
        $this->assertNotSame($token, $this->service->issueChallenge($user));
    }

    public function test_verify_challenge_returns_null_for_unknown_token(): void
    {
        $this->assertNull($this->service->verifyChallenge('unknown-token', '000000'));
    }
}
