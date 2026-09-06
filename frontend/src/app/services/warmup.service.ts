import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from '../api.config';
import { environment } from '../environment/environment';

/**
 * Fire-and-forget probe against /api/health on app bootstrap.
 *
 * Motivation: Render's free web service tier suspends the container after
 * 15 minutes of inactivity. The next request eats a 30-60s cold-boot.
 * If we kick off /api/health the moment the SPA loads, the backend is
 * already warm by the time the user finishes typing their credentials —
 * so the cold-start cost lands during layout/hydration (imperceptible)
 * instead of on the login submit (very perceptible).
 *
 * This is a UX mitigation, not a keep-alive: we only ping when there is
 * an actual visitor, so it does not violate Render's terms of service and
 * does not consume the container's free instance-hours around the clock.
 *
 * The request is intentionally silent-on-failure. If the API is genuinely
 * down, the app must still render the login page so the user can see the
 * eventual error banner from their real request — not a bootstrap crash.
 */
@Injectable({ providedIn: 'root' })
export class WarmupService {
  private readonly http = inject(HttpClient);

  warm(): void {
    // Skip in development — the backend is already running locally and a
    // failed probe adds noise to the console during hot reload.
    if (!environment.production) {
      return;
    }

    // No subscription bookkeeping: fire, forget, ignore errors. We don't
    // even care about the response body — a TCP roundtrip is enough to
    // wake the container.
    this.http.get(`${API_URL}/health`, { responseType: 'text' }).subscribe({
      error: () => {
        // Deliberately swallowed. See jsdoc above.
      },
    });
  }
}
