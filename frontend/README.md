# Axiom — Frontend (SPA)

The **Angular 21 single-page application** for Axiom. It authenticates against the
[Laravel API](../backend/README.md) using a Bearer token and provides a simple
user-management interface (list, create, delete).

## Tech Stack

- **Angular 21** with standalone components
- **TypeScript 5.9**, **RxJS 7**, **SCSS**
- **Vitest** for unit tests
- Built with the Angular CLI (`@angular/build` / esbuild)

## Requirements

- Node.js ≥ 20 (current LTS) with npm

## Setup

```bash
# Install dependencies
npm install

# Start the dev server at http://localhost:4200
npm start        # alias for `ng serve`
```

The dev server proxies nothing itself — it calls the API directly at the URL
configured for the active build target (see **Environments** below). Make sure
the [backend](../backend/README.md) is running at `http://127.0.0.1:8000`.

### Log in

Seed the backend (`php artisan db:seed --class=UserSeeder`) and sign in with:

| Email | Password |
|-------|----------|
| `admin@example.com` | `password` |

## How Auth Works

1. `POST /api/login` returns a Sanctum Bearer token.
2. `AuthService` stores the token + user in `localStorage` and exposes
   `currentUser$`.
3. `authInterceptor` attaches `Authorization: Bearer <token>` to every outgoing
   API request.
4. `authGuard` protects the `/users` route and redirects unauthenticated users
   to `/login`.
5. Logout calls `POST /api/logout` (revoking the token) and clears local state.

## Environments

The API base URL is selected per build target via `fileReplacements` in
[`angular.json`](angular.json):

| Build target | File | Notes |
|--------------|------|-------|
| base / fallback | `src/app/environment/environment.ts` | dev defaults |
| `ng serve` (development) | `src/app/environment/environment.development.ts` | `http://127.0.0.1:8000/api` |
| `ng build` (production) | `src/app/environment/environment.production.ts` | set your deployed API URL here |

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginComponent` | — |
| `/users` | `UsersComponent` | `authGuard` |
| `/`, `**` | → redirect to `/users` | — |

## Project Structure

```
src/app/
├── app.ts                        # routed shell (topbar + <router-outlet>)
├── app.config.ts                 # providers (router, HttpClient + interceptor)
├── app.routes.ts                 # lazy-loaded routes
├── api.config.ts                 # API base URL
├── environment/                  # dev / prod / base environment files
├── guards/auth.guard.ts          # route protection
├── interceptors/auth.interceptor.ts  # Bearer token injection
├── services/
│   ├── api.ts                    # ApiService — users CRUD
│   └── auth.service.ts           # AuthService — login/logout/session
├── pages/
│   ├── login/                    # login form
│   └── users/                    # user management page
└── components/
    ├── user-form/                # create-user form (validated)
    └── user-list/                # list + delete
```

## Building

```bash
ng build          # production build -> dist/frontend
```

## Tests

```bash
npm test          # Vitest, alias for `ng test`
```

## Additional Resources

For Angular CLI command references, see the [Angular CLI Overview](https://angular.dev/tools/cli).
