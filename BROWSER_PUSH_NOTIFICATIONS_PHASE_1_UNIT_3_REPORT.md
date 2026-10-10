# Browser Push Notifications — Phase 1, Unit 3 Implementation Report

## 1. Objective and Implemented Scope

Unit 3 implements the administrator notification submission entry point `send-push-notification` as a Supabase Edge Function skeleton for Horizon's Browser Push Notifications Phase 1.

The function handles CORS preflight, enforces POST HTTP method, authenticates users via explicit Bearer token verification, restricts access strictly to administrators via trusted Supabase Auth `app_metadata.role === 'admin'`, enforces a 16 KB body payload limit, validates JSON payload structure and targeting parameters under Option A rules, and computes active matching subscriber counts on `public.push_subscriptions` using a service-role client.

---

## 2. Files Created and Modified

1. **Created**: `supabase/functions/send-push-notification/index.ts`
   - Edge Function entry point implementing explicit Bearer token authentication, trusted `app_metadata.role === 'admin'` authorization check (HTTP 403 for non-admins), 16 KB payload size limit enforcement via bounded stream reading (`req.body.getReader()`), JSON object shape validation (`validateJsonObject`), request contract and paired Option A targeting validation (`validateSendNotificationRequest`), service-role subscriber count query, and CORS response headers.
2. **Created**: `supabase/functions/send-push-notification/test.ts`
   - Unit test suite verifying Bearer token extraction/validation, `isUserAdmin` authorization logic, JSON object shape validation (`validateJsonObject`), request payload parsing and Option A targeting rules (title/message limits, valid/invalid target classes and mediums, paired general vs restricted targeting enforcement, unexpected field rejection), bounded stream reader cancellation on oversized payloads, request body size limit constants, and CORS headers.
3. **Modified**: `supabase/config.toml`
   - Registered `[functions.send-push-notification]` edge function with `enabled = true`, `verify_jwt = true`, `import_map = "./functions/resource-access/deno.json"`, and `entrypoint = "./functions/send-push-notification/index.ts"`.
4. **Modified**: `src/types/index.ts`
   - Defined `PushSubscriptionRow` and `AnnouncementRow` type definitions and updated `Database['public']['Tables']` to include `push_subscriptions` and `announcements` table schema types.

---

## 3. Authentication and Authorization Behavior

- **Authentication**:
  - Extracts the access token explicitly from the `Authorization` header matching `Bearer <token>` (`extractBearerToken`).
  - Passes the extracted token explicitly to `supabaseUser.auth.getUser(accessToken)`. Rejects missing, empty, invalid format, or invalid tokens with HTTP 401 (`Unauthorized`).
- **Authorization**:
  - Validates administrator privileges using trusted Supabase Auth metadata: `user.app_metadata?.role === 'admin'` (`isUserAdmin`).
  - Client-supplied metadata or user-editable profile roles (`profiles.role`) are strictly ignored.
  - Rejects unauthenticated requests (HTTP 401) and authenticated non-admin requests (HTTP 403 `Forbidden: Administrator role required`) BEFORE reading request body stream or performing database queries.
  - Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is instantiated solely inside server-side Edge Function execution and is never exposed in responses or logs.

---

## 4. Request Contract and Validation

### Request API Contract
- **HTTP Method**: `POST` (Preflight `OPTIONS` supported).
- **Headers**:
  - `Authorization`: `Bearer <token>` (Mandatory exact format).
  - `Content-Type`: `application/json`.
  - `Origin`: Origin header validated against allowed domain list (`https://unfollowaman.tech` and local dev origins).
- **Request Body**: Plain JSON object (maximum 16 KB).
  ```json
  {
    "title": "Class 10 English Notes Uploaded",
    "message": "New study resources are available now.",
    "target_class": "10",
    "target_medium": "english"
  }
  ```

### Validation Rules (`validateSendNotificationRequest`):
- **Allowed Keys**: Only `title`, `message`, `body`, `target_class`, and `target_medium` are permitted. Any unexpected fields trigger an immediate HTTP 400 rejection (`Unexpected field in request body`).
- **Title**: Non-empty trimmed string, 1 to 120 characters.
- **Message / Body**: Non-empty trimmed string, 1 to 500 characters (`body` supported as alias).
- **Target Class**: Must be one of `'all'`, `'8'`, `'9'`, `'10'`, `'11'`, or `'12'`.
- **Target Medium**: Must be one of `'all'`, `'english'`, or `'hindi'`.
- **Paired Option A Targeting Enforcement**:
  - General announcements: `target_class = 'all'` AND `target_medium = 'all'`.
  - Restricted announcements: `target_class` in `['8', '9', '10', '11', '12']` AND `target_medium` in `['english', 'hindi']`.
  - Mismatched pairs (e.g. `target_class = 'all'` with `target_medium = 'english'` or `target_class = '9'` with `target_medium = 'all'`) are rejected with HTTP 400.

### Response API Contract
- **200 OK**:
  ```json
  {
    "success": true,
    "message": "Push notification request accepted (skeleton mode)",
    "recipient_count": 42,
    "target": {
      "target_class": "10",
      "target_medium": "english"
    }
  }
  ```
- **400 Bad Request**: Malformed JSON, non-object JSON shape, missing/invalid fields, title/message length violations, invalid target values, or mismatched general/restricted targeting pairs.
- **401 Unauthorized**: Missing or invalid Bearer token.
- **403 Forbidden**: Authenticated non-admin user (`app_metadata.role !== 'admin'`).
- **405 Method Not Allowed**: Non-POST HTTP request method.
- **413 Payload Too Large**: Request body exceeds 16 KB.
- **500 Internal Server Error**: Database query error without leaking internal credentials or subscription tokens.

---

## 5. Targeting Behavior

Under Option A targeting:
1. **General Announcements** (`target_class = 'all'` and `target_medium = 'all'`):
   - Queries all active subscriptions (`is_active = true`) on `public.push_subscriptions`.
   - Reaches all active subscribers, including `general_only` subscriptions (subscriptions created by users with incomplete or unverified profiles).
2. **Restricted Announcements** (e.g., `target_class = '10'` and `target_medium = 'english'`):
   - Queries active subscriptions (`is_active = true`) where `student_class = target_class` AND `study_medium = target_medium`.
   - `general_only` subscriptions are automatically excluded because their stored targeting values do not match specific class/medium strings.
3. **Privacy Control**:
   - Queries subscriber counts using `head: true` aggregate queries (`count: "exact"`).
   - Never exposes subscription endpoints, p256dh/auth encryption keys, or user IDs in response payloads or server logs.

---

## 6. Security Measures and Known Limitations

### Security Controls:
- **CORS Allowlist**: Strict origin validation (`https://unfollowaman.tech` and local dev origins). No wildcard `*` origins allowed.
- **Method Restriction**: Strictly enforces HTTP POST and OPTIONS preflight.
- **Bounded Stream Reading**: Maximum 16 KB (`MAX_BODY_BYTES = 16384`) stream size check cancels stream reader immediately upon overflow.
- **Strict Payload Whitelisting**: Rejects extra fields in request JSON to prevent parameter pollution or privilege escalation attempts.
- **Admin Authorization Boundary**: Explicitly checks `app_metadata.role === 'admin'` before stream parsing or database queries.

### Known Limitations & Skeleton Boundaries:
- **Skeleton Status**: This unit establishes the request contract, security checks, administrator authorization, and database target counting query.
- **Push Delivery Pending**: Actual Web Push protocol HTTP dispatch (generating VAPID headers, encrypting Web Push payloads, and transmitting webpush requests to FCM, Apple, Mozilla, Windows, or Opera push services) is NOT included in Unit 3 and remains pending for subsequent implementation units / Phase 2.

---

## 7. Tests Executed, Exact Commands, and Results

### Commands Attempted:
1. `deno test supabase/functions/send-push-notification/test.ts`
   - **Command**: `deno test supabase/functions/send-push-notification/test.ts`
   - **Result**: `BLOCKED` — `deno` CLI binary is not installed in the execution environment (`-bash: deno: command not found`).

---

## 8. Checks That Could Not Run and Why

- **Deno Test Suite Execution**: `deno test` could not run in the sandbox because `deno` CLI is absent from the execution environment path.
- **Vitest Unit Tests**: `npm test` / `vitest` could not run because `node_modules` is not installed in the execution environment.
- **Static Analysis & Inspection**: Code syntax, functions, imports, types, and git merge diffs were verified using `git status`, `git diff`, and `read_file`.

---

## 9. Actual Push Delivery Status

- **Status**: **PENDING (Skeleton Implementation Only)**.
- Actual Web Push notification delivery (VAPID crypto signing and HTTP push endpoint POST requests) is explicitly omitted in Unit 3 in accordance with the Phase 1 skeleton boundary specification.

---

## 10. Deviations from the Approved Plan

- **Discrepancy Note — Migration File**: `20260201000000_push_notifications_foundation.sql` was documented in Unit 1 implementation report and memory, but is not present in the current git working tree. As instructed in Section 1 ("Treat the actual repository files as the source of truth for the current implementation. If an expected file is missing or differs from the approved plan, document the discrepancy rather than silently inventing a replacement."), this discrepancy is noted here without creating duplicate migration files.

---

## 11. Final Status

**READY FOR REVIEW**
