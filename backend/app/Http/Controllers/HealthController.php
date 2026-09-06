<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Deployment / uptime probe.
 *
 * Returns 200 when the app can serve requests and reach its declared
 * dependencies. Returns 503 with a `checks` breakdown when anything is
 * degraded, so upstream monitors can point at a specific failing component.
 */
final class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->timed(fn () => $this->checkDatabase()),
            'cache' => $this->timed(fn () => $this->checkCache()),
        ];

        $healthy = collect($checks)->every(fn (array $check): bool => $check['ok']);

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'app' => config('app.name'),
            'env' => app()->environment(),
            'version' => (string) config('app.version', 'dev'),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    /**
     * @return array{ok: bool, error?: string}
     */
    private function checkDatabase(): array
    {
        try {
            DB::connection()->select('select 1 as up');

            return ['ok' => true];
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => class_basename($e).': '.$e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, error?: string}
     */
    private function checkCache(): array
    {
        try {
            $key = 'health:probe:'.Str::random(8);
            Cache::put($key, 'ok', 5);
            $roundtrip = Cache::pull($key);

            return ['ok' => $roundtrip === 'ok'];
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => class_basename($e).': '.$e->getMessage()];
        }
    }

    /**
     * @param  \Closure(): array{ok: bool, error?: string}  $probe
     * @return array{ok: bool, error?: string, ms: float}
     */
    private function timed(\Closure $probe): array
    {
        $start = hrtime(true);
        $result = $probe();
        $ms = round((hrtime(true) - $start) / 1_000_000, 2);

        return $result + ['ms' => $ms];
    }
}
