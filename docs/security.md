# PashuSeva — Security & Threat Model

This document outlines the security architecture, applied security fixes, threat boundaries, authentication and authorization mechanisms, rate limiting, and consent controls in PashuSeva.

---

## 1. The Four Applied Security Hardening Fixes

The PashuSeva codebase incorporates four foundational security fixes across authentication, data leakage, file storage, and session lifecycle:

### Fix 1: Unified Scrypt + Pepper PIN Hashing
- **Previous Vulnerability**: Inconsistent hash mechanisms (bcrypt vs scrypt) and insecure resets that risked account lockouts or weak work factors.
- **Applied Fix**:
  - All PIN hashing is unified through Node.js `crypto.scrypt` combined with an HMAC-SHA256 server-side pepper (`PIN_PEPPER`).
  - Hashing parameters: $N = 16384$, $r = 8$, $p = 1$, 64-byte derived key, 16-byte cryptographically secure random salt.
  - Stored format: `salt_hex:derived_key_hex`.
  - Constant-time verification using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
  - Applied uniformly across registration (`src/actions/auth.actions.ts`), login (`src/services/auth.service.ts`), admin PIN resets (`scripts/admin.ts`), and seed fixtures (`scripts/seed.ts`).
  - Zero bcrypt usage in authentication code.

### Fix 2: Zero Plaintext Credential Logging
- **Previous Vulnerability**: Console logs and error messages in scripts or services outputting plaintext passwords, PINs, or tokens during operational workflows.
- **Applied Fix**:
  - Eliminated all debug and production logging of raw PINs, tokens, or JWTs.
  - Structured error logging uses sanitized error codes and redactable metadata objects (`src/db/schema/security.ts`).

### Fix 3: Private Storage for Credential Documents
- **Previous Vulnerability**: Uploaded documents placed in the public web root (`public/uploads`) allowing unauthenticated access and directory traversal risks.
- **Applied Fix**:
  - Provider licenses, certificates, and ID documents are uploaded to private disk storage (`storage/documents/`).
  - Strict server-side validation checks file size (maximum 5MB) and allowlisted MIME types (`application/pdf`, `image/jpeg`, `image/png`).
  - Access is restricted exclusively to authenticated administrators and the owning provider via authenticated streaming endpoints.

### Fix 4: Session Token Hashing & Immediate Revocation
- **Previous Vulnerability**: Stateless JWTs without database tracking could not be invalidated upon logout, account suspension, or password reset.
- **Applied Fix**:
  - Signed HS256 JWTs (`jose`) contain an ephemeral session ID.
  - A SHA-256 hash of every active token is stored in the `sessions` table.
  - Every protected request checks the database to verify `sessions.revokedAt IS NULL` and `users.isActive = true`.
  - Session revocation is triggered immediately on logout, admin suspension, and PIN resets.

---

## 2. Threat Model & Authentication Boundaries

### 2.1 Four-Digit PIN Constraints
- **Low Entropy**: A 4-digit PIN has only $10^4 = 10,000$ possible combinations.
- **Defense in Depth**:
  - **Server-Held Pepper**: Protects offline password cracking in the event of a database leak without the server environment configuration.
  - **Strict Rate Limiting**: Max 5 attempts per phone number per 15-minute window prevents brute-force attempts.
  - **Timing Protection**: Verifications execute in constant time regardless of valid or invalid account status.

### 2.2 Unverified Phone Ownership Boundary
- PashuSeva does not integrate a paid SMS OTP gateway due to strict zero-cost boundaries.
- **Implication**: Phone numbers are user-entered and validated for E.164 syntax (+91 format), but possession of the phone number is not cryptographically or SMS verified.
- **Mitigations**:
  - No public "Forgot PIN" endpoint that resets accounts using only a phone number.
  - Account PIN resets require trusted operator verification via the CLI (`npm run auth:reset-pin` / `scripts/admin.ts`).

---

## 3. Atomic Database-Backed Rate Limiting

To prevent race conditions and denial-of-service in clustered or concurrent environments, rate limiting is implemented directly in PostgreSQL (`rate_limit_buckets`):

```sql
INSERT INTO rate_limit_buckets (key_hash, count, window_start, expires_at)
VALUES ($1, 1, NOW(), $2)
ON CONFLICT (key_hash) DO UPDATE
SET
  count = CASE
    WHEN rate_limit_buckets.window_start < $3 THEN 1
    ELSE rate_limit_buckets.count + 1
  END,
  window_start = CASE
    WHEN rate_limit_buckets.window_start < $3 THEN NOW()
    ELSE rate_limit_buckets.window_start
  END,
  expires_at = $2,
  updated_at = NOW()
  RETURNING count, window_start;
```

### Protection Buckets:
- **Phone Auth Bucket**: `auth:<phone>` (5 attempts per 15 minutes).
- **IP Auth Bucket**: `auth_ip:<ip>` (25 attempts per 15 minutes).
- **API Request Bucket**: `api:<userId>` (100 requests per minute).

---

## 4. CSRF, Origin Controls & Proxy Trust

### 4.1 Same-Origin Mutation Protection
- Next.js Server Actions automatically enforce same-origin verification on POST requests (`Host` and `Origin` header matching).
- Session cookies use `SameSite=Lax` and `HttpOnly`, preventing third-party ambient credential transmission on cross-origin POSTs.

### 4.2 Proxy Trust Configuration (`TRUST_PROXY_HOPS`)
- When running behind a reverse proxy (e.g. Nginx, Caddy, Cloudflare), client IP extraction parses `X-Forwarded-For` taking into account the configured number of trusted proxy hops (`TRUST_PROXY_HOPS`).
- Untrusted proxy headers are ignored to prevent IP spoofing attacks against rate limiters.

---

## 5. PII Handling & Data Privacy

- **Data Minimization**: Phone numbers, names, and cattle health data are collected only to the extent necessary to deliver veterinary discovery and medical coordination.
- **Provider Contact Information**: Providers explicitly opt in to public directory listing (`publicContactConsentAt`).
- **Farmer Contact Privacy**: A farmer's phone number is disclosed only to the specific provider who has accepted their active service request.

---

## 6. Authorization Matrix & Role Enforcement

PashuSeva enforces strict role-based access control at the Server Action and Service layers:

| Resource / Action | Farmer | Vet Doctor | Paravet Worker | Admin |
|---|:---:|:---:|:---:|:---:|
| **Discover Nearby Providers** | ✅ | ✅ (Preview) | ✅ (Preview) | ❌ |
| **Create Emergency SOS Request** | ✅ | ❌ | ❌ | ❌ |
| **Create Routine Booking** | ✅ | ❌ | ❌ | ❌ |
| **Accept SOS / Routine Request** | ❌ | ✅ (Verified only) | ✅ (Approved routine only) | ❌ |
| **Toggle On-Duty Lease (8h)** | ❌ | ✅ (Verified only) | ✅ (Verified only) | ❌ |
| **Manage Cattle Records** | ✅ (Own herd) | ❌ | ❌ | ❌ |
| **View Cattle Health Card** | ✅ (Own herd) | With Consent Grant | With Consent Grant | ❌ |
| **Review Provider Credentials** | ❌ | ❌ | ❌ | ✅ (CLI / Web UI) |
| **Reset User PIN** | ❌ | ❌ | ❌ | ✅ (CLI only) |

---

## 7. Consent Management Model

### 7.1 Provider Public Directory Consent
- Providers must explicitly grant consent (`publicContactConsentAt`, `publicMapConsentAt`) during onboarding before their contact links and approximate locations appear in discovery.

### 7.2 Health Card Consent Grants (`health_card_consents`)
- Farmers maintain complete ownership of their livestock medical records.
- Farmers can grant temporary digital consent to attending veterinary practitioners (`grantAccessAction`).
- Providers can only inspect records for animals with an active grant (`revoked_at IS NULL`).
- Farmers can immediately revoke access at any time (`revokeAccessAction`).

---

## 8. Operational PIN Reset Policy

1. **No Self-Service Reset**: Due to unverified phone ownership, self-service automated SMS resets are not supported.
2. **Operator Reset Workflow**:
   - A platform operator must verify the identity of the user through out-of-band operational channels.
   - The operator executes `npm run admin -- reset-pin --phone <phone> --pin <new-pin> --reviewer <admin-id> --reason <reason>`.
   - The reset automatically hashes the new PIN using scrypt + pepper, invalidates all existing sessions in `sessions`, and records an audit log entry in `audit_logs`.

---

## 9. Secret Management & Key Rotation

| Secret Key | Purpose | Rotation Strategy |
|---|---|---|
| `SESSION_SECRET` | Signing HS256 JWT cookies | Generates fresh 32-byte secret; rotating invalidates all active sessions. |
| `PIN_PEPPER` | HMAC key for scrypt PIN hashing | **Critical**: Losing or changing this secret renders existing stored PIN hashes unverifiable. Rotation requires a staged re-hashing migration. |
| `VAPID_PRIVATE_KEY` | Signing Web Push payloads | Rotate using `npx web-push generate-vapid-keys`; requires client re-subscription. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key for browser PushManager subscription | Shared with client browser. |
