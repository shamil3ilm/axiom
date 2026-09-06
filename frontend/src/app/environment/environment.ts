// Base environment — the default when no build target replaces this file.
// Angular's fileReplacements swaps this out for environment.development.ts
// during `ng serve` and environment.production.ts during `ng build`, so
// production runtime never sees these values.
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  sentryDsn: null as string | null,
  release: null as string | null,
};
