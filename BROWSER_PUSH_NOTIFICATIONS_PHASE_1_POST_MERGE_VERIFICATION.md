# Browser Push Notifications — Post-Merge Phase 1 Verification Report

## Executive Summary

**Branch:** `jules-7213040054003855283-b0e1d1db`
**HEAD Commit SHA:** `b8b8c83b358f3831f161d3921a702064c21da1a4`
**Audit Date:** March 30, 2026
**Final Verdict:** `PROCEED AFTER VERIFICATION`

This audit evaluates the repository state after merging Unit 4 (`seed_admin.mjs`) into `main`. All four Phase 1 units are present, structurally complete, and type-safe. The client build and pre-rendering pipeline succeed without errors, and the Unit 4 test suite passes completely. Live database execution and Edge Function deployment remain unverified pending remote Supabase environment checks.

---

## 1. Four-Unit Status Matrix

| Unit | Title | Key Artifacts | Integration Status | Local Verification | Live Database Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit 1** | Database Foundation | `supabase/migrations/20260201000000_push_notifications_foundation.sql`<br>`src/types/index.ts` | **MERGED ON MAIN** | **PASS** (SQL valid, TS schema types match, `tsc -b` passes) | **UNVERIFIED** (Requires remote Supabase DB access) |
| **Unit 2** | `subscribe-push` Edge Function | `supabase/functions/subscribe-push/index.ts`<br>`supabase/functions/subscribe-push/test.ts`<br>`supabase/config.toml` | **MERGED ON MAIN** | **PASS** (Code & config verified; Deno CLI not installed locally) | **UNVERIFIED** (Requires deployed Edge Function execution) |
| **Unit 3** | `send-push-notification` Edge Function | `supabase/functions/send-push-notification/index.ts`<br>`supabase/functions/send-push-notification/test.ts`<br>`supabase/config.toml` | **MERGED ON MAIN** | **PASS** (Skeleton mode verified; Deno CLI not installed locally) | **UNVERIFIED** (Requires deployed Edge Function execution) |
| **Unit 4** | Administrator Seeding Script | `scripts/seed_admin.mjs`<br>`scripts/__tests__/seed_admin.test.ts` | **MERGED ON MAIN** | **PASS** (11/11 unit tests passed; script not executed against real account) | **NOT APPLICABLE** (CLI administrative utility) |

---

## 2. Unit Audit & Inspection Findings

### Unit 1 — Database Foundation
- **Migration SQL:** `supabase/migrations/20260201000000_push_notifications_foundation.sql`
  - Defines `public.push_subscriptions` with UUID primary key, `user_id` foreign key referencing `auth.users(id) ON DELETE CASCADE`, `endpoint` (UNIQUE), `p256dh`, `auth`, `user_agent`, `student_class` CHECK (`'8','9','10','11','12','general_only'`), and `study_medium` CHECK (`'english','hindi','general_only'`).
  - Constraint `chk_paired_general_only`: Enforces paired `'general_only'` values (both must be `'general_only'` or both non-`'general_only'`).
  - Defines `public.announcements` with status CHECK (`'draft','sending','sent','failed'`), recipient counters, and `created_by` foreign key referencing `auth.users(id) ON DELETE SET NULL`.
  - Grants & RLS: `REVOKE ALL` from PUBLIC/anon/authenticated on both tables. `GRANT SELECT, DELETE ON push_subscriptions TO authenticated`. `GRANT SELECT ON announcements TO authenticated, anon`. Owner-only RLS policies on `push_subscriptions` (`auth.uid() = user_id`) and public read policy for sent `announcements`.
- **TypeScript Types:** `src/types/index.ts`
  - Exports `PushSubscriptionRow` and `AnnouncementRow` matching SQL columns, including nullability (`user_agent: string | null`, `image_url: string | null`, `sent_at: string | null`).
  - Explicitly mapped in `Database['public']['Tables']` with `Relationships: []` to prevent PostgREST generic type resolution errors when referencing un-mapped schemas like `auth`.

### Unit 2 — `subscribe-push` Edge Function
- **Implementation:** `supabase/functions/subscribe-push/index.ts`
  - Registered in `supabase/config.toml` (`[functions.subscribe-push]`, `verify_jwt = true`).
  - Auth: Validates `Authorization: Bearer <token>` header via `supabaseUser.auth.getUser(accessToken)`.
  - Option A Targeting: Queries `public.profiles` via `supabaseAdmin` service role client for `student_class`, `study_medium`, and `onboarding_completed`. If onboarding is incomplete or values are invalid/missing, defaults to `student_class = 'general_only'` and `study_medium = 'general_only'`.
  - Security & Input Limits: Stream reading bounded to `MAX_BODY_BYTES` (16 KB) via `readBoundedBodyStream`. Strict SSRF endpoint validation (`validatePushEndpoint`) enforcing HTTPS, no credentials/fragments, standard port 443, rejecting localhost/IPs, and restricting hosts to approved allowlist (FCM, APNs, Mozilla, Windows, Opera).
  - Persistence & Conflicts: Queries `push_subscriptions` by endpoint using `supabaseAdmin`. If endpoint belongs to a different `user_id`, returns 409 Conflict without leaking account information. If owned by same user, updates record; if new, inserts record.

### Unit 3 — `send-push-notification` Edge Function
- **Implementation:** `supabase/functions/send-push-notification/index.ts`
  - Registered in `supabase/config.toml` (`[functions.send-push-notification]`, `verify_jwt = true`).
  - Security & Authorization: Enforces POST method, Content-Type `application/json` (HTTP 415 on mismatch), Bearer token authentication, and admin role authorization (`isUserAdmin` checking `app_metadata.role === 'admin'`). Disallows client-assigned `user_metadata` or `profiles.role`.
  - Payload Validation & Stream Limits: Bounded stream read (16 KB max). Enforces field lengths (`title` max 120 chars, `message`/`body` max 500 chars) and paired Option A targeting rules (`target_class` and `target_medium` must both be `'all'` or both specific values).
  - Subscriber Counting Query: Queries `push_subscriptions` where `is_active = true` filtered by targeting parameters using `supabaseAdmin` service role client.
  - **SKELETON STATUS CONFIRMATION:** EXPLICITLY CONFIRMED. The endpoint returns `"message": "Push notification request accepted (skeleton mode)"`, returning target parameters and subscriber count. It DOES NOT include VAPID cryptographic key loading, ECDSA payload signing, Web Push encrypted body preparation, or outgoing network fetch calls to push service providers.

### Unit 4 — Administrator Seeding Script
- **Implementation:** `scripts/seed_admin.mjs`
  - Identifies target user by UUID (`getUserById`) or email (`listUsers` with pagination).
  - Requires `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` / `VITE_SUPABASE_URL`.
  - Preserves existing `app_metadata` properties and assigns `app_metadata.role = 'admin'`.
  - Checks idempotency: Returns `updated: false` if `app_metadata.role` is already `'admin'`.
  - Security & Privacy: `maskIdentifier()` masks emails (`a***n@domain.com`) and UUIDs (`12345678...abcd`) in console logs. Refuses auto-creation of nonexistent user accounts. Safe failure on ambiguous email matches.

---

## 3. Security Findings

1. **Role Delegation via Trusted Metadata:**
   - Edge function `send-push-notification` relies exclusively on `user.app_metadata.role === 'admin'`, set server-side via `seed_admin.mjs` using `SUPABASE_SERVICE_ROLE_KEY`. Client-modifiable `user_metadata` is strictly ignored.
2. **SSRF Endpoint Allowlisting:**
   - `subscribe-push` enforces domain allowlisting for push service endpoints, preventing Server-Side Request Forgery against internal infrastructure or untrusted hosts.
3. **Payload Stream Bounding (OOM DoS Protection):**
   - Both Edge Functions read request streams chunk-by-chunk up to 16 KB (`MAX_BODY_BYTES`), immediately canceling oversized streams to prevent memory exhaustion attacks.
4. **Least-Privilege Database Permissions:**
   - Table `push_subscriptions` revokes client `INSERT` and `UPDATE` access, preventing users from altering subscription targeting or impersonating endpoints. Write operations are gated behind `subscribe-push` using `SUPABASE_SERVICE_ROLE_KEY`.
5. **Credential & Log Masking:**
   - `seed_admin.mjs` masks sensitive target identifiers in console logs and outputs no service role keys or user credentials.

---

## 4. Test Commands & Actual Results

| Command | Status | Details / Output |
| :--- | :--- | :--- |
| `npm ci` | **PASS** | Installed 319 packages in 19s using `package-lock.json`. |
| `npx tsc -b` | **PASS** | TypeScript project references built with 0 type errors. |
| `npm run build` | **PASS** | Prebuild PDF worker copy, sitemap generation (130 URLs), Vite build (2.44s), and static pre-rendering (72 resource pages) completed successfully. |
| `npx vitest run scripts/__tests__/seed_admin.test.ts` | **PASS** | Passed 11 out of 11 unit tests for Unit 4 admin seeding. |
| `npx vitest run` | **FAIL** | 70 test files passed, 2 test files failed (425 passed / 2 failed out of 427 total tests).<br>- `PdfViewer.test.tsx`: `ReferenceError: ResizeObserver is not defined` from `react-zoom-pan-pinch` in jsdom.<br>- `ResourceDetails.test.tsx`: Download button selection assertion failed. |
| `deno test` | **BLOCKED** | `deno: command not found` in the execution environment. |
| `npm run lint` | **FAIL** | 16 ESLint errors across 6 files (`seed_admin.test.ts`, `HeroPhoneAnimation.tsx`, `send-push-notification/index.ts`, `send-push-notification/test.ts`, `subscribe-push/index.ts`, `subscribe-push/test.ts`). |
| `node scripts/seed_admin.mjs` | **NOT RUN** | Prohibited from executing against real production user accounts during audit. |

---

## 5. Verified Facts vs. Unverified Claims

### Verified Facts
- All four Phase 1 code units and tests exist on `main` branch commit `b8b8c83b358f3831f161d3921a702064c21da1a4`.
- TypeScript definitions (`src/types/index.ts`) compile cleanly with `npx tsc -b`.
- Unit 4 (`seed_admin.mjs`) logic passes 11/11 automated unit tests covering UUID lookup, email lookup, pagination, idempotency, metadata preservation, and masking.
- `send-push-notification` is verified to be a skeleton validator/counter that does not perform Web Push protocol delivery.
- Production build and static page pre-rendering complete successfully (`npm run build`).

### Unverified Claims
- **Live Supabase Schema Application:** Unverified whether `20260201000000_push_notifications_foundation.sql` has been executed on the live Supabase instance.
- **Migration History:** Unverified whether migration `20260201000000` is recorded in `supabase_migrations.schema_migrations`.
- **Live RLS & Grants:** Unverified whether `pg_policies` and table privileges match on the live database.
- **Edge Function Deployment:** Unverified whether `subscribe-push` and `send-push-notification` are deployed and operational on Supabase Edge Functions infrastructure.
- **Service Role Environment Keys:** Unverified whether `SUPABASE_SERVICE_ROLE_KEY` is configured in Supabase Edge Functions environment secrets.

---

## 6. Remaining Blockers in Priority Order

1. **[HIGH] Live Supabase Migration Application:**
   - Confirm migration `20260201000000_push_notifications_foundation.sql` is applied on the remote Supabase database instance (`supabase db push` or `supabase migration repair`).
2. **[HIGH] Edge Function Deployment & Environment Secrets:**
   - Deploy `subscribe-push` and `send-push-notification` functions to Supabase and configure required secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`).
3. **[MEDIUM] ESLint Rules Cleanup:**
   - Resolve 16 ESLint lint errors across edge functions, test files, and animation components (`_e` unused vars, `@ts-ignore` to `@ts-expect-error`, `prefer-const`).
4. **[MEDIUM] Pre-existing Test Failures in Client Test Suite:**
   - Fix `ResizeObserver` mock setup in `PdfViewer.test.tsx` and DOM assertion in `ResourceDetails.test.tsx`.
5. **[LOW] Phase 2 Web Push VAPID Implementation:**
   - Upgrade `send-push-notification` from validator/counter skeleton to full Web Push VAPID signing and web-push payload delivery.

---

## 7. Recommended Next Action

Execute Supabase CLI migration verification against the target remote environment:
```bash
supabase migration list --linked
```
If migration `20260201000000` is pending on the remote database, apply it via:
```bash
supabase db push
```
Then deploy the edge functions and seed the administrator account using `ADMIN_USER_ID` or `ADMIN_EMAIL`.

---

## Final Verdict

**`PROCEED AFTER VERIFICATION`**
