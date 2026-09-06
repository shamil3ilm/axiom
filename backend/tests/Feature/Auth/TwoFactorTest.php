<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FALaravel\Facade as Google2FA;
use Tests\TestCase;

final class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_enable_returns_secret_qr_and_recovery_codes(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/two-factor/enable')
            ->assertOk()
            ->assertJsonStructure(['secret', 'qr_svg', 'recovery_codes']);

        $user->refresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertStringContainsString('<svg', $response->json('qr_svg'));
    }

    public function test_confirm_activates_2fa_with_valid_code(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/two-factor/enable');
        $user->refresh();

        $code = Google2FA::getCurrentOtp(decrypt($user->two_factor_secret));

        $this->actingAs($user)
            ->postJson('/api/two-factor/confirm', ['code' => $code])
            ->assertOk();

        $user->refresh();
        $this->assertNotNull($user->two_factor_confirmed_at);
    }

    public function test_confirm_rejects_invalid_code(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/two-factor/enable');

        $this->actingAs($user->fresh())
            ->postJson('/api/two-factor/confirm', ['code' => '000000'])
            ->assertStatus(422);
    }

    public function test_disable_requires_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Correct-Horse-42!'),
            'two_factor_secret' => encrypt(Google2FA::generateSecretKey()),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->deleteJson('/api/two-factor', ['password' => 'wrong'])
            ->assertStatus(422);

        $this->actingAs($user)
            ->deleteJson('/api/two-factor', ['password' => 'Correct-Horse-42!'])
            ->assertOk();

        $user->refresh();
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->two_factor_secret);
    }
}
