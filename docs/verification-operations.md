# PashuSeva — Provider Verification & Operations Guide

This document describes the provider verification standard, operational review workflows (CLI and Web Admin UI), credential lifecycle rules, and the immutable audit trail in PashuSeva.

---

## 1. Meaning of Verification & Scope of Practice

Provider trust is fundamental to livestock safety. PashuSeva enforces strict distinctions between professional qualifications:

### 1.1 Veterinary Doctors (`VET_DOCTOR`)
- **Qualification Requirements**: Recognized Bachelor of Veterinary Science & Animal Husbandry (BVSc & AH) or Master of Veterinary Science (MVSc).
- **Registration Standard**: Must hold a valid registration number issued by the **Veterinary Council of India (VCI)** or an authorized **State Veterinary Council** (e.g. Maharashtra Veterinary Council, UP Veterinary Council).
- **Public Trust Badge**: Displays *"Registration Verified — [Authority]"* (e.g., *"VCI registration verified"* or *"State Council registration verified"*). Badges accurately reflect the checked authority; a State Council registration is never misrepresented as a VCI check.
- **Service Scope**: General consultations, clinical treatments, prescriptions, and emergency SOS medical interventions.

### 1.2 Paravet Workers (`PARAVET_WORKER`)
- **Qualification Requirements**: Certified Livestock Assistant, Pashu Sakhi, Gopal Mitra, or Artificial Insemination (AI) Technician certified by a recognized state animal husbandry department or accredited training institute.
- **Public Trust Badge**: Displays *"Certification Reviewed"*.
- **Scope Limitation**: Paravets are **never** represented as veterinary doctors. Their services are limited to approved routine assistance (vaccinations, AI, first aid). They are excluded from emergency SOS matching by default.

> [!IMPORTANT]
> **No Automated Registry Integration**: Provider verification in PashuSeva is conducted manually by trusted operators checking state council gazettes or physical certificates. There is no automated API integration with government registries.

---

## 2. Review Workflows

PashuSeva provides two complementary interfaces for managing provider credentials:

### 2.1 CLI Operator Review Workflow

The CLI tool allows operators with secure server access to verify or reject providers directly:

```bash
# Review and approve a provider via provider:review script
npm run provider:review -- \
  --provider-id "<provider-uuid>" \
  --decision VERIFIED \
  --reviewer "operator@pashuseva.local" \
  --evidence "State Council Gazette Vol 42, Reg #12345" \
  --notes "BVSc degree and registration confirmed"

# Alternatively, review via the admin CLI utility
npm run admin -- review-provider \
  --id "<provider-uuid>" \
  --decision VERIFIED \
  --reviewer "admin-operator" \
  --evidence "Physical council certificate inspected" \
  --notes "Approved for clinical practice"
```

#### Supported CLI Decisions:
- `VERIFIED`: Sets status to `VERIFIED`. Validates that qualification, registration number, and authority are populated, and enforces normalized credential uniqueness.
- `REJECTED`: Sets status to `REJECTED`, turns duty `OFF_DUTY`, and clears active leases.
- `SUSPENDED`: Suspends provider account, turns duty `OFF_DUTY`, and terminates active sessions.
- `PENDING`: Resets provider to unreviewed state.

---

### 2.2 Web Admin Verification UI

Administrators can review onboarding submissions visually via the Web Admin dashboard at `/[locale]/admin/providers/verify`.

#### Key Features:
1. **Tabbed Queue**:
   - `PENDING`: Unreviewed applicants awaiting operator inspection.
   - `VERIFIED`: Currently active, approved practitioners.
   - `REJECTED`: Rejected applications with documented reasons.
   - `SUSPENDED`: Temporarily or permanently disabled providers.
2. **Document Viewer**:
   - Direct in-browser viewing of uploaded PDF licenses and image certificates stored securely in `storage/documents/`.
3. **Modal Actions**:
   - **Approve**: Confirms credentials and marks the provider `VERIFIED`.
   - **Reject**: Requires mandatory rejection notes explaining missing documentation or unaccredited qualifications.
   - **Suspend**: Immediately halts active duty leases and revokes all provider sessions.

---

## 3. Credential Lifecycle & Invalidation Rules

To prevent bait-and-switch modifications, provider credentials follow strict state rules:

1. **Initial Registration**: All new providers default to `PENDING` status with duty disabled.
2. **Duty Gating**: Only providers with `VERIFIED` status can toggle `ON_DUTY`.
3. **Profile Modification**:
   - If a verified provider updates core identity or credential fields (registration number, authority, qualification, uploaded certificate), their status **immediately reverts to `PENDING`** and their duty status is forced to `OFF_DUTY`.
   - Modifying fee schedules or bio does not invalidate verification.
4. **Suspension & Rejection**:
   - Setting a provider to `SUSPENDED` or `REJECTED` immediately sets `duty_status = 'OFF_DUTY'`, sets `duty_expires_at = NULL`, and invalidates all active database sessions in the `sessions` table.

---

## 4. Immutable Audit Trail (`credential_reviews`)

Every administrative decision creates an append-only record in the `credential_reviews` table:

```sql
CREATE TABLE credential_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL, -- VERIFIED, REJECTED, SUSPENDED, PENDING
  reviewer_reference TEXT NOT NULL, -- Admin email or operator ID
  evidence_reference TEXT, -- Gazette link, certificate serial, or manual check ID
  notes TEXT, -- Detailed review notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Private notes and evidence references are visible only to administrators.
- The history is permanent and cannot be deleted or mutated by providers.
