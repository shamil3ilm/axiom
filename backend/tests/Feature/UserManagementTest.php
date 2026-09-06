<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesSeeder::class);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/users')->assertStatus(401);
    }

    public function test_non_admin_user_cannot_list_users(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $this->actingAs($user)
            ->getJson('/api/users')
            ->assertStatus(403);
    }

    public function test_unverified_admin_cannot_list_users(): void
    {
        $user = User::factory()->unverified()->create();
        $user->assignRole('admin');

        // Laravel's `verified` middleware returns 403 for JSON requests
        // when the authenticated user has an unverified email address.
        $this->actingAs($user)
            ->getJson('/api/users')
            ->assertStatus(403);
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        User::factory()->count(3)->create();

        $this->actingAs($admin)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'email', 'roles']]]);
    }

    public function test_admin_can_create_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'New-Strong-Password-1!',
                'password_confirmation' => 'New-Strong-Password-1!',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    }

    public function test_create_rejects_weak_password(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->postJson('/api/users', [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'short',
                'password_confirmation' => 'short',
            ])
            ->assertStatus(422);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->deleteJson('/api/users/'.$admin->id)
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_can_delete_other_user(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $victim = User::factory()->create();

        $this->actingAs($admin)
            ->deleteJson('/api/users/'.$victim->id)
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $victim->id]);
    }
}
