# Browser Push Notifications — Phase 1, Unit 2 Implementation Report

## 1. Unit 2 Scope & Summary of Changes

Unit 2 implements the trusted server-side entry point `subscribe-push` as a Supabase Edge Function to safely handle browser push subscription registrations for Horizon.

### Created / Modified Files:

1. **Created**: `supabase/functions/subscribe-push/index.ts`
   - Edge Function entry point implementing explicit Bearer token authentication, 16 KB payload size limit enforcement via bounded stream reading (`req.body.getReader()`), payload validation, strict SSRF push endpoint validation, Option A profile-derived targeting, service-role persistence on `public.push_subscriptions`, duplicate endpoint conflict handling, and CORS response headers.
2. **Created**: `supabase/functions/subscribe-push/test.ts`
   - Unit test suite verifying Bearer token extraction/validation, bounded stream reader cancellation on oversized payloads, request body size limit constants, CORS headers, and SSRF push endpoint validation rules.
3. **Modified**: `supabase/config.toml`
   - Registered `[functions.subscribe-push]` edge function with `enabled = true`, `verify_jwt = true`, `import_map = "./functions/resource-access/deno.json"`, and `entrypoint = "./functions/subscribe-push/index.ts"`.

---

## 2. Request & Response API Contract

### Request Specification:
- **HTTP Method**: `POST` (Preflight `OPTIONS` supported).
- **Headers**:
  - `Authorization`: `Bearer <token>` (Mandatory exact format).
  - `Content-Type`: `application/json`.
  - `Origin`: Origin header validated against allowed domain list (`https://unfollowaman.tech` and local dev origins).
- **Request Body**:
  ```json
  {
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "<base64url_string>",
        "auth": "<base64url_string>"
      }
    },
    "user_agent": "Mozilla/5.0 ..."
  }
  ```

### Response Specifications:
- **201 Created**:
  ```json
  { "success": true, "message": "Push subscription created successfully" }
  ```
- **200 OK** (Subscription refreshed/updated for same user):
  ```json
  { "success": true, "message": "Push subscription updated successfully" }
  ```
- **400 Bad Request** (Malformed JSON, invalid/missing keys, invalid endpoint URL, or stream read error):
  ```json
  { "success": false, "error": "<specific error description>" }
  ```
- **401 Unauthorized** (Missing, empty, or malformed Bearer token / auth error):
  ```json
  { "success": false, "error": "Unauthorized" }
  ```
- **405 Method Not Allowed** (Non-POST request):
  ```json
  { "success": false, "error": "Method not allowed" }
  ```
- **409 Conflict** (Endpoint registered to another user account):
  ```json
  { "success": false, "error": "Push subscription endpoint already registered to another account" }
  ```
- **413 Payload Too Large** (Request body stream exceeds 16 KB):
  ```json
  { "success": false, "error": "Request payload too large" }
  ```
- **500 Internal Server Error** (Database exception without leaking internal credentials):
  ```json
  { "success": false, "error": "Internal server error" }
  ```

---

## 3. Security & Architecture Analysis

### Bearer Token Authentication & Authorization:
- Explicitly extracts access token from `Authorization` header matching `Bearer <token>`. Rejects missing, empty, or non-Bearer authorization headers with HTTP 401.
- Passes the extracted token explicitly to `supabaseUser.auth.getUser(accessToken)`.
- Client-supplied `user_id` is never trusted or accepted from the payload body.
- Service-role client (`supabaseAdmin`) is instantiated solely inside the Edge Function using `SUPABASE_SERVICE_ROLE_KEY` to perform administrative database queries/writes on `public.push_subscriptions` (where direct client `INSERT`/`UPDATE` is revoked). Service-role keys are never returned in responses or logs.

### Request Payload Bounded Size Limit (Streaming Read):
- Enforces a strict 16 KB (`MAX_BODY_BYTES = 16384`) request body limit using `readBoundedBodyStream()`.
- Streams request chunks incrementally via `req.body.getReader()`. If total accumulated bytes exceed 16 KB at any chunk, the stream reader is cancelled immediately via `reader.cancel()`, and the request is aborted with HTTP `413 Payload Too Large`.
- Protects memory against oversized payloads regardless of whether `Content-Length` header is present, missing, or misleading.

### SSRF & Endpoint Validation:
Push endpoints are treated as untrusted URLs and validated via `validatePushEndpoint()` using the platform `URL` parser:
1. **Length Cap**: Capped at 2048 characters.
2. **Protocol Check**: HTTPS required exclusively (`parsed.protocol === "https:"`).
3. **No Embedded Credentials**: Rejects endpoints containing `username` or `password`.
4. **No Fragments**: Rejects endpoints with URL hashes (`#`).
5. **Standard Port Only**: Port must be default 443 (or empty).
6. **Localhost & IP Address Rejection**: Explicitly rejects `localhost`, `*.localhost`, IPv4 (`127.0.0.1`, private ranges), and IPv6 addresses.
7. **Strict Host Allowlist**:
   - Exact matches: `fcm.googleapis.com`, `updates.push.services.mozilla.com`.
   - Domain suffix matches: `*.push.apple.com`, `*.notify.windows.com`, `*.push.opera.com`.
   - Broad suffix wildcards such as `*.googleapis.com` are strictly forbidden and rejected.

*SSRF Boundary Limitation Notice*: Hostname allowlist validation protects against storing endpoints pointing to arbitrary internal/external infrastructure. However, DNS rebinding attacks or resolution shifts occurring at push dispatch time cannot be fully prevented at registration time. Outbound HTTP requests during push dispatch (Unit 3/4) must re-verify IP resolution if required by edge runtime constraints.

### Option A Profile-Derived Targeting:
- Targeting values (`student_class`, `study_medium`) are derived directly from `public.profiles` using the authenticated `user.id`.
- Supported classes: `'8'`, `'9'`, `'10'`, `'11'`, `'12'`.
- Supported mediums: `'english'`, `'hindi'`.
- **Fallback Rule**: If profile is missing, onboarding is incomplete (`onboarding_completed: false`), or either attribute is invalid/absent, store both `student_class = 'general_only'` and `study_medium = 'general_only'`. Mixed pairs or client overrides are impossible.

### Database Persistence & Conflict Resolution:
- Uses `public.push_subscriptions` schema established in Unit 1.
- Before writing, checks for an existing record matching `endpoint`.
  - **New endpoint**: Inserts new record with `user_id`, `endpoint`, `p256dh`, `auth`, `student_class`, `study_medium`, `user_agent`, `is_active = true`.
  - **Same user re-registration**: Updates existing record (`p256dh`, `auth`, `student_class`, `study_medium`, `user_agent`, `is_active = true`, `updated_at = now()`).
  - **Different user conflict**: Returns HTTP `409 Conflict` without revealing existing owner details.

---

## 4. Verification & Validation Results

### Commands Attempted:
1. `deno test supabase/functions/subscribe-push/test.ts`
   - **Result**: `BLOCKED` — `deno` CLI is not installed in the execution environment.
2. `npx tsc --noEmit`
   - **Result**: `BLOCKED` — `tsc` package runner is not available in the sandbox.

### Static Analysis & Code Review:
- Code structure, imports, stream reader handling, and syntax verified via `read_file`.
- Preflight CORS handling and origin validation match project standards in `supabase/functions/resource-access/index.ts`.
- Configuration additions in `supabase/config.toml` verified (`verify_jwt = true`).

---

## 5. Non-Interference & Production Safety Statement

- **No Production Deployments**: No code was deployed to Cloudflare Pages, Supabase Cloud, or any live production environment.
- **No Migration Execution**: Database schema and remote database state remain completely untouched.
- **Protected Documents Intact**: All ten protected reference audit and planning documents remain unmodified in the repository.
- **Unit Boundary Respected**: Units 3 and 4 have not been started.
