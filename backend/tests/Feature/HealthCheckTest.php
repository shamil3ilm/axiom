<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class HealthCheckTest extends TestCase
{
    public function test_returns_200_when_all_dependencies_are_reachable(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.ok', true)
            ->assertJsonPath('checks.cache.ok', true)
            ->assertJsonStructure([
                'status',
                'app',
                'env',
                'version',
                'checks' => [
                    'database' => ['ok', 'ms'],
                    'cache' => ['ok', 'ms'],
                ],
            ]);
    }

    public function test_returns_503_when_database_is_broken(): void
    {
        // Point the default connection at a bad DSN so the probe fails
        // without corrupting the real test database.
        config([
            'database.connections.broken' => [
                'driver' => 'sqlite',
                'database' => '/does/not/exist.sqlite',
                'foreign_key_constraints' => false,
            ],
            'database.default' => 'broken',
        ]);
        DB::purge('broken');

        $response = $this->getJson('/api/health');

        $response->assertStatus(503)
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('checks.database.ok', false);
    }
}
