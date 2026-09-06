<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class RequestIdTest extends TestCase
{
    public function test_generates_a_uuid_when_no_incoming_header(): void
    {
        $response = $this->getJson('/api/health');

        $header = $response->headers->get('X-Request-Id');
        $this->assertNotNull($header);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $header,
        );
    }

    public function test_echoes_valid_incoming_header(): void
    {
        $response = $this->withHeaders(['X-Request-Id' => 'trace-abc-123'])
            ->getJson('/api/health');

        $this->assertSame('trace-abc-123', $response->headers->get('X-Request-Id'));
    }

    public function test_replaces_invalid_incoming_header_to_prevent_injection(): void
    {
        $response = $this->withHeaders(['X-Request-Id' => "attacker\r\nX-Evil: yes"])
            ->getJson('/api/health');

        $header = (string) $response->headers->get('X-Request-Id');
        $this->assertNotSame("attacker\r\nX-Evil: yes", $header);
        $this->assertMatchesRegularExpression('/^[0-9a-f\-]{36}$/i', $header);
    }
}
