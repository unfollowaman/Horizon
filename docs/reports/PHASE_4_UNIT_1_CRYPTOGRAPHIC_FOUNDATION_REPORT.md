# Horizon Browser Push Notifications — Phase 4, Unit 1 Completion Report

**Unit:** Native Web Push Cryptography & VAPID Signing
**Date:** February 2026
**Status:** Completed & Verified (Ready for Review)

---

## 1. Executive Summary

Phase 4, Unit 1 implements the isolated cryptographic foundation for Web Push delivery in Horizon according to RFC 8291 (Message Encryption for Web Push), RFC 8188 (Encrypted Content-Encoding for HTTP), and RFC 8292 (Voluntary Application Server Identification / VAPID).

All operations rely exclusively on native Web Crypto APIs supported in Deno Edge Runtime (`crypto.subtle`), requiring zero external NPM or third-party cryptographic dependencies.

---

## 2. Exact Files Modified & Created

1. **`supabase/functions/send-push-notification/vapid.ts`** *(New File)*
   Self-contained cryptographic helper module implementing Base64URL helpers, P-256 VAPID key import/validation, push endpoint origin extraction & allowlist validation, ES256 VAPID JWT generation/verification, and RFC 8291 / RFC 8188 Web Push payload encryption/decryption.

2. **`supabase/functions/send-push-notification/vapid_test.ts`** *(New File)*
   Focused offline test suite with 18 unit tests covering key import, endpoint security, VAPID JWT claims, RFC 8291 / RFC 8188 round-trip encryption/decryption, exact framing size boundaries, and error sanitization.

3. **`supabase/functions/resource-access/deno.lock`** *(Modified)*
   Lockfile updated for Deno `@std/assert` module imports used in Edge Function testing.

---

## 3. Cryptographic & Security Features

### A. VAPID Endpoint Security & Audience Derivation (`extractVapidAudience`)
- Enforces strict `https:` protocol and standard port 443.
- Rejects user credentials (`username`/`password`), URL fragments (`hash`), non-standard ports (e.g., `:8443`), IP addresses, and `localhost`.
- Enforces Horizon's approved push provider allowlist:
  - Google FCM: `fcm.googleapis.com`
  - Mozilla Push: `updates.push.services.mozilla.com`
  - Apple Web Push: `push.apple.com` and hyphenated prefixes (e.g. `p01-push.apple.com` via `^([a-z0-9-]+-)?push\.apple\.com$`)
  - Microsoft WNS: `*.notify.windows.com`
  - Opera Push: `*.push.opera.com`
- Rejects lookalike hostnames (e.g., `fcm.googleapis.com.malicious.com`).
- Derives the VAPID `aud` claim strictly from the endpoint's `url.origin`.

### B. Payload & Record Size Framing (`encryptWebPushPayload`)
- Protocol framing constants:
  - `HEADER_SIZE = 86` bytes (16B salt + 4B record size `rs` + 1B key ID length + 65B uncompressed sender public key)
  - `GCM_TAG_SIZE = 16` bytes (128-bit AES-GCM tag)
  - `DELIMITER_SIZE = 1` byte (`0x02` end-of-record delimiter)
  - `DEFAULT_RECORD_SIZE = 4096` bytes
  - `MAX_PAYLOAD_BODY_BYTES = 4096` bytes (maximum encrypted HTTP body size)
  - `MAX_PLAINTEXT_BYTES = 3993` bytes (`4096 - 86 - 16 - 1`)
- Enforces record size validation ($18 \le \text{rs} \le 65536$).
- Rejects plaintext inputs exceeding `MAX_PLAINTEXT_BYTES` (3,993 bytes) prior to encryption.

### C. VAPID Key Import & ES256 JWT Signing
- `importVapidPrivateKey`: Supports both 32-byte raw uncompressed Base64URL private scalars (wrapped with P-256 PKCS#8 ASN.1 prefix) and full PKCS#8 DER Base64URL private keys.
- `createVapidJwt`: Generates RFC 8292 compliant JWTs signed with ES256 (P-256 + SHA-256 yielding 64-byte IEEE P1363 signatures). Validates `expirationSeconds` as a finite integer between 1 and 86,400 seconds (24h).
- `verifyVapidJwt`: Validates required claims (`aud`, `sub`, `exp`), expiration timestamp, algorithm (`ES256`), and audience matching.

---

## 4. Test Commands & Verification Results

### Command Executed
```bash
npx deno test --allow-net --allow-env --config supabase/functions/resource-access/deno.json supabase/functions/send-push-notification/
```

### Execution Output
```text
running 34 tests from ./supabase/functions/send-push-notification/test.ts
extractBearerToken - valid Bearer token ... ok (22ms)
extractBearerToken - missing header ... ok (149µs)
...
running 18 tests from ./supabase/functions/send-push-notification/vapid_test.ts
Base64URL - roundtrip encode and decode ... ok (1ms)
Base64URL - reject empty or malformed inputs ... ok (1ms)
Key Validation - import and validate matching VAPID keypair ... ok (54ms)
Key Validation - support both 32-byte raw and PKCS#8 DER private keys ... ok (1ms)
Key Validation - detect mismatched public and private keys ... ok (3ms)
Key Validation - reject invalid private key length ... ok (1ms)
Key Validation - reject invalid public key length or format ... ok (501µs)
Endpoint - extract valid HTTPS origin for approved push providers ... ok (1ms)
Endpoint - reject non-HTTPS, credentials, fragments, custom ports, IPs, or lookalikes ... ok (508µs)
VAPID JWT - structure, claims, and signature verification ... ok (3ms)
VAPID JWT - detect signature mismatch or wrong public key ... ok (4ms)
VAPID JWT - reject missing required claims or audience mismatch ... ok (4ms)
VAPID JWT - reject expired JWT tokens or non-finite expiration values ... ok (3ms)
VAPID Authorization Header - correct RFC 8292 formatting ... ok (2ms)
RFC 8291 / RFC 8188 - End-to-End Interoperability and Roundtrip Verification ... ok (7ms)
Payload Encryption - exact MAX_PLAINTEXT_BYTES (3,993 bytes) boundary test ... ok (3ms)
Payload Encryption - reject malformed subscription materials or invalid record sizes ... ok (1ms)
Security - errors do not leak secret key material ... ok (186µs)

ok | 52 passed | 0 failed (272ms)
```

---

## 5. Environment & Safety Confirmations

1. **Zero External Side-Effects**: No HTTP requests were dispatched to real push services during testing.
2. **Zero Database Alterations**: Production schema, RLS policies, and database tables were not modified.
3. **Zero Deployment**: Edge Functions were not deployed or linked to remote endpoints.
4. **Secret Protection**: Error messages are sanitized and never contain key material or private scalars.

---

## 6. Final Recommendation

**READY FOR REVIEW**
