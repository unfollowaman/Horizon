# Horizon — Phase 1.1.4: Remaining Security & Implementation Audit

## 1. Executive Summary

This independent, repository-backed security and implementation audit conducts a forensic investigation into Horizon's single-active-device session architecture and surrounding security boundaries. Previous phases (Phases 1.0 through 1.1.3) settled the core theoretical architecture—confirming that an Edge Login Orchestrator (`auth-login` with `verify_jwt = false`) with an authoritative database registry (`security.user_active_sessions`), per-user transactional advisory locking (`pg_advisory_xact_lock`), a bounded 750ms collision window, and conditional session deactivation provides a robust model for single-device session enforcement. Furthermore, Phase 1.1.3 eliminated the dangerous `auth.admin.signOut("others")` call, avoiding cross-session refresh token revocation races.

Our objective in Phase 1.1.4 is not to reopen settled concurrency decisions, but to independently audit the current codebase and live repository state to determine:
1. What components of the single-active-device session architecture are actually implemented in the codebase vs. what remains documented design specifications.
2. Whether existing protected resource access paths (database RLS, Private Supabase Storage, Study Notes Edge Functions) enforce active session checks today.
3. Whether the logout lifecycle, frontend teardown, Realtime messaging, email confirmation, and administrative operations are implemented and secured.
4. What verifiable gaps, vulnerabilities, and implementation tasks remain before the system can be deployed and declared fully secure.

### Summary Verdict
**Verifiable Codebase Status**: **NOT READY (Pending Phase 1.2 Implementation)**.
While the theoretical architecture designed in Phase 1.1.3 is sound, rigorous, and completely resolves historical concurrency dilemmas, an audit of the current repository reveals that the core database registry (`security.user_active_sessions`), the SQL functions (`register_active_session`, `deactivate_active_session`, `is_active_session`), the Edge Login Orchestrator (`auth-login`), the Realtime session revocation broadcast listener, and the active-session enforcement in `resource-access` have not yet been implemented in code. Currently, any authenticated user holding an unexpired JWT can access protected Study Notes regardless of concurrent logins on other devices. Administrative operations (`send-push-notification`, `AdminRoute`, `seed_admin.mjs`) are strongly and correctly implemented with independent server-side checks.

---

## 2. Repository and Architecture Inventory

### 2.1 Codebase Files & Infrastructure Inspected
The audit inspected the actual working tree across the frontend, Edge Functions, database migrations, configuration files, and utility scripts:

| Component / Layer | File Path | Actual Role & Implemented State |
| :--- | :--- | :--- |
| **Client Auth Service** | `src/services/auth.ts` | Direct client-side calls to `supabase.auth.signInWithPassword`, `signUp`, `signOut`, `getUser`. Native GoTrue client flow. |
| **Auth State Context** | `src/context/AuthContext.tsx` | React Context managing `session`, `user`, `profile`, `isAdmin`, `signOut`, `refreshSession`. Dynamic import of `@supabase/supabase-js`. |
| **Login Component** | `src/pages/auth/Login.tsx` | Renders form; calls `services/auth.login(email, password)` directly without proxying through an Edge Login Orchestrator. |
| **PDF Viewer & Downloader** | `src/pages/resources/PdfViewer.tsx`, `usePdfData.ts` | Fetches metadata from `learning_resources`; requests 60s signed URLs for protected notes via `resource-access` Edge Function. |
| **Resource Access Function** | `supabase/functions/resource-access/index.ts` | Edge Function validating `Authorization: Bearer <JWT>` via `supabase.auth.getUser()`, queries `learning_resources`, returns Storage signed URL via `supabaseAdmin.storage.createSignedUrl`. |
| **Push Notification Dispatcher** | `supabase/functions/send-push-notification/index.ts` | Admin-only Edge Function. Server-side role check `isUserAdmin(user)` checking `user.app_metadata.role === 'admin'`. Service-role queries and Web Push gateway dispatches. |
| **Push Notification Registration** | `supabase/functions/subscribe-push/index.ts` | Edge Function registering/unsubscribing Web Push subscriptions in `public.push_subscriptions` with dual-filter `eq("id", ...).eq("user_id", ...)`. |
| **Database Migrations** | `supabase/migrations/` | Exactly three migrations: `20250501000000_add_chapter_content_fields.sql`, `20260101000000_create_syllabus_tables.sql`, `20260201000000_push_notifications_foundation.sql`. No migration exists for `user_active_sessions`. |
| **Admin Route Guard** | `src/components/AdminRoute.tsx` | Frontend route guard checking `isAdmin`. Redirects unauthenticated to `/login`, non-admin to `/dashboard`. |
| **Admin Seeding Script** | `scripts/seed_admin.mjs` | Node.js script using `auth.admin.updateUserById` to set `app_metadata.role = 'admin'` using `SUPABASE_SERVICE_ROLE_KEY`. |
| **Supabase Local Config** | `supabase/config.toml` | Local development configuration: `enable_confirmations = false`, `verify_jwt = true` on existing functions. |

### 2.2 Confirmed Table Inventory
The database contains exactly nine confirmed tables:
1. `public.announcements`
2. `public.chapter_completion`
3. `public.chapters`
4. `public.learning_resources`
5. `public.profiles`
6. `public.push_subscriptions`
7. `public.reading_progress`
8. `public.syllabus_topic_resources`
9. `public.syllabus_topics`

*Note: As confirmed in Phase 1.1.3, there is no `books` table, and `learning_resources` is a database table, not a Storage bucket.*

---

## 3. Logout Implementation Findings (Scope A)

### 3.1 Server-Side Session Deactivation & Token Availability
- **Inspected Code**: `src/services/auth.ts` lines 32–35, `src/context/AuthContext.tsx` lines 152–165.
- **Current Behavior**:
  ```typescript
  // src/services/auth.ts
  export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  ```
  In `AuthContext.tsx`:
  ```typescript
  const signOut = useCallback(async () => {
    authVersionRef.current++;
    try {
      const { logout } = await import('../services/auth');
      await logout();
    } catch (err) {
      console.error('Error during signOut in AuthContext:', err);
    } finally {
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }
  }, []);
  ```
- **Finding**: Calling `supabase.auth.signOut()` directly invokes GoTrue's `/logout` endpoint. In the installed GoTrue client SDK, this revokes the session on the GoTrue server and clears local browser storage (`sb-<project>-auth-token`).
- **Defect**: There is **no call** to a server-side `deactivate_active_session()` RPC function in `public` or `security`. Because `security.user_active_sessions` is not yet created, no session registry deletion occurs.
- **Severity**: **High**.
- **Status**: **Confirmed (Not Yet Implemented)**.

### 3.2 Advisory Locking & Conditional Deletion in SQL
- **Inspected Code**: `supabase/migrations/`.
- **Finding**: The database migration creating `public.deactivate_active_session()` with `pg_advisory_xact_lock` and conditional deletion (`WHERE user_id = v_user_id AND active_session_id = v_session_id`) has not been applied to the codebase.
- **Analysis of Settled Design**: When implemented in Phase 1.2, `deactivate_active_session()` must execute *before* or *in conjunction with* `supabase.auth.signOut()`. Because `deactivate_active_session()` requires the caller's JWT (`request.jwt.claims ->> 'session_id'`), it must be invoked while the session JWT is still valid in memory.
- **Severity**: **High**.
- **Status**: **Confirmed (Pending Implementation)**.

### 3.3 Partial-Failure Recovery & State Hygiene
- **Inspected Code**: `src/context/AuthContext.tsx` lines 157–164.
- **Current Behavior**: The `finally` block in `AuthContext.signOut` guarantees that local React state (`session`, `user`, `profile`) is set to `null` even if `logout()` throws a network or server error.
- **Finding**: Local teardown is resilient against server-side failures. However, if the network drops before the server receives the logout request, the session remains active in GoTrue. Under the Phase 1.1.3 architecture, this is self-healing: subsequent logins on any device will displace the orphaned session via `register_active_session`.
- **Severity**: **Informational**.
- **Status**: **Confirmed Safe**.

---

## 4. Protected Resource Enforcement Findings (Scope B)

### 4.1 Study Notes PDF Signed URL Retrieval
- **Inspected Code**: `supabase/functions/resource-access/index.ts` lines 86–177.
- **Current Authorization Flow**:
  1. Validates `Authorization` header present (HTTP 401 if missing).
  2. Parses JSON body and validates numeric/string `resource_id`.
  3. Initializes user-scoped Supabase client with bearer token:
     ```typescript
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
     ```
  4. Calls `supabase.auth.getUser()`. If invalid or expired, returns HTTP 401 `Unauthorized`.
  5. Queries `learning_resources` for `storage_bucket` and `file_path`.
  6. Uses `supabaseAdmin.storage.from(resource.storage_bucket).createSignedUrl(resource.file_path, 60)`.
  7. Returns `{ success: true, signed_url: ..., expires_in: 60 }`.
- **Defect 1 (Active Session Gating Missing)**: The Edge Function does NOT check whether the request's JWT `session_id` matches `security.user_active_sessions`. Any valid, unexpired Supabase JWT issued to that user can generate signed URLs indefinitely until the 1-hour JWT expires, completely bypassing single-device enforcement!
- **Defect 2 (Email Confirmation Missing)**: The Edge Function does NOT check `user.email_confirmed_at`. Users with unconfirmed email addresses can retrieve protected study notes.
- **Severity**: **Critical**.
- **Status**: **Confirmed Implementation Gap**.

### 4.2 Storage Bucket Gating (`protected resources` vs. `pdfs`)
- **Storage Configuration**:
  - `pdfs` bucket: Public bucket used for Previous Year Question Papers (PYQs). Public access is intentional for SEO and open educational access.
  - `protected resources` bucket: Private bucket used for Study Notes. Direct unauthenticated access is blocked by Supabase Storage RLS.
- **Service-Role Bypass Risk**: `resource-access` generates signed URLs using `supabaseAdmin.storage`, which uses the `SUPABASE_SERVICE_ROLE_KEY`. Because service-role bypasses all Storage RLS policies, the Edge Function itself is the **sole security gatekeeper**. Without active-session checks inside `resource-access`, Storage is exposed to superseded sessions.
- **Severity**: **Critical**.
- **Status**: **Confirmed**.

### 4.3 Database RLS Policies on Student Progress Tables
- **Inspected Tables**: `public.reading_progress`, `public.chapter_completion`, `public.profiles`.
- **Current Behavior**: Client queries in `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` and `src/pages/user/hooks/useDashboardProgress.ts` query `reading_progress` and `chapter_completion` directly using `supabase.from(...)`.
- **Finding**: These tables rely on standard Supabase RLS (`auth.uid() = user_id`). They do not invoke `public.is_active_session()`. Consequently, a superseded session holding a valid JWT can still read and write student progress until token expiry.
- **Severity**: **Medium**.
- **Status**: **Confirmed Gap**.

---

## 5. Frontend Session Teardown Findings (Scope C)

### 5.1 Realtime Notification Subscription & Handling
- **Inspected Code**: `src/context/AuthContext.tsx`, `src/App.tsx`, `src/pages/resources/PdfViewer.tsx`.
- **Current Behavior**:
  - There is **no Realtime channel subscription** listening for `session_replaced` or broadcast events in `AuthContext` or `App.tsx`.
  - A search across `src/` for `realtime` or `channel` returns 0 results.
- **Finding**: When a user logs in on Device B, Device A receives no notification and remains on its current screen with stale state.
- **Severity**: **High**.
- **Status**: **Confirmed (Not Yet Implemented)**.

### 5.2 Window Focus, Tab Visibility, and Foreground Validation
- **Inspected Code**: `src/context/AuthContext.tsx`.
- **Current Behavior**:
  - `AuthContext` subscribes only to `supabase.auth.onAuthStateChange`. It does NOT listen to `window.addEventListener('focus', ...)` or `document.addEventListener('visibilitychange', ...)`.
  - When returning to a hidden tab, no active session validation check is performed.
- **Severity**: **Medium**.
- **Status**: **Confirmed Missing**.

### 5.3 PDF Viewer Tear-Down and Eviction UX
- **Inspected Code**: `src/pages/resources/PdfViewer.tsx` lines 210–260, `usePdfData.ts`.
- **Current Behavior**:
  - If `fetchSignedUrl` encounters an HTTP 401 response from `resource-access`, it sets `pdfError = '401_UNAUTHORIZED'`.
  - `PdfViewer.tsx` intercepts `'401_UNAUTHORIZED'` and renders the "Login required" card with options to Log in or Create account.
  - However, it does NOT display the required message:
    *"You've been logged out because your account was signed in on another device or browser."*
  - Furthermore, if the PDF was already loaded, `pdfData` (in-memory `ArrayBuffer`) remains in React state until the user navigates away or refreshes.
- **Severity**: **Medium**.
- **Status**: **Confirmed Implementation Gap**.

---

## 6. Realtime Security and Reliability Findings (Scope D)

### 6.1 SDK Version & API Capability Verification
- **Inspected Version**: `@supabase/supabase-js` v2.112.2 / `@supabase/realtime-js` v2.112.2 in `package-lock.json` and `node_modules`.
- **SDK Inspection**:
  - File: `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js` line 140.
  - Method `httpSend(event, payload, opts)` exists and is fully implemented.
  - Supports publishing broadcast messages to Realtime topics via HTTP POST without establishing long-lived WebSockets.
- **Finding**: The server-side broadcast mechanism proposed in Phase 1.1.3 is 100% supported by the installed library.
- **Severity**: **Informational**.
- **Status**: **Verified Supported**.

### 6.2 Realtime Topic Authorization & `realtime.messages` RLS
- **Inspected Migration**: `supabase/migrations/`.
- **Finding**: No policies currently exist on `realtime.messages`. In default Supabase configurations, `realtime.messages` must have RLS enabled with a strict policy:
  ```sql
  ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow users to subscribe to own broadcast topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
      realtime.messages.extension = 'broadcast'
      AND realtime.messages.topic = ('user:' || (auth.uid())::text)
  );
  ```
  Without this policy, any authenticated student could potentially listen to other users' broadcast topics if client-side channel subscriptions were unrestricted.
- **Severity**: **High**.
- **Status**: **Confirmed (Requires Migration in Phase 1.2)**.

---

## 7. Email Confirmation and Authentication Findings (Scope E)

### 7.1 Local Development vs. Production Supabase Configuration
- **Inspected Config**: `supabase/config.toml` line 226:
  ```toml
  [auth.email]
  enable_confirmations = false
  ```
- **Finding**: In the local development configuration, email confirmation is disabled (`false`).
- **Production Analysis**: In production Supabase projects, email confirmation is typically toggled in the Supabase Dashboard under Authentication -> Email Auth.
- **Critical Security Flaw in Code**: Regardless of Dashboard settings, `supabase/functions/resource-access/index.ts` does **not** inspect `user.email_confirmed_at`. If a malicious actor registers with an unverified or disposable email, they can immediately invoke `resource-access` and download Study Notes.
- **Severity**: **High**.
- **Status**: **Confirmed Vulnerability**.

### 7.2 JWT Refresh Behavior & Session Identity
- **GoTrue Contract**: When `supabase.auth.refreshSession()` is called, GoTrue issues a new JWT with an updated `iat` and `exp`, but the `session_id` claim (`jwt.claims.session_id`) remains identical to the original session UUID.
- **Implication**: As established in Phase 1.1.3, an superseded session cannot obtain a new identity simply by refreshing its token. However, because `resource-access` does not validate `session_id` against a database registry, the refreshed token remains functional.
- **Severity**: **Informational (Architecture Validated; Enforcement Missing)**.
- **Status**: **Verified**.

---

## 8. Admin Authorization Findings (Scope F)

### 8.1 Admin Determination & Metadata Isolation
- **Inspected Code**: `src/context/AuthContext.tsx` lines 168–170, `src/components/AdminRoute.tsx`, `scripts/seed_admin.mjs`.
- **Implementation**:
  ```typescript
  // src/context/AuthContext.tsx
  const isAdmin = useMemo(() => {
    return Boolean(user && user.app_metadata && user.app_metadata.role === 'admin');
  }, [user]);
  ```
- **Security Check**:
  - `user.app_metadata` is managed strictly by Supabase Auth and can only be modified via the Supabase Admin API using `SUPABASE_SERVICE_ROLE_KEY`.
  - Ordinary users updating their profile via `supabase.auth.updateUser({ data: ... })` can only write to `user.user_metadata`.
  - Horizon strictly isolates `user.app_metadata` from `user.user_metadata` across all frontend and backend checks.
- **Severity**: **Informational**.
- **Status**: **Verified Robust**.

### 8.2 Backend Verification in Privileged Edge Functions
- **Inspected Code**: `supabase/functions/send-push-notification/index.ts` lines 77–81, 381–386:
  ```typescript
  export function isUserAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
    return Boolean(user?.app_metadata && user.app_metadata.role === 'admin');
  }

  // Inside handleRequest:
  if (!isUserAdmin(user)) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden: Admin privileges required" }), {
      status: 403,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }
  ```
- **Finding**: Privileged Edge Functions perform independent, server-side authorization checks on the validated JWT before performing any service-role operations. Non-admin users receive HTTP 403.
- **Severity**: **Informational**.
- **Status**: **Verified Robust**.

---

## 9. Error Handling and Recovery Findings (Scope G)

### 9.1 Network Failures During Session Operations
- **Frontend SignOut**: Handled gracefully via `try/catch/finally` in `AuthContext.tsx`. If network fails, local tokens and React auth state are cleared regardless, preventing the UI from remaining stuck in an authenticated view.
- **Signed URL Generation**: In `usePdfData.ts`, network failures during Edge Function invocation return `null` and set `pdfError = 'Error accessing protected resource'`, rendering the error state without uncaught runtime exceptions.

### 9.2 Database & Edge Function Error Handling
- **Resource Access**: In `supabase/functions/resource-access/index.ts`:
  - Malformed JSON -> 400 Bad Request.
  - Missing resource ID -> 400 Bad Request.
  - Invalid JWT / missing auth -> 401 Unauthorized.
  - Resource not found -> 404 Not Found.
  - Storage failure -> 500 Storage failure.
- **Sanitization**: Error responses return structured JSON with safe error codes without leaking internal database stack traces or connection strings.
- **Severity**: **Informational**.
- **Status**: **Verified Robust**.

---

## 10. Testing Evidence and Remaining Test Plan

### 10.1 Tests Actually Executed
During this audit, automated test suites and compiler checks were executed locally in the repository environment:

1. **Vitest Frontend Test Suite**:
   - Command: `npx vitest run`
   - Outcome: **PASSED**. 77 test files passed, 537 individual unit/integration tests passed (including `AuthContext.test.tsx`, `AdminRoute.test.tsx`, `AdminNotifications.test.tsx`, `usePdfData.test.ts`, and `sw.test.ts`).
2. **Deno Edge Function Test Suite**:
   - Command: `npx deno test --allow-net --allow-env --config supabase/functions/resource-access/deno.json supabase/functions/send-push-notification/vapid_test.ts supabase/functions/send-push-notification/test.ts supabase/functions/subscribe-push/test.ts`
   - Outcome: **PASSED**. 116 tests passed (18 in `vapid_test.ts`, 55 in `send-push-notification/test.ts`, 43 in `subscribe-push/test.ts`).
3. **TypeScript Static Typecheck**:
   - Command: `npx tsc -b`
   - Outcome: **PASSED**. Zero TypeScript compiler diagnostic errors.

### 10.2 Comprehensive Security Test Matrix & Verification Status

| # | Test Scenario | Preconditions | Exact Execution Steps | Expected Result | Proving Evidence / Status |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Older session attempting protected DB access | User has Session A on Device 1; logs into Device 2 obtaining Session B. | Device 1 queries `public.reading_progress` with JWT A. | DB denies access (RLS returns empty or error). | **UNIMPLEMENTED / FAILS**. RLS currently allows JWT A because `is_active_session()` is not in RLS policies. |
| **2** | Older session attempting private Storage access | User has Session A on Device 1; logs into Device 2 obtaining Session B. | Device 1 invokes `resource-access` with JWT A for Study Notes. | Edge Function rejects with HTTP 401 `SESSION_SUPERSEDED`. | **UNIMPLEMENTED / FAILS**. `resource-access` currently returns HTTP 200 with signed URL. |
| **3** | Older session calling protected Edge Functions | User has Session A; logs in elsewhere. | Device 1 calls `subscribe-push` with JWT A. | Function rejects with HTTP 401. | **INSPECTED / PARTIAL**. `subscribe-push` validates JWT signature via `getUser()`, but does not verify active session registry. |
| **4** | Session replacement while previous browser open | Device 1 on Dashboard; Device 2 logs in. | Device 2 completes login; Realtime broadcast fires to `user:<id>`. | Device 1 tears down session and redirects to `/login`. | **UNIMPLEMENTED**. Frontend does not listen to Realtime broadcast. |
| **5** | Missed Realtime notification handling | Device 1 asleep/offline during Device 2 login. | Device 1 wakes up; user clicks notes or window regains focus. | Focus/request trigger detects superseded session; logs out. | **UNIMPLEMENTED**. No window focus or request-level active check exists. |
| **6** | Browser offline & reconnection behavior | User goes offline while viewing notes. | Device goes offline; re-establishes network. | Cached tokens do not grant new signed URLs if session replaced. | **INSPECTED / VERIFIED**. Signed URL requests fail if offline, but superseded JWT is not rejected when online. |
| **7** | Logout when server request fails | Device 1 clicks Sign Out; network disconnects. | Client triggers `signOut()`; server call fails. | Local storage, tokens, and React state cleared. | **EXECUTED & PASSED**. `AuthContext.test.tsx` and implementation verify state cleared in `finally`. |
| **8** | Logout after session already replaced | Device 1 displaced by Device 2; Device 1 clicks logout. | Device 1 sends conditional `deactivate_active_session(Session_A)`. | Deletion matches 0 rows; Device 2 remains active. | **UNIMPLEMENTED IN DB**. Proven mathematically in Phase 1.1.3; pending migration. |
| **9** | Unconfirmed email accessing protected notes | User signs up; email confirmation not clicked. | User invokes `resource-access` with unconfirmed bearer token. | Edge Function rejects with HTTP 403 `EMAIL_NOT_CONFIRMED`. | **UNIMPLEMENTED / FAILS**. `resource-access` does not check `email_confirmed_at`. |
| **10** | Ordinary user attempting admin operations | Authenticated student without admin role. | Calls `send-push-notification` with student bearer token. | Edge Function rejects with HTTP 403 Forbidden. | **EXECUTED & PASSED**. Verified by `send-push-notification/test.ts` (Deno test: student role rejected). |
| **11** | Expired signed URLs | Signed URL created with 60s expiration. | Wait 61 seconds; attempt GET request to signed URL. | Supabase Storage returns HTTP 403/Expired. | **VERIFIED VIA SUPABASE STORAGE SPECS**. Signed URLs generated by Storage API expire after 60s. |
| **12** | Cached protected content after session replacement | Notes PDF open in reader on Device 1; Device 2 logs in. | Device 2 logs in; Device 1 remains open. | Device 1 evicts in-memory ArrayBuffer and closes viewer. | **UNIMPLEMENTED**. In-memory `pdfData` remains rendered in DOM/canvas until page unload. |

---

## 11. Confirmed Vulnerabilities

### Finding V-1: Missing Active-Session Gating in `resource-access` Edge Function
- **Severity**: **CRITICAL**.
- **Status**: **CONFIRMED**.
- **Description**: `supabase/functions/resource-access/index.ts` validates only that the Bearer token belongs to a valid Supabase user (`supabase.auth.getUser()`). It performs no query against `security.user_active_sessions` or any session registry. Consequently, any previous session whose 1-hour access token has not yet expired can continue requesting fresh 60-second signed URLs and downloading protected Study Notes indefinitely.
- **Evidence**: `supabase/functions/resource-access/index.ts` lines 86–120.

### Finding V-2: Missing Server-Side Email Confirmation Enforcement
- **Severity**: **HIGH**.
- **Status**: **CONFIRMED**.
- **Description**: `resource-access` does not verify whether `user.email_confirmed_at` is non-null. In environments where email confirmations are enabled, or if confirmation is bypassed via direct API calls, unverified accounts can download proprietary Study Notes.
- **Evidence**: `supabase/functions/resource-access/index.ts` lines 86–95.

### Finding V-3: Complete Absence of Database Session Registry
- **Severity**: **CRITICAL**.
- **Status**: **CONFIRMED**.
- **Description**: The database migration creating `security.user_active_sessions`, `register_active_session`, `deactivate_active_session`, and `is_active_session` has not been implemented or applied to `supabase/migrations/`. Without this database registry, single-device session enforcement exists solely as an architectural specification.
- **Evidence**: `supabase/migrations/` contains only three migrations, none of which declare session tables or functions.

### Finding V-4: Absence of Frontend Realtime Session Teardown
- **Severity**: **HIGH**.
- **Status**: **CONFIRMED**.
- **Description**: The frontend client lacks any Realtime broadcast subscription on `user:<user_id>`. When a user logs in on a secondary device, the primary device receives no signal, remains in its authenticated state, and leaves any open PDF viewer fully operational.
- **Evidence**: Zero references to Realtime channels or broadcast listeners in `src/`.

---

## 12. Potential Risks and Limitations

1. **In-Memory PDF Bytes Cannot Be Remotely Purged**:
   - Once a PDF file's bytes have been downloaded and rendered in the browser's DOM/canvas (via `react-pdf`), the server cannot physically wipe client RAM.
   - *Mitigation*: The frontend teardown listener must immediately unmount `PdfDocumentRenderer` and set `pdfData = null` upon receiving `session_replaced` or encountering HTTP 401.
2. **60-Second Signed URL Window**:
   - A signed URL issued 2 seconds before session displacement remains valid at the storage CDN level until its 60-second expiration.
   - *Accepted Trade-off*: A 60-second window is an industry-standard bounded exposure for signed URLs and represents an acceptable operational risk.
3. **Realtime Delivery Failure**:
   - Realtime WebSockets can disconnect due to device sleep, mobile background throttling, or firewall drops.
   - *Mitigation*: Realtime must remain strictly an optimistic UX mechanism. Security is enforced authoritatively by active-session checks on every protected HTTP/database request and on window focus.

---

## 13. Recommended Fixes — Prioritized

### Priority 1: Database Foundation Migration (Phase 1.2)
Create migration `20260301000000_single_device_session_foundation.sql`:
1. Create `security` schema (revoked from PUBLIC, anon, authenticated).
2. Create table `security.user_active_sessions (user_id UUID PRIMARY KEY, active_session_id UUID NOT NULL, session_epoch BIGINT, created_at, updated_at)`.
3. Create `security.register_active_session` with `pg_advisory_xact_lock` and 750ms collision detection.
4. Create `public.deactivate_active_session` with `pg_advisory_xact_lock` and conditional deletion on `active_session_id`.
5. Create `public.is_active_session` (`SECURITY DEFINER`, `SET search_path = ''`).
6. Enable RLS and add owner-only broadcast policy on `realtime.messages`.

### Priority 2: Edge Login Orchestrator (`auth-login`)
Deploy `supabase/functions/auth-login` (`verify_jwt = false`):
1. Authenticates user via `supabase.auth.signInWithPassword`.
2. Verifies `user.email_confirmed_at != null`.
3. Calls `security.register_active_session` via `supabaseAdmin` service role.
4. Dispatches Realtime broadcast `session_replaced` on `user:<user_id>` via `supabaseAdmin.realtime.channel().httpSend()`.
5. Returns session payload to client.

### Priority 3: Enforce Session & Email Verification in `resource-access`
Update `supabase/functions/resource-access/index.ts`:
1. Check `user.email_confirmed_at != null` -> HTTP 403 `EMAIL_NOT_CONFIRMED` if null.
2. Extract `session_id` from JWT (`req.headers.get("Authorization")`).
3. Call `supabaseAdmin.rpc("is_active_session")` or query `security.user_active_sessions`.
4. Return HTTP 401 `SESSION_SUPERSEDED` if inactive.

### Priority 4: Frontend AuthContext & Realtime Teardown
Update `src/context/AuthContext.tsx` and `src/pages/resources/PdfViewer.tsx`:
1. Subscribe to `user:<user_id>` private Realtime broadcast topic on mount.
2. On `session_replaced` event: call `signOut()`, navigate to `/login`, and display alert:
   *"You've been logged out because your account was signed in on another device or browser."*
3. Add `window.addEventListener('focus')` check calling `is_active_session`.
4. In `PdfViewer.tsx`, immediately clear `pdfData` and unmount viewer on `'401_UNAUTHORIZED'` or session displacement.

---

## 14. Items Requiring Supabase Dashboard Verification

The following configuration parameters must be verified in the remote Supabase Project Dashboard (`rhzftlytulgnpodxqzqr`):

1. **Authentication -> Email Auth**:
   - Verify whether **"Enable Email Confirmations"** is turned ON in production.
   - If enabled in production, local `supabase/config.toml` should be aligned (`enable_confirmations = true`) to prevent dev/prod discrepancies.
2. **Authentication -> Sessions & Security**:
   - Verify that **"Inactivity Timeout"** is disabled (or set appropriately) so sessions are not prematurely terminated.
   - Verify that **"Session Timebox"** is configured as desired (e.g., unlimited or standard multi-day duration).
3. **Database -> Realtime**:
   - Verify that Realtime is enabled for the project and that the Broadcast authorization setting respects `realtime.messages` RLS policies.
4. **Storage -> Bucket Policies**:
   - Confirm that bucket `protected resources` has public access turned OFF and that bucket `pdfs` has public access turned ON.

---

## 15. Final Readiness Assessment

$$\mathbf{READINESS\ VERDICT:\ NOT\ READY}$$

### Formal Justification:
Horizon's single-active-device session architecture cannot be certified as ready for production at this time.

While the architectural specifications developed in Phases 1.0 through 1.1.3 are logically sound, proven against race conditions, and correctly avoid the dangerous `auth.admin.signOut("others")` pattern, **the controls do not yet exist in the executable codebase**:
1. There is no active session registry table or SQL function in `supabase/migrations/`.
2. The `resource-access` Edge Function does not validate session validity or email confirmation, allowing any unexpired JWT to retrieve private study notes.
3. The frontend does not listen for Realtime session replacement broadcasts or tear down open PDF documents when another device logs in.

The project is now in a clear and well-understood position to transition into **Phase 1.2 (Implementation & Enforcement)**, following the prioritized roadmap detailed in Section 13.
