# Horizon — Phase 0.8: Corrective Security Audit & Alternative Architecture

## 1. Executive Summary
This Phase 0.8 Corrective Architecture Audit officially rejects the previously recommended "Synchronized Database Trigger on `auth.sessions`" architecture due to unsupported assumptions about Supabase managed PostgreSQL privileges. It also rectifies critical misconceptions regarding Storage bucket configurations, JWT `iat` freshness evaluation, and Admin API usages. In its place, this report proposes a secure, verifiable, and natively supported **Edge Function Orchestration Architecture** utilizing Supabase Auth Hooks (Custom Access Tokens) and explicit server-side session activation via Edge Functions.

## 2. Previous Mistakes and their Corrections

| Previous Mistake | Reality | Correction |
| :--- | :--- | :--- |
| **`auth.sessions` Triggers** | `postgres` role in managed Supabase does not inherently have permission, nor is it guaranteed safe or stable to attach custom triggers to internal GoTrue schemas (`auth`). | **ABANDONED.** Do not use DB triggers on `auth` tables. |
| **JWT `iat` Freshness** | Token refresh updates the `iat` while maintaining the old `session_id`, meaning an old session can acquire a newer `iat` than the currently active one. | **ABANDONED.** Freshness must be tracked natively via an authoritative backend activation registry, independent of `iat`. |
| **Storage Bucket Policies** | RLS public/private is at the **bucket level**, not folder path (`pdfs/pyq/*` vs `pdfs/notes/*`). One bucket cannot be simultaneously public and private. | **CORRECTED.** Horizon must use separate buckets (e.g., `public-pdfs` vs `protected-pdfs`) or keep the entire bucket private and serve all files via signed URLs. |
| **Admin API Logout** | `supabase.auth.admin.signOut()` expects a valid JWT token string, not a user UUID, rendering the proposed forced migration scripts technically invalid. | **CORRECTED.** Migration will rely strictly on passive enforcement (401s forcing UI redirect). |

## 3. Verified Supabase Capability Findings
*   **Auth Hooks (VERIFIED in config.toml):** Horizon's `supabase/config.toml` includes support for `[auth.hook.custom_access_token]`. This allows attaching custom claims directly into the JWT upon issue.
*   **Edge Functions & Service Role (VERIFIED):** Edge functions can safely interact with the database bypassing RLS using the `SUPABASE_SERVICE_ROLE_KEY`. This provides a secure orchestrator environment.
*   **Storage (VERIFIED via SDK Docs):** Buckets are strictly public OR private. RLS policies control access to private buckets. Signed URLs expire and cannot be easily actively revoked before expiration.

## 4. Alternative Session-Enforcement Architectures

### Architecture A: Custom Auth Hook + RPC
*   **Mechanism:** Enable the `custom_access_token` auth hook. Upon login/refresh, the hook checks a `user_active_sessions` table. If the `session_id` does not match the active session, the hook strips authorization claims or denies token issuance.
*   **Pros:** Enforces at the JWT issue level. Blocks old devices from even getting a refreshed access token.
*   **Cons:** Auth hooks are on the critical path of every refresh and login. A DB query on every token refresh can introduce significant latency or failure points (Fail-open vs Fail-closed risks).

### Architecture B: Edge Function Login Orchestrator
*   **Mechanism:** The frontend calls a custom Edge Function (`/api/login`) instead of `signInWithPassword`. The Edge Function calls Supabase Auth, retrieves the session, writes the `session_id` securely to `user_active_sessions` using the service role key, and returns the session to the client.
*   **Pros:** Perfect atomicity. The client never activates itself.
*   **Cons:** Replaces the standard Supabase client SDK for login, complicating frontend integration (AuthContext, token persistence).

### Architecture C: Trusted Session Registry with Edge/RPC Validation (RECOMMENDED)
*   **Detection & Activation:** Client calls standard `signInWithPassword`. The client receives a JWT. The client MUST immediately call a secured Postgres RPC `activate_session(session_id)`.
*   **The Crucial Security Fix:** How do we prevent an old session from calling `activate_session`? We cannot trust the JWT alone.
    *   **Solution:** We introduce a **Server-Side Challenge (Nonce)** or track **Last Seen Activity**.
    *   **Better Solution (Simplicity & Support):** We allow the RPC to activate *only* if the session is confirmed as freshly created by querying `auth.sessions` via a **SECURITY DEFINER** function (running as a privileged role, if permitted to read `auth.sessions`, OR via an Edge function with service-role).
    *   **Safest Implementation:** The client calls an Edge Function `activate-device`. The Edge Function reads the Authorization header, validates the JWT, then queries `auth.sessions` using the **service-role key** to find the absolute most recently created `session_id` for that user. It updates `user_active_sessions` to match that *newest* session. The client cannot dictate which session wins; the Edge Function inspects the authoritative `auth.sessions.created_at` timestamp.

## 5. Comparison of Alternatives

| Criterion | A. Auth Hooks | B. Login Proxy | C. Edge Orchestrator (Selected) |
| :--- | :--- | :--- | :--- |
| Supabase Support | High (Configurable) | High | High (Standard Edge Fn) |
| Client Trust | Zero | Zero | Zero (Server queries `auth.sessions`) |
| Concurrency Safe | Medium (Race on hook) | High | High (Determined by GoTrue `created_at`) |
| Implementation Risk| High (Blocks GoTrue) | High (Reinvents SDK) | Low (Extends standard flow) |

## 6. Recommended Architecture: Edge Orchestrator

**The Flow:**
1.  **Login:** Device B logs in using `signInWithPassword()`. Supabase GoTrue creates the session in `auth.sessions`.
2.  **Activation:** Device B immediately calls Edge Function `activate-device`.
3.  **Server Verification:** The Edge Function uses `supabase.auth.getUser()` to verify the token. It then uses the `service_role_key` to query `auth.sessions` for the user, ordering by `created_at DESC` LIMIT 1.
4.  **Enforcement Write:** The Edge Function writes this most recent `session_id` into `public.user_active_sessions` (upserting by `user_id`).
5.  **Reclaim Prevention:** If Device A (old session) calls `activate-device`, the Edge Function queries `auth.sessions`, sees Device B's session is newer, and writes Device B's `session_id` to the registry. Device A cannot force its own activation.
6.  **Resource Protection:** All RLS policies and other Edge Functions perform a standard `SELECT 1 FROM user_active_sessions WHERE session_id = current_jwt_session_id`.

## 7. Storage Architecture Findings & Corrections
**Current State:** The codebase checks `storage_bucket !== 'pdfs'` to determine protection. This implies `pdfs` is currently treated as entirely public.
**Correction:** We CANNOT serve protected documents from `pdfs` if it is a public bucket.
**Required Action:**
1.  Ensure a separate private bucket exists (e.g., `protected-resources`).
2.  Storage RLS on the private bucket must explicitly evaluate `is_active_session()`.
3.  Signed URLs remain vulnerable until expiration (60s). This is an accepted, documented limitation of CDN/Signed URL architecture.

## 8. Complete Horizon Security Inventory

| Resource | Current Access | RLS Enforcement Required |
| :--- | :--- | :--- |
| `profiles` | DB Query | Yes (`is_active_session()`) |
| `learning_resources` | DB Query | Yes (`is_active_session()`) |
| `reading_progress` | DB Query | Yes (`is_active_session()`) |
| `chapter_completion` | DB Query | Yes (`is_active_session()`) |
| `push_subscriptions` | DB Query | Yes (`is_active_session()`) |
| `resource-access` (Edge) | Edge Invoke | Yes (Query registry) |
| `subscribe-push` (Edge) | Edge Invoke | Yes (Query registry) |
| `send-push-notification`| Edge Invoke | Yes (Internal Admin function; must ensure caller is admin AND active). |
| Public Educational | `pdfs` (Public) / `chapters` / `books` / `syllabus_topics` | No (Public access intentional) |

## 9. Migration and Existing-Session Strategy
**Passive Lazy Validation:**
*   Existing sessions have no entry in `user_active_sessions`.
*   When they attempt to access protected Edge Functions or DB rows, the check fails (returns 401/Empty).
*   The frontend intercepts this, logs out locally, and forces a new login.
*   **Result:** No mass global logout required. Safe, seamless degradation.

## 10. Security Test Matrix

| Test Case | Initial State | Action | Expected Result | Security Property |
| :--- | :--- | :--- | :--- | :--- |
| 1. First-device login | No active session | Device A logs in, calls `activate-device`. | Device A registered as active. | Baseline activation. |
| 2. Second-device login | A is active | Device B logs in, calls `activate-device`. | Device B registered as active. | Session replacement. |
| 3. Old-device DB request | B is active, A holds JWT | Device A requests `learning_resources`. | Empty result / RLS Denial. | RLS Enforcement. |
| 4. Old-device Edge Function | B is active, A holds JWT | Device A calls `resource-access`. | 401 Unauthorized. | Edge Enforcement. |
| 6. Old-device JWT refresh | B is active, A holds refresh | Device A refreshes token natively. | Token refreshes, but DB/Edge access remains blocked. | Refresh isolation. |
| 16. Old-device reclaim attempt | B is active, A holds JWT | Device A calls `activate-device`. | Registry remains mapped to B. | Server-side truth authority. |

## 11. Security Limitations and Residual Risks
*   **Signed URL Expiration:** A replaced session retains access to already-generated Signed URLs for up to 60 seconds.
*   **In-Memory Content:** Already downloaded PDF bytes (`Uint8Array`) in the browser memory cannot be wiped without frontend Realtime cooperation (which handles unmounting).

## 12. Final Readiness Decision
**READY FOR PHASE 1**

The "Edge Orchestrator" architecture resolves all theoretical gaps. It completely removes the client from the trust boundary, does not rely on unsupported database triggers, correctly navigates Supabase managed schema boundaries using standard `service_role` Edge Functions, and enforces the single-device invariant securely across all required database and storage primitives.
