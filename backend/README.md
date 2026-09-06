# Axiom — Backend (API)

The **Laravel 12 REST API** for Axiom. It provides token-based authentication with **Laravel Sanctum** and a small user-management API consumed by the [Angular frontend](../frontend/README.md).

## Tech Stack

- **Laravel 12**, PHP 8.2+
- **Laravel Sanctum** — Bearer-token authentication
- **SQLite** by default (swappable via `.env`)
- **PHPUnit 11** for tests

## Requirements

- PHP ≥ 8.2 with Composer
- SQLite extension (bundled with most PHP builds)

## Setup

```bash
# Install dependencies
composer install

# Environment + app key
cp .env.example .env
php artisan key:generate

# Create the schema
php artisan migrate

# (Optional) seed a known login user + 10 demo users
php artisan db:seed --class=UserSeeder

# Serve the API at http://127.0.0.1:8000
php artisan serve
```

> `composer run dev` runs the server, queue worker, log tailer, and Vite together.

### Seeded login

`php artisan db:seed --class=UserSeeder` creates a known account so the login
flow works immediately:

| Email | Password |
|-------|----------|
| `admin@example.com` | `password` |

## Configuration

Defaults use SQLite and need no database server:

```env
APP_URL=http://localhost
DB_CONNECTION=sqlite
```

To use MySQL/PostgreSQL, set `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
`DB_USERNAME`, and `DB_PASSWORD`.

### CORS

Browser origins allowed to call the API are configured in
[`config/cors.php`](config/cors.php). The Angular dev server
(`http://localhost:4200` / `http://127.0.0.1:4200`) is allowed out of the box —
add production origins there before deploying.

## API Reference

Base URL: `http://127.0.0.1:8000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/login` | Public | Authenticate with `email` + `password`; returns `{ user, token, token_type }` |
| `POST` | `/logout` | Bearer | Revoke the current access token |
| `GET` | `/users` | Bearer | List all users |
| `POST` | `/users` | Bearer | Create a user (`name`, `email`, `password`) |
| `DELETE` | `/users/{id}` | Bearer | Delete a user by ID |

Protected routes require an `Authorization: Bearer <token>` header (the token
returned by `/login`).

### Validation — `POST /users`

| Field | Rules |
|-------|-------|
| `name` | required, string, max 255 |
| `email` | required, valid email, unique |
| `password` | required, min 8 characters (hashed on save) |

### Examples

```bash
# Log in
curl -X POST http://127.0.0.1:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# List users (authenticated)
curl http://127.0.0.1:8000/api/users \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
app/
├── Http/Controllers/
│   ├── UserController.php        # index / store / destroy
│   └── Auth/LoginController.php  # login / logout
└── Models/User.php               # Sanctum-enabled User model
config/cors.php                   # allowed browser origins
database/
├── migrations/                   # users, sessions, cache, jobs, tokens
└── seeders/UserSeeder.php        # admin + 10 demo users
routes/api.php                    # API route definitions
```

## Tests

```bash
php artisan test
# or
composer test
```

## License

Built on the Laravel framework, open-sourced under the [MIT license](https://opensource.org/licenses/MIT).
