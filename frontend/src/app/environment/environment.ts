// Base environment. Angular swaps this file per build target via the
// `fileReplacements` in angular.json (development -> environment.development.ts,
// production -> environment.production.ts). The values here are the dev defaults.
export interface Environment {
  production: boolean;
  apiUrl: string;
  sentryDsn: string | null;
  release: string | null;
}

export const environment: Environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:8000/api',
  sentryDsn: null,
  release: null,
};
