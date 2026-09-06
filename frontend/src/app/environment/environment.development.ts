// Dev-target environment. Angular's fileReplacements substitutes
// environment.ts with this file during `ng serve` / `ng build --dev`.
// See the note in environment.production.ts about the circular import
// pitfall — rely on object-literal inference instead.
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  sentryDsn: null as string | null,
  release: null as string | null,
};
