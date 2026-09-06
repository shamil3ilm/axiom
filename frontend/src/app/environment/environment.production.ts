import { Environment } from './environment';

// Injected at build time. Values are read from the build env by the Angular
// CLI (or replaced by a downstream build step). Empty strings become null.
declare const process:
  | { env: { NG_APP_API_URL?: string; NG_APP_SENTRY_DSN?: string; NG_APP_RELEASE?: string } }
  | undefined;

const env = typeof process !== 'undefined' ? process.env : {};

function readOrNull(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export const environment: Environment = {
  production: true,
  apiUrl: env.NG_APP_API_URL ?? 'https://api.example.com/api',
  sentryDsn: readOrNull(env.NG_APP_SENTRY_DSN),
  release: readOrNull(env.NG_APP_RELEASE),
};
