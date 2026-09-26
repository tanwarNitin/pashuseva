# PashuSeva — Deployment & Infrastructure Guide

This document describes how to configure, deploy, migrate, and maintain PashuSeva on self-hosted infrastructure or cloud virtual machines.

---

## 1. Prerequisites & System Requirements

- **Node.js**: Version 22 LTS (Node 20+ supported).
- **Package Manager**: `npm` (with committed `package-lock.json`).
- **Database**: PostgreSQL 16+ (PostGIS 3.5+ recommended, Haversine fallback supported).
- **Disk Storage**: Local persistent disk space for `storage/documents/` (provider license documents).
- **HTTPS**: Strictly required in production for HTTP-only Secure cookies and browser Service Worker / Web Push registration.

---

## 2. Environment Configuration

### 2.1 Automated Secret Generation
Run the automated environment setup script to generate cryptographically secure random secrets:

```bash
npm run setup:env
```

This creates `.env.local` with fresh base64-encoded secrets for `SESSION_SECRET` and `PIN_PEPPER`.

### 2.2 Environment Variables Reference

| Variable | Required | Description | Example / Default |
|---|:---:|---|---|
| `NODE_ENV` | Yes | Application environment | `production` / `development` |
| `APP_ORIGIN` | Yes | Canonical origin URL for CSRF and links | `https://pashuseva.in` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/pashuseva` |
| `TEST_DATABASE_URL` | Testing | Dedicated test database | `postgresql://user:pass@localhost:5432/pashuseva_test` |
| `DB_SPATIAL_MODE` | No | Spatial computation mode: `auto`, `postgis`, `haversine` | `auto` |
| `SESSION_SECRET` | Yes | 32+ byte secret for signing session JWTs | `base64-random-string` |
| `PIN_PEPPER` | Yes | 32+ byte HMAC pepper for scrypt PIN hashing | `base64-random-string` |
| `SESSION_ISSUER` | No | JWT issuer claim | `pashuseva` |
| `SESSION_AUDIENCE` | No | JWT audience claim | `pashuseva-web` |
| `TRUST_PROXY_HOPS` | No | Trusted reverse proxy hops for IP extraction | `1` (behind Nginx/Caddy) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | Public key for browser push subscription | `BEl...` |
| `VAPID_PRIVATE_KEY` | Yes | Private key for signing Web Push requests | `secret-key` |
| `VAPID_SUBJECT` | Yes | Contact email or URL for push delivery | `mailto:admin@pashuseva.in` |
| `NEXT_PUBLIC_OSM_TILE_URL` | No | OpenStreetMap tile URL template | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `ALLOW_DEMO_SEED` | Dev | Permits demo data seeding | `false` |

---

## 3. Database Startup, Migrations & PostGIS

### 3.1 Local Containerized Database (`compose.yaml`)
Start PostgreSQL with PostGIS enabled:

```bash
docker compose --env-file .env.local up -d
```

### 3.2 Executing Migrations
Apply versioned Drizzle SQL migrations:

```bash
npm run db:migrate
```

### 3.3 Enabling Spatial Capabilities (PostGIS)
Initialize PostGIS extension and geography indexes:

```bash
npm run db:spatial
```

*Note*: If database user permissions prevent creating extensions (`CREATE EXTENSION postgis`), set `DB_SPATIAL_MODE=haversine`. The platform will automatically execute the parameterized SQL Haversine fallback calculations without error.

### 3.4 Optional Development Seeding
Populate realistic fictional fixtures for local development:

```bash
ALLOW_DEMO_SEED=true npm run db:seed
```

> [!WARNING]
> Never run `npm run db:seed` in production environments.

---

## 4. Web Push (VAPID) Setup

To generate a fresh pair of VAPID keys for browser push notifications:

```bash
npx web-push generate-vapid-keys
```

Copy the generated public and private keys into `.env.local`:
```dotenv
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<Generated Public Key>"
VAPID_PRIVATE_KEY="<Generated Private Key>"
VAPID_SUBJECT="mailto:admin@pashuseva.in"
```

---

## 5. Connection Pool Sizing & Database Tuning

- For typical single-instance or dual-instance deployments, configure the connection pool max size to **10–20 connections**:
  ```ts
  // src/db/client.ts uses pg.Pool
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ```
- Ensure PostgreSQL `max_connections` on the database server accommodates all application instances plus administrative headroom.

---

## 6. Production Readiness & Maintenance

### 6.1 Reverse Proxy & HTTPS
Deploy behind a reverse proxy (e.g. Nginx, Caddy, or Cloudflare) configured with TLS termination:
- Set `TRUST_PROXY_HOPS=1` in `.env.local`.
- Ensure headers `X-Forwarded-For` and `X-Forwarded-Proto` are forwarded correctly.
- Ensure HTTPS is strictly enforced; service workers and Web Push will fail over unencrypted HTTP (except on `localhost`).

### 6.2 Health Checks
The platform provides a health check endpoint for container orchestrators and load balancers:
- `GET /api/health`: Returns JSON `{ status: "ok", db: "connected", timestamp: "..." }`.

### 6.3 OpenStreetMap Tile Usage Compliance
- Standard public OSM tile servers are intended for low-volume, non-commercial use.
- The platform adheres to OSM tile policies: HTTPS tile URLs, visible attribution, and standard browser caching.
- Discovery and provider lists remain fully functional even if map tile downloads fail.

### 6.4 Database Backup & Recovery
- Run daily PostgreSQL logical dumps:
  ```bash
  pg_dump -Fc -d "$DATABASE_URL" -f "pashuseva_backup_$(date +%Y%m%d).dump"
  ```
- To restore:
  ```bash
  pg_restore -d "$DATABASE_URL" --clean --if-exists "pashuseva_backup.dump"
  ```

### 6.5 Hosting Realities & Zero-Cost Boundaries
- **Zero-Paid-API Architecture**: PashuSeva incurs zero recurring fees for third-party mapping, SMS, or telephony APIs.
- **Infrastructure Reality**: Running the web server and PostgreSQL database requires persistent computing hardware or a virtual private server (e.g. $5/mo VPS or existing institutional server). No claim is made of permanent zero-cost public hosting without hosting infrastructure.
