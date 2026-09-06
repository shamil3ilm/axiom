<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Attach a stable request identifier so a single request can be correlated
 * across the LB, Laravel, the queue worker, and downstream services.
 *
 * If the client sends `X-Request-Id`, echo it back (this is what an upstream
 * load balancer or Cloudflare typically does). Otherwise generate a UUID.
 */
final class RequestId
{
    private const HEADER = 'X-Request-Id';

    private const MAX_LENGTH = 128;

    public function handle(Request $request, Closure $next): Response
    {
        $id = $this->extractOrGenerate($request);

        $request->headers->set(self::HEADER, $id);
        $request->attributes->set('request_id', $id);

        Log::withContext(['request_id' => $id]);

        $response = $next($request);
        $response->headers->set(self::HEADER, $id);

        return $response;
    }

    private function extractOrGenerate(Request $request): string
    {
        $incoming = trim((string) $request->headers->get(self::HEADER, ''));

        // Only echo well-formed values; regenerate anything suspicious to
        // avoid header injection via untrusted client input.
        if ($incoming !== ''
            && strlen($incoming) <= self::MAX_LENGTH
            && preg_match('/^[A-Za-z0-9._\-]+$/', $incoming) === 1
        ) {
            return $incoming;
        }

        return (string) Str::uuid();
    }
}
