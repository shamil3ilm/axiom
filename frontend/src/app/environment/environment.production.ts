// Production environment. Angular's fileReplacements swaps environment.ts
// with this file during `ng build --configuration production`.
//
// To point at a different backend, edit apiUrl here, commit, push — Vercel
// auto-deploys on push to main. There is no build-time env-var override.
export const environment = {
  production: true,
  apiUrl: 'https://axiom-api-3fr8.onrender.com/api',
  sentryDsn: null as string | null,
  release: null as string | null,
};
