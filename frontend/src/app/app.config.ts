import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { GlobalErrorHandler } from './shared/global-error-handler';
import { WarmupService } from './services/warmup.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Runs synchronously during bootstrap. WarmupService.warm() is
    // non-blocking (fire-and-forget), so this does not delay first paint.
    provideAppInitializer(() => {
      inject(WarmupService).warm();
    }),
  ],
};
