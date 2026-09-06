import { ErrorHandler, Injectable, inject } from '@angular/core';

import { ErrorReporter } from '../services/error-reporter';

/**
 * Angular ErrorHandler swap-in that forwards uncaught exceptions to our
 * ErrorReporter. The default handler still runs (via super.handleError-like
 * behavior) so DevTools continues to show the stack in development.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);

  handleError(error: unknown): void {
    this.reporter.captureException(error);

    // Keep the default browser behavior so local dev sees the error in the
    // console. Do not rethrow — Angular treats a rethrow here as a second
    // uncaught error and can lead to an infinite loop.
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
