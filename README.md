# Axiom

A full-stack **user management** application: a **Laravel 12 REST API** with
token-based authentication (Laravel Sanctum) and an **Angular 21 single-page
frontend** that consumes it.

This repository is a monorepo with two independently runnable projects. Each has
its own detailed README:

| Project | Description | Docs |
|---------|-------------|------|
| **`backend/`** | Laravel 12 REST API — Sanctum auth, user CRUD, SQLite | [backend/README.md](backend/README.md) |
| **`frontend/`** | Angular 21 SPA — login flow, user management UI | [frontend/README.md](frontend/README.md) |

## Architecture

```
┌─────────────────────┐         Bearer token          ┌──────────────────────┐
│  Angular 21 SPA      │  ──────────────────────────▶  │  Laravel 12 API      │
│  http://localhost:4200│      /api/login, /api/users   │  http://127.0.0.1:8000│
└─────────────────────┘  ◀──────────────────────────  └──────────────────────┘
        frontend/                   JSON                        backend/
```

- The frontend authenticates via `POST /api/login`, receives a **Sanctum Bearer
  token**, and attaches it to every subsequent API request.
- The backend exposes a small, token-protected user-management API.

## Quick Start

Run the two projects in separate terminals. Full instructions live in each
project's README.

**1. Backend** — [backend/README.md](backend/README.md)

```bash
cd backend
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan db:seed --class=UserSeeder   # optional demo data + login user
php artisan serve                        # http://127.0.0.1:8000
```

**2. Frontend** — [frontend/README.md](frontend/README.md)

```bash
cd frontend
npm install
npm start                                # http://localhost:4200
```

Then open **http://localhost:4200** and sign in with the seeded account
`admin@example.com` / `password`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12, PHP 8.2+, Laravel Sanctum |
| Database | SQLite (default; MySQL/PostgreSQL supported) |
| Frontend | Angular 21, TypeScript 5.9, RxJS, SCSS |
| Tests | PHPUnit (backend), Vitest (frontend) |

## License

Built on the Laravel framework, open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
