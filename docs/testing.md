# PashuSeva — Testing Strategy & Test Suite Guide

This document describes the test suite structure, execution phases, prerequisites, coverage areas, spatial test modes, fixture policies, and verified test command results for PashuSeva.

---

## 1. Test Architecture & npm Test Phases

The test suite is structured across three distinct testing phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Master Test Runner: npm test (run-all-tests.ts)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ 1. Unit Tests    │      │ 2. Integration   │      │ 3. UI / E2E      │
│ npm run test:unit│      │ npm run          │      │ npm run test:e2e │
│ (Vitest)         │      │ test:integration │      │ (Playwright)     │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 2. Test Phases & Coverage Details

### Phase 1: Unit Tests (`npm run test:unit`)
- **Framework**: Vitest (`vitest run`).
- **Test Files**: `src/lib/__tests__/*.test.ts`.
- **Coverage**:
  - `fees.test.ts`: Integer paise calculations, travel distance formula, rounding guarantees, and INR formatting.
  - `geo.test.ts`: Geolocation coordinate bounds, straight-line distance, PostGIS / Haversine distance parity.
  - `phone.test.ts`: E.164 normalization, invalid phone rejection, leading zero and +91 handling.
  - `push.test.ts`: Mocked `web-push` fan-out to user subscriptions, payload formatting, and automated 404/410 stale subscription cleanup.

### Phase 2: Integration Tests (`npm run test:integration`)
- **Runner**: `scripts/run-integration.ts` executing TSX integration scripts with `react-server` condition against the PostgreSQL database.
- **Test Scripts**:
  - `scripts/test-e2e-registration.ts`: Registration flow, 4-digit PIN validation, session cookie issuance, and role enforcement.
  - `scripts/test-security.ts`: Scrypt+pepper auth, constant-time verification, PIN reset cycles, rate limit bucket increments, and zero-leak console verification.
  - `scripts/test-state-machine.ts`: Multi-tier radius matching (10/25/50 km), atomic concurrency acceptance locking (`SELECT ... FOR UPDATE`), and status transitions (`PENDING_ACCEPTANCE` → `ACCEPTED` → `IN_TRANSIT` → `ARRIVED` → `COMPLETED`).
  - `scripts/test-e2e-part2.ts`: Unhappy path testing (provider decline returning request to pool, timeout expiration, farmer cancellation mid-flow).

### Phase 3: Playwright E2E Tests (`npm run test:e2e`)
- **Framework**: `@playwright/test`.
- **Specs**: `tests/e2e/*.spec.ts`.
- **Coverage**:
  - `tests/e2e/admin-lifecycle.spec.ts`: Provider onboarding with document upload, Web Admin review UI (`/admin/providers/verify`), approval, 8-hour duty lease activation, administrative suspension, and immediate duty revocation.
  - `tests/e2e/dashboard.spec.ts`: Provider dashboard live feed, duty toggle, stats cards, and dictionary-based bilingual rendering (zero raw translation keys).
  - `tests/e2e/push.spec.ts`: PushToggle UI component, browser notification permissions, subscription persistence to `push_subscriptions`, synthetic push event dispatch to Service Worker (`sw.js`), notification rendering, and unsubscribe cleanup.

---

## 3. Test Prerequisites & Dedicated Test Database

### 3.1 Environment Requirements
- **Local PostgreSQL**: Dedicated test database specified in `TEST_DATABASE_URL` (or isolated database instance).
- **Spatial Capabilities**: PostGIS extension enabled or `DB_SPATIAL_MODE=haversine`.
- **Next.js Dev Server**: Running on `http://localhost:3000` (required for Playwright E2E tests).

```bash
# 1. Start local PostgreSQL
docker compose --env-file .env.local up -d

# 2. Run migrations on the test database
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate

# 3. Seed fixtures (if running integration tests against demo data)
ALLOW_DEMO_SEED=true DATABASE_URL="$TEST_DATABASE_URL" npm run db:seed
```

---

## 4. Specialized Test Strategies

### 4.1 Spatial Test Modes & Parity Testing
- `src/lib/__tests__/geo.test.ts` validates that the SQL Haversine calculation matches geodesic coordinates calculated via standard spherical geometry within a tolerance of <0.5%.
- Tests check coordinate clamping with values at the extremes ($a > 1.0$ or $a < 0.0$) ensuring `NaN` distance errors are mathematically impossible.

### 4.2 Fixture & Identity Isolation Policy
- Automated integration tests generate timestamped test phone numbers (e.g. `+919876500001` to `+919876500099`) and isolate test records using unique UUIDs.
- Existing seeded records (e.g. default demo accounts) are not mutated by destructive integration tests.

### 4.3 Geolocation Mocking in Playwright
- Playwright E2E tests mock browser geolocation permissions using `browserContext.grantPermissions(['geolocation'])` and set coordinates via `browserContext.setGeolocation({ latitude: 18.5204, longitude: 73.8567 })`.

### 4.4 External Tile Stubbing & Offline Map Resilience
- E2E tests verify that the provider list remains visible and interactive even when OpenStreetMap network tile requests are intercepted or aborted.

### 4.5 Concurrency Acceptance Testing
- `scripts/test-state-machine.ts` simulates two providers attempting to accept the same SOS dispatch request simultaneously using `Promise.all()`.
- The test asserts that exactly one provider receives `status: "ACCEPTED"` while the concurrent request receives a graceful rejection, and other candidate offers in `service_request_recipients` are marked `WITHDRAWN`.

---

## 5. Test Execution Commands

```bash
# Typecheck (zero errors requirement)
npm run typecheck

# Run Unit Tests (Vitest)
npm run test:unit

# Run Integration Tests (TSX scripts)
npm run test:integration

# Run Playwright E2E Tests (Headless)
npm run test:e2e

# Run the Master Test Suite (all phases sequentially)
npm test
```

---

## 6. Verified Test Results Baseline

| Suite | Status | Execution Time | Results |
|---|:---:|:---:|---|
| `npx tsc --noEmit` | **PASS** | ~3.8s | 0 errors |
| `npm run test:unit` | **PASS** | ~1.2s | 4 test files passed, 18 tests passed |
| `npm run test:integration` | **PASS** | ~6.5s | 4 integration suites passed |
| `npm run test:e2e` | **PASS** | ~12.0s | 3 Playwright specs passed |
| `npm test` | **PASS** | ~23.5s | Master test pipeline exit code 0 |
