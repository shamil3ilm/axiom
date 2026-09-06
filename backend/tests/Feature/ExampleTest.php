<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class ExampleTest extends TestCase
{
    public function test_health_endpoint_returns_200(): void
    {
        $this->get('/up')->assertStatus(200);
    }
}
