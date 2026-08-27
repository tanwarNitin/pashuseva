# PashuSeva - Architecture & Coding Standards

## Project Overview
PashuSeva is a zero-cost, mobile-first, on-demand veterinary discovery & emergency dispatch platform connecting Indian livestock owners (dairy farmers) with registered Veterinary Doctors (BVSc/MVSc) and certified Paravets (Gopal Mitras).

## Tech Stack (100% Free & Open-Source)
- **Framework:** Next.js 15 (App Router, Server Actions, React 19)
- **Language:** TypeScript (Strict mode, no `any`)
- **Styling & UI:** Tailwind CSS + shadcn/ui + Lucide Icons
- **Database:** PostgreSQL (Supabase/Neon free tier) with PostGIS extension + SQL Haversine fallback
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Maps:** Leaflet / OpenStreetMap (Free, zero API keys required)
- **Auth:** Zero-cost session-based Phone + 4-digit PIN authentication using HTTP-only secure cookies and `jose` (JWT)
- **Communication:** Native `tel:` URI (Direct Call) and WhatsApp deep-linking (`https://wa.me/...`) with pre-filled cattle condition & GPS coordinates

## Core Business Logic & Roles
1. **User Roles:**
   - `FARMER`: Discovers nearby vets, raises Emergency SOS vs Routine requests, views travel distance and fees, accesses cattle health records.
   - `VET_DOCTOR`: Registered practitioner with VCI/State council license verification badge.
   - `PARAVET_WORKER`: Certified livestock assistant / AI worker badge.
2. **Duty Status:** Vets have an instant `ON_DUTY` / `OFF_DUTY` toggle. Only `ON_DUTY` vets appear in farmer search and SOS broadcasts.
3. **Emergency SOS vs. Routine Request:**
   - `SOS`: Broadcasts cattle distress to all active vets within radius, renders high-priority red alert cards with one-tap calling.
   - `ROUTINE`: Scheduled checkups, vaccinations, artificial insemination (AI).
4. **Distance & Fee Calculation:** Calculates exact distance in km via PostGIS/Haversine and estimates total cost: `Base Visit Fee + (Distance in KM * Per-KM Fee)`.
5. **Digital Health Card ("Pashu Swasthya Patra"):** Manages cattle tag IDs, breeds, vaccination history, and medical records.
6. **Bilingual Support:** UI supports instant toggle between English and Hindi (हिंदी).

## Code Standards
- All mutations must use Next.js Server Actions with Zod schema validation.
- Clean mobile-first layouts optimized for 360px–430px smartphone viewports.
- Leaflet map components must be dynamically imported with SSR disabled (`next/dynamic` with `ssr: false`).
- Zero paid API dependencies.
