# PashuSeva — पशुसेवा

**Mobile-first veterinary discovery and service-request platform for rural India**

PashuSeva connects livestock owners with verified veterinary professionals (veterinary doctors and paravet workers) for emergency and routine care.

## 🎯 Mission

Enable farmers in rural India to:
- Discover nearby, verified, on-duty veterinary providers
- See transparent distance and fee estimates
- Contact providers through native telephone and WhatsApp links
- Create and track service requests (SOS and routine)
- Maintain digital cattle health cards (Pashu Swasthya Patra — पशु स्वास्थ्य पत्र)

**Bilingual**: Full English and Hindi support  
**Zero mandatory paid services**: No required API keys or paid services

## 🏗️ Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL** + **Drizzle ORM**
- **PostGIS** (optional, with SQL Haversine fallback)
- **Leaflet** + OpenStreetMap
- **jose** (JWT sessions)
- **Node.js crypto.scrypt** (PIN hashing)
- **Zod** (validation)

## 📋 Current Status

**Status**: Complete, fully functional, compiling with **0 TypeScript errors** (`npx tsc --noEmit`), and covered by comprehensive test suites.

### ✅ Implemented Subsystems
- **Emergency SOS Dispatch**: Multi-tier radius matching (10/25/50 km), atomic concurrency acceptance locking, transparent integer paise fees, and full lifecycle state machine.
- **Routine Scheduled Bookings**: Scheduled non-emergency appointments (`routine_bookings`) with farmer booking and provider confirmation.
- **Pashu Swasthya Patra**: Digital cattle health cards, milk yield logs, medical records, in-app vaccination overdue/upcoming reminders (`reminderDismissed`), and time-limited practitioner consent sharing grants (`health_card_consents`).
- **Web Push Notifications**: Zero-cost browser push via VAPID and Web Push API (`web-push`, `public/sw.js`, `push_subscriptions`).
- **Provider Verification Lifecycle**: Dual review interfaces (CLI `npm run provider:review` and Web Admin UI `/admin/providers/verify`) with immutable audit trails in `credential_reviews`.
- **8-Hour Duty Leases**: Verified-only duty toggle with automatic 8-hour expiration (`dutyExpiresAt`).
- **Spatial Discovery**: In-database PostGIS `ST_DWithin` & parameterized SQL Haversine fallback with `LEAST/GREATEST` clamping.
- **Security Hardening**: Unified scrypt + HMAC-SHA256 pepper PIN hashing (zero bcrypt), zero plaintext credential logs, private document storage (`storage/documents/`), and database-tracked session revocation.

See **[docs/implementation-status.md](docs/implementation-status.md)** and **[BUILD_SUMMARY.md](BUILD_SUMMARY.md)** for detailed audit records.

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js 22 LTS** (or Node 20+)
- **PostgreSQL 16+** with **PostGIS 3.5** (via Docker or local PostgreSQL)
- **npm**

### 2. Setup & Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate secure environment configuration
npm run setup:env

# 3. Start PostgreSQL with PostGIS (via Docker Compose)
docker compose up -d

# 4. Apply database migrations
npm run db:migrate

# 5. Enable PostGIS spatial extensions and indexes
npm run db:spatial

# 6. Seed demo data (development only)
npm run db:seed

# 7. Start the development server
npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## 📚 Documentation Deliverables

- **[CLAUDE.md](CLAUDE.md)** — Repository memory and core conventions
- **[BUILD_SUMMARY.md](BUILD_SUMMARY.md)** — Feature breakdown and build verification
- **[docs/architecture.md](docs/architecture.md)** — System layout, SOS dispatch, routine booking, push flows, and ERD
- **[docs/security.md](docs/security.md)** — 4 applied security fixes, threat model, rate limiting, and consent model
- **[docs/verification-operations.md](docs/verification-operations.md)** — Provider review standard, CLI/Web UI workflows, and audit trail
- **[docs/deployment.md](docs/deployment.md)** — Production hosting, environment configuration, VAPID setup, and migrations
- **[docs/testing.md](docs/testing.md)** — Test architecture, npm test phases, and execution commands
- **[docs/limitations-and-safety.md](docs/limitations-and-safety.md)** — Zero-cost boundaries and safety assumptions
- **[docs/implementation-status.md](docs/implementation-status.md)** — Master prompt compliance audit

---

## 🧪 Testing

```bash
# Typecheck (zero errors requirement)
npm run typecheck

# Run Unit Tests (Vitest)
npm run test:unit

# Run Integration Tests
npm run test:integration

# Run Playwright E2E Tests
npm run test:e2e

# Run the Master Test Pipeline
npm test
```


## ⚖️ Limitations & Safety

PashuSeva is built with **no mandatory paid services**, but this comes with honest boundaries:

- Phone + PIN authentication **does not verify** phone ownership
- Contact links **do not guarantee** call/message delivery
- Platform is **not a substitute** for emergency veterinary care
- No AI diagnosis or automated clinical advice
- Paravets are **not veterinary doctors** (distinct scope of practice)

**Read the complete list**: [docs/limitations-and-safety.md](docs/limitations-and-safety.md)

## 📄 License

*(To be determined)*

## 🤝 Contributing

*(To be determined)*

## 📞 Support

This is open-source software with no guaranteed support or SLA. Deployers are responsible for:
- Maintaining their deployment
- Provider credential verification
- Data privacy compliance
- Legal and regulatory compliance

---

**Built with ❤️ for rural India**

पशुसेवा — गाँव-गाँव पशु चिकित्सा सेवा
