<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FALaravel\Facade as Google2FA;
use Tests\TestCase;

final class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesSeeder::class);
    }

    public function test_valid_credentials_return_a_bearer_token(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Correct-Horse-42!'),
        ]);
        $user->assignRole('user');

        $response = $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'Correct-Horse-42!',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user' => ['id', 'email'], 'token', 'token_type']);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Correct-Horse-42!'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_login_is_rate_limited_per_email(): void
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Correct-Horse-42!'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'user@example.com',
                'password' => 'wrong',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'wrong',
        ])->assertStatus(429);
    }

    public function test_2fa_user_receives_challenge_instead_of_token(): void
    {
        $secret = Google2FA::generateSecretKey();

        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Correct-Horse-42!'),
            'two_factor_secret' => encrypt($secret),
            'two_factor_confirmed_at' => now(),
        ]);
        $user->assignRole('user');

        $response = $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'Correct-Horse-42!',
        ]);

        $response->assertStatus(202)
            ->assertJsonStructure(['two_factor_required', 'challenge_token'])
            ->assertJsonMissing(['token']);
    }

    public function test_2fa_challenge_exchanged_for_token_with_valid_code(): void
    {
        $secret = Google2FA::generateSecretKey();

        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Correct-Horse-42!'),
            'two_factor_secret' => encrypt($secret),
            'two_factor_confirmed_at' => now(),
        ]);
        $user->assignRole('user');

        $challenge = $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'Correct-Horse-42!',
        ])->json('challenge_token');

        $code = Google2FA::getCurrentOtp($secret);

        $this->postJson('/api/login/two-factor', [
            'challenge_token' => $challenge,
            'code' => $code,
        ])->assertOk()->assertJsonStructure(['user', 'token']);
    }
}
