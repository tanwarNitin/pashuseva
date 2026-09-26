# Limitations and Safety

## Zero-cost boundaries

PashuSeva is built with **no required paid application services or API keys**.

### What this means

1. **Free software ≠ free hosting**: PashuSeva runs on your hardware or hosting. Software is free; electricity, storage, bandwidth, mobile data, and telephone calls are not.

2. **Complete local deployment**: A working deployment requires only PostgreSQL/PostGIS and existing hardware.

3. **Optional free-tier deployment**: Free-tier hosting instructions acknowledge quotas, sleeping services, extension support, and changing provider policies.

4. **OpenStreetMap tile servers**: OpenStreetMap data is open, but standard public tile servers are not an unlimited, SLA-backed production mapping service.

### OpenStreetMap tile usage policy

- **Visible attribution** is required.
- Use **HTTPS** for tile requests.
- **No bulk downloads** or offline tile prefetching.
- **Do not disable HTTP caching**.
- Preserve browser referrer behavior needed by the tile service.
- **Tile URL is configurable** to allow custom tile servers.
- Discovery remains usable without the map.

## Communication boundaries

### Native links

- `tel:` links open a dialer. They **do not prove** that a call connected or completed.
- WhatsApp deep links open a composer. They **do not prove** that a message was sent or delivered.

### Broadcast SOS

"Broadcast SOS" means:

- Creating persisted service offers for selected providers.
- Showing them in their in-app feeds.

**Without push infrastructure**, an active browser session is required to see feed updates.

**We do not claim**:

- Background push notification delivery.
- SMS delivery.
- Guaranteed dispatch.
- Guaranteed emergency response.

## Authentication boundaries

### Phone + PIN without OTP

Phone + PIN authentication **does not verify ownership** of the phone number.

A four-digit PIN has **low entropy**. Hashing and rate limits reduce risk but do not make it equivalent to stronger authentication.

## Provider verification boundaries

### Credential entry is not verification

- Entering a registration number does **not verify** credentials.
- Only a trusted operator can approve or reject credentials through administrative scripts.
- Self-service registration actions **cannot** set verified status or verification timestamps.

### Scope of practice

- **Paravets are not veterinary doctors**.
- Their capabilities must reflect approved training and local scope of practice.
- Vets and paravets have distinct labels and service capabilities in the platform.

## Emergency care boundaries

PashuSeva is **not a substitute for emergency veterinary care**.

- Never display fabricated emergency numbers.
- Never claim universal availability of a regional helpline.
- Clearly label service request status and provider availability.

## Medical advice boundaries

### No AI diagnosis

- Do not provide AI diagnosis.
- Do not provide drug dosages.
- Do not provide automated clinical advice.

Clinical decisions remain the responsibility of qualified veterinary professionals.

## Privacy and data handling

- Health conditions, exact farmer GPS coordinates, PINs, and tokens are **never logged**.
- Exact farmer coordinates are available only to:
  - That farmer
  - Authorized current request recipients
  - Assigned providers
- Discovery does not expose provider identity documents.
- Contact links disclose only information that the farmer **explicitly approves**.
- No mandatory external analytics.
- No public health-record endpoints.

## Deployment safety

### Development vs production

- Seed data is **development-only** and requires explicit opt-in via environment variable.
- Demo credentials are for local testing only.
- Never deploy seed data, demo accounts, or weak PINs to production.

### Database safety

- Never run destructive database commands against an unknown database.
- Migration scripts check for existing data and require explicit confirmation for destructive operations.
- Spatial setup scripts are idempotent and safe to re-run.

## Legal and regulatory compliance

PashuSeva provides a platform for connecting farmers with veterinary service providers. It is the deployer's responsibility to ensure compliance with:

- Local veterinary practice regulations
- Data protection and privacy laws
- Telecommunications regulations
- Professional licensing requirements
- Emergency service regulations

This software is provided as-is, without warranty of any kind.

## Recommended operational practices

1. **Run with proper backups** of the PostgreSQL database.
2. **Monitor rate-limiting logs** for abuse patterns.
3. **Review provider credentials** before approval.
4. **Use strong secrets** for `SESSION_SECRET` and `PIN_PEPPER`.
5. **Enable HTTPS** in production.
6. **Configure proper `TRUST_PROXY_HOPS`** if behind a reverse proxy.
7. **Monitor OpenStreetMap tile usage** and respect their fair-use policy.
8. **Consider custom tile servers** for production deployments with significant traffic.

## Support and maintenance

This is open-source software. There is no guaranteed support, SLA, or emergency response from the software authors.

If you deploy PashuSeva, you are responsible for:

- Maintaining your deployment
- Responding to user issues
- Ensuring provider credential verification
- Monitoring system health
- Handling data privacy requests
- Complying with applicable laws
