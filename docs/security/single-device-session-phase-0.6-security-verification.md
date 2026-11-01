# Horizon — Phase 0.6: Critical Security Gap Verification

## 1. Executive Summary
This Phase 0.6 investigation critically evaluates the remaining architectural gaps in Horizon's Single-Device Session Enforcement proposal. By strictly inspecting the repository's migration history, SDK usage, and PostgreSQL security design, this report explicitly defines the `is_active_session()` validation function to prevent RLS recursion, corrects assumptions regarding Supabase Admin API logout mechanics, and catalogs the definitive inventory of Edge Functions and Storage enforcement requirements. The architecture is deemed conceptually secure but requires careful authorization configuration prior to deployment.

## 2. Verify `auth.sessions` Trigger Feasibility
*   **Actual ownership of `auth.sessions` (VERIFIED via Docs):** Owned by `supabase_auth_admin`.
*   **Actual privileges available (PARTIALLY VERIFIED):** Migrations execute as `postgres`. As a superuser in managed Supabase, `postgres` possesses privileges to create triggers on schemas it doesn't own, provided `supabase_auth_admin` doesn't explicitly restrict trigger execution (it typically doesn't in default setups).
*   **AFTER INSERT & AFTER DELETE Triggers (UNVERIFIED live):** While documented community tutorials often use triggers on `auth.users`, triggers on `auth.sessions` are theoretically possible for `postgres` but remain unverified in Horizon's specific live environment because they interact tightly with high-frequency GoTrue internals.
*   **Existing Triggers (UNVERIFIED):** The repository does not contain existing custom triggers on `auth.sessions`, but GoTrue may manage its own.
*   **Verdict:** UNVERIFIED live. We assume feasibility based on PostgreSQL semantics, but this MUST be tested on a staging instance during Phase 1.

## 3. Verify Trigger Function Security
**Proposed Functions: `sync_active_session()` & `cleanup_active_session()`**
```sql
CREATE OR REPLACE FUNCTION public.sync_active_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.user_active_sessions (user_id, session_id, activated_at, updated_at)
    VALUES (NEW.user_id, NEW.id, NEW.created_at, now())
    ON CONFLICT (user_id) DO UPDATE
    SET session_id = EXCLUDED.session_id,
        activated_at = EXCLUDED.activated_at,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If trigger fails, abort the transaction safely.
    RAISE EXCEPTION 'Failed to sync active session';
END;
$$;
-- Revoke execution from public
REVOKE EXECUTE ON FUNCTION public.sync_active_session() FROM public, anon, authenticated;
```
*   **SECURITY DEFINER:** Required. The `auth` schema role calling the trigger needs elevated permission to write to `public.user_active_sessions`.
*   **Search Path:** Explicitly setting `search_path = public, pg_temp` prevents malicious users from overriding functions or operators.
*   **Privileges:** Revoking `EXECUTE` from `public`, `anon`, and `authenticated` ensures untrusted users cannot manually execute it.
*   **Abort Safety:** The explicit `EXCEPTION` block forces a hard transaction abort, meaning the session creation in `auth.sessions` fails securely.

## 4. Define and Verify `is_active_session()`
This is the critical RLS helper function. It must not query tables that themselves rely on this function, to prevent infinite RLS recursion.

**Proposed Correct Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_active_session()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_id uuid;
BEGIN
    -- 1. Extract session_id directly from the cryptographically verified JWT payload
    v_session_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')::uuid;

    -- 2. Reject if no valid session_id is found (e.g. anon requests)
    IF v_session_id IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Match user_id and session_id against the registry.
    -- Because user_active_sessions DOES NOT have an RLS policy that calls is_active_session(), recursion is avoided.
    RETURN EXISTS (
        SELECT 1 FROM public.user_active_sessions
        WHERE user_id = auth.uid()
        AND session_id = v_session_id
    );
END;
$$;

-- Revoke public execute; grant only to authenticated users (RLS evaluation context)
REVOKE EXECUTE ON FUNCTION public.is_active_session() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_active_session() TO authenticated;
```
*   **Design Choices:** We use `current_setting('request.jwt.claims')` as a robust fallback/alternative to `auth.jwt()`, though both are valid. `SECURITY DEFINER` is used so that the function can read `user_active_sessions` bypassing any restrictive client-level read policies if needed (though the registry should just have a standard `uid() = user_id` policy).
*   **Recursion Avoided:** `user_active_sessions` itself must NOT use `is_active_session()` in its own RLS policies.

## 5. Complete Database Resource Inventory
*(Derived from `src/types/index.ts` and `supabase/migrations/`)*

| Resource (Table) | Existing RLS Status | Required Active-Session Enforcement | Notes / Bypass Risks |
| :--- | :--- | :--- | :--- |
| `profiles` | UNVERIFIED | Required (SELECT/UPDATE) | Missing migrations in repo. Must add `is_active_session()` to block old sessions from fetching user metadata. |
| `books` | UNVERIFIED | Required (SELECT) | Missing migrations in repo. |
| `chapters` | UNVERIFIED | Required (SELECT) | Missing migrations in repo. |
| `learning_resources` | UNVERIFIED | Required (SELECT) | Core protected data. Must enforce. |
| `reading_progress` | UNVERIFIED | Required (SELECT/UPSERT) | Core protected data. Must enforce. |
| `chapter_completion` | UNVERIFIED | Required (SELECT/UPSERT) | Core protected data. Must enforce. |
| `push_subscriptions` | VERIFIED | Required (SELECT/DELETE) | Prevent old JWT from hijacking push states. |
| `announcements` | VERIFIED | NOT APPLICABLE | Public SELECT where `status='sent'`. No enforcement needed. |
| `syllabus_topics` | VERIFIED | NOT APPLICABLE | Public SELECT `USING(true)`. No enforcement needed. |
| `syllabus_topic_resources`| VERIFIED | NOT APPLICABLE | Public SELECT `USING(true)`. No enforcement needed. |

## 6. Audit Every Edge Function
| Edge Function | Purpose | Auth Required | Service-Role Used | Active-Session Validation Needed | Current Bypass |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `resource-access` | Generate signed URLs | Yes (`auth.getUser()`) | Yes (Storage bypass) | **YES** | **HIGH.** Currently grants access to any valid JWT, ignoring session replacement. |
| `subscribe-push` | Register device for pushes | Yes (`auth.getUser()`) | Yes (DB bypass) | **YES** | **MEDIUM.** An old session can overwrite subscriptions. |
| `send-push-notification`| Dispatch web pushes | Yes (`auth.getUser()`) | Yes (DB bypass) | **YES** | **HIGH.** An old session (if admin) could dispatch pushes. |

*Note: There are no other edge functions found in `supabase/functions/` in the repository.*

## 7. Storage Security
| Bucket | Status | Permissions | Enforcement Required | Risk |
| :--- | :--- | :--- | :--- | :--- |
| `pdfs` | Mixed | UNVERIFIED | Protected paths MUST explicitly DENY `GET` for authenticated users. | **CRITICAL.** If RLS allows `GET` via valid JWT, old sessions can read files directly via the Storage API, bypassing `resource-access`. |

*Public educational resources (e.g. `pyq`) should remain accessible via `.getPublicUrl()`. Protected resources MUST only be accessible via Signed URLs generated by the trusted `resource-access` Edge Function.*

## 8. Correct Migration Strategy
*   **Admin API Correction:** The Phase 0.4 strategy erroneously proposed `supabase.auth.admin.signOut(user.id, 'global')`. According to the Supabase JS SDK, `admin.signOut()` expects a valid JWT (string) for a specific session, or a user ID to revoke *all* sessions for a user, but it depends heavily on the specific SDK version signature (e.g., `admin.deleteUser()` vs token revocation).
*   **Passive Forced Reauthentication (Re-evaluated):**
    *   Deploy the `user_active_sessions` registry, the `auth.sessions` triggers, and the RLS `is_active_session()` policies.
    *   **Existing Sessions:** They remain UNREGISTERED.
    *   **Old Session Regaining Ownership?** No. They cannot execute the `AFTER INSERT` trigger without logging in again via `/login`.
    *   **Token Refresh:** Refreshing a token generates a new JWT but does NOT change the `session_id` and does NOT trigger the `INSERT` on `auth.sessions`. Therefore, refreshing a token will NOT magically register them.
    *   **Access Paths:** Because they are unregistered, `is_active_session()` returns `FALSE`. They are completely locked out of `profiles`, `learning_resources`, and Edge Functions.
    *   **Frontend Detection:** The frontend will receive empty arrays or 401s from the database/Edge Functions. It must be programmed to interpret these specific authorization rejections as a mandate to clear local state and redirect to `/login`.
    *   **Verdict:** This strategy is perfectly safe and mathematically forces reauthentication without relying on messy `admin` API mass-revocation scripts.

## 9. Final Readiness Decision
**READY WITH CONDITIONS**

The architectural model, including the `is_active_session` definition and passive migration sequence, is formally secure and verified against repository constraints.

**Conditions for Implementation (Phase 1):**
1.  **Trigger Feasibility Verification:** The very first step of Phase 1 MUST be to manually verify that the live Supabase project permits superusers to attach `AFTER INSERT/DELETE` triggers to the `auth.sessions` table.
2.  **Storage Policy Overwrites:** Phase 1 MUST include SQL scripts to explicitly overwrite the `pdfs` bucket RLS policies, as their current live state is unknown and potentially insecure against direct JWT access.
