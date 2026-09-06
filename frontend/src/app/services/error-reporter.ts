import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '../environment/environment';

/**
 * Thin wrapper around the reporting backend (Sentry today, replaceable
 * tomorrow). Kept dependency-free so tests don't need to stub a real SDK.
 *
 * When `environment.sentryDsn` is null the reporter falls back to console
 * so local dev still surfaces failures without wiring a real DSN.
 */
@Injectable({ providedIn: 'root' })
export class ErrorReporter {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = environment.production && environment.sentryDsn !== null;
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (this.shouldSuppress(error)) {
      return;
    }

    if (!this.enabled) {
      // eslint-disable-next-line no-console
      console.error('[error-reporter]', this.describe(error), context);
      return;
    }

    // Lazy Sentry integration: kept out of the bundle when the DSN is unset
    // so hobby builds don't ship the SDK. The dynamic import is resolved by
    // the browser only after the check above passes.
    void this.sendToSentry(error, context);
  }

  private async sendToSentry(error: unknown, context?: Record<string, unknown>): Promise<void> {
    // The Sentry SDK is optional — it isn't in package.json by default so
    // hobby builds don't ship the ~40 KB. To keep TypeScript happy without
    // installing types, we route through a dynamic string import that the
    // compiler cannot resolve. The runtime `catch` guards the "not installed"
    // case, and the top-level try guards any SDK misbehavior.
    try {
      const specifier = '@sentry/browser';
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const dynamicImport = new Function('m', 'return import(m)') as (
        m: string,
      ) => Promise<{ captureException: (e: unknown, opts?: unknown) => unknown } | null>;

      const Sentry = await dynamicImport(specifier).catch(() => null);
      if (Sentry === null) {
        // eslint-disable-next-line no-console
        console.error('[error-reporter] @sentry/browser not installed', this.describe(error));
        return;
      }
      Sentry.captureException(error, { extra: context });
    } catch {
      // Never let the reporter itself throw.
    }
  }

  /**
   * HTTP errors are surfaced by the auth interceptor and per-page error
   * banners already, so re-reporting them here would duplicate every
   * validation failure. We only care about uncaught exceptions.
   */
  private shouldSuppress(error: unknown): boolean {
    return error instanceof HttpErrorResponse;
  }

  private describe(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return String(error);
  }
}
