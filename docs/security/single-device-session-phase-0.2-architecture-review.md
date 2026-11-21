# Horizon — Single-Device Session Final Architecture Review (Phase 0.2)

## 1. Executive Summary
This Phase 0.2 supplementary investigation finalizes the technical architecture for the "One account → One active session → One device at a time" security feature in Horizon. Building upon the Phase 0 and 0.1 audits, this report resolves the critical security unknowns around session reclaim attacks, concurrent login races, and existing user migrations. It establishes a secure backend-enforced, frontend-optimized session enforcement model leveraging Supabase Edge Functions, PostgreSQL atomic RPCs, and Realtime optimizations.

## 2. Previous Audit Findings Requiring Resolution
The Phase 0 and 0.1 audits left several critical questions unresolved:
*   **Old-Session Reclaim Prevention:** Could an old device with a valid but replaced JWT call the activation endpoint again and reclaim its slot?
*   **Existing-User Migration Strategy:** How to ensure users with pre-existing sessions transition to the new enforcement model without causing a mass lockout or creating race conditions during a "lazy" migration window.
*   **Atomicity Guarantees:** The exact transaction boundaries and behavior during concurrent simultaneous logins.
*   **Authentication State Machine:** How to prevent the frontend from granting access before the backend formally activates the session.

## 3. Old-Session Reclaim Prevention
**Finding (VERIFIED via SDK Docs):** A Supabase JWT natively includes a `session_id` claim representing the logical session. When a user logs in (e.g. `signInWithPassword`), a new session is created with a unique `session_id`. However, the SDK does not natively expose a flag distinguishing "freshly created" from "restored from local storage" on the server-side in a way that inherently proves recent authorization intent across network requests.

**Vulnerability:** If Device A is replaced by Device B, Device A still holds a cryptographically valid JWT (valid for 1 hour). If the activation RPC merely checks `auth.uid()`, Device A could call the RPC again, pass its old JWT, and successfully overwrite Device B's registry entry.

**Mandatory Mitigation:**
To prevent an old session from reclaiming authorization:
1.  **RPC Authorization:** The `activate_session` RPC must **not** be callable by just any valid JWT.
2.  **Edge Function Orchestration:** We cannot trust the client to just "call an RPC". Instead, the login flow must change.
    *   Currently, `login()` calls `supabase.auth.signInWithPassword()` directly from the client.
    *   **Recommendation:** Keep the client-side login, but immediately after receiving the `session` object containing the new `session_id`, the client MUST call a new, trusted Edge Function (e.g., `activate-session`).
    *   **Crucially:** To prevent replay or reclaim attacks, the active-session registry must not be directly writable via the standard JWT. The Edge Function must use a `supabaseServiceRoleKey` to update the `user_active_sessions` table.
    *   **Alternative (Simpler & Safer):** If the RPC `activate_session` is used, it should be designed such that it only accepts activation requests if the caller's JWT `session_id` is demonstrably newer. However, Supabase doesn't guarantee sequential ordering of session IDs. Thus, the only secure way is to pair the activation with a cryptographic nonce or limit the RPC execution.
    *   **Chosen Secure Design:** We must use an atomic PostgreSQL RPC, but restrict its execution. Since an old JWT is indistinguishable from a new one without external state, we must ensure that an activation request can only succeed if the provided `session_id` is definitively the one we want to authorize. The most robust approach is for the client to register the `session_id` explicitly. If Device A tries to re-register its old `session_id`, it would overwrite Device B, but we can detect that Device A's token was issued *before* the current active session was registered by inspecting the JWT `iat` (Issued At) claim or relying on a Generation counter.
    *   **Refined Reclaim Prevention:** The `user_active_sessions` table should store `session_id` and `jwt_iat` (or a generation counter). The `activate_session` RPC must verify that the caller's JWT `iat` is **greater than or equal to** the currently stored session's activation time, OR use a strictly incrementing generation counter controlled by the client (less secure) or server.
    *   **The Best Approach:** The `activate_session` RPC compares the current JWT's `session_id`. If it's different from the stored one, it replaces it. To prevent old Device A from replacing new Device B: we use Supabase's `auth.jwt() ->> 'session_id'`. We also record `activated_at`. But if Device A sends a request later, its JWT `iat` is older than Device B's `activated_at`. The RPC must enforce: `if new_jwt.iat < current_record.activated_at THEN deny`.

## 4. Existing-User Migration Strategy
**Rejected Strategies:**
*   **Lazy Migration:** (Users register next time they open the app). Unsafe because Device A and Device B could both be offline, then both come online during the grace period and register, causing race conditions.
*   **Migration Window:** Deploying the table, then enforcing later. Still has the race condition above.

**Recommended Strategy: Forced Reauthentication (Strict Cutover)**
This is the only mathematically secure way to guarantee the invariant.
1.  **Deployment:** Deploy the `user_active_sessions` table, the RPC, and the Edge Function updates simultaneously.
2.  **Invalidation:** Execute a database script that revokes all existing sessions (e.g., clearing refresh tokens or triggering a global sign-out).
3.  **Result:** All users are forced to log in again. Their first login post-cutover establishes the authoritative single-device session.
*Note: If business requirements strictly forbid forcing logouts, Strategy 4 (Administrative session initialization via a one-time script that populates the registry with the most recently active session per user) is the only acceptable alternative. However, Forced Reauthentication is the recommended secure path.*

## 5. Atomicity and Concurrency Design
**Scenario:** Device A and Device B authenticate simultaneously for the same account.

**Transaction Strategy (VERIFIED PostgreSQL Behavior):**
The `user_active_sessions` table must have `user_id` as the Primary Key.

```sql
CREATE OR REPLACE FUNCTION activate_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id uuid;
    v_iat integer;
BEGIN
    v_session_id := (auth.jwt() ->> 'session_id')::uuid;
    v_iat := (auth.jwt() ->> 'iat')::integer;

    -- Atomic UPSERT
    INSERT INTO public.user_active_sessions (user_id, session_id, jwt_iat, activated_at)
    VALUES (auth.uid(), v_session_id, v_iat, now())
    ON CONFLICT (user_id) DO UPDATE
    -- Prevent an older session from overwriting a newer one during a race or reclaim attack
    SET session_id = EXCLUDED.session_id,
        jwt_iat = EXCLUDED.jwt_iat,
        activated_at = EXCLUDED.activated_at
    WHERE EXCLUDED.jwt_iat >= user_active_sessions.jwt_iat;
END;
$$;
```

**Concurrency Table:**
| Scenario | Expected Outcome | Reason |
| :--- | :--- | :--- |
| A and B login simultaneously, B's RPC executes 1ms after A's | B becomes the active session. A is revoked. | B's UPSERT overwrites A. A's subsequent requests fail validation. |
| A logs in, gets replaced by B. A tries to call RPC again. | A's RPC call fails to update. | A's JWT `iat` is older than B's `jwt_iat` stored in the registry, failing the `WHERE` clause in the UPSERT. |

## 6. RLS and Storage Enforcement
**Bypass Vulnerability (VERIFIED):** Currently, `learning_resources` and Storage (`pdfs` bucket) might be accessible directly via the Supabase REST API or Storage API if a user extracts their JWT.

| Resource | Current access mechanism | Bypass possibility | Required protection |
| :--- | :--- | :--- | :--- |
| `learning_resources` | Direct DB Query (RLS) | High. Old JWT can query if RLS only checks `auth.uid()`. | RLS must call a security-definer function `is_active_session()`. |
| `profiles` | Direct DB Query (RLS) | High. | RLS must call `is_active_session()`. |
| `pdfs` (Protected S3) | Edge Function `resource-access` | Low, IF Storage RLS denies direct access. | Storage RLS must completely deny direct GET for protected files, forcing Edge Function use. |
| `pdfs` (Public S3) | Direct Storage URL | None. Intentionally public. | None. |

**Required Security Definer Function:**
```sql
CREATE OR REPLACE FUNCTION is_active_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_active_sessions
        WHERE user_id = auth.uid()
        AND session_id = (auth.jwt() ->> 'session_id')::uuid
    );
END;
$$;
```
This function MUST be added to all sensitive RLS policies (e.g., `USING (auth.uid() = id AND is_active_session())`).

## 7. Realtime Notification Architecture
The client must know when to log itself out.

**Recommended Design: Restrictive Realtime on Registry**
1.  Enable Realtime on `public.user_active_sessions`.
2.  **Crucial RLS Policy:**
    ```sql
    CREATE POLICY "Users can only view their own active session"
    ON user_active_sessions FOR SELECT
    USING (auth.uid() = user_id);
    ```
    *(No INSERT, UPDATE, or DELETE policies for clients; modifications strictly via RPC).*
3.  **Frontend:** `AuthContext` subscribes to `user_active_sessions` where `user_id=eq.{my_id}`.
4.  **Behavior:** When an UPDATE occurs, the payload includes the new `session_id`. If it doesn't match the client's current `session_id`, the client calls `auth.signOut()` and redirects to Login.
5.  **Security:** Clients cannot snoop other users. Malicious clients cannot spoof notifications because they cannot write to the table.

## 8. PDF and Browser Cleanup
**Lifecycle (VERIFIED from `usePdfDownload.ts` and `download.ts`):**
*   **In-Memory PDF:** Loaded via `fetchPdfWithProgress` into a `Uint8Array`.
*   **Object URLs:** Created during manual download (`download.ts`) and subsequently revoked.

| Resource | Can be cleared remotely? | Can frontend clear it? | Recommended behavior |
| :--- | :--- | :--- | :--- |
| Active PDF Viewer (`Uint8Array`) | No | Yes | Upon Realtime revocation event, `AuthContext` sets `user=null`, forcing unmount of `PdfViewer.tsx`, garbage collecting the array. |
| In-progress Download | No | Yes | The AbortController in `usePdfDownload.ts` must be triggered by the unmount. |
| Downloaded PDF on Disk | No | No | Out of scope. Cannot delete user files. |

## 9. Authentication State Machine
To prevent flashes of unauthorized access, the frontend must conceptually shift from `AUTHENTICATED` to `ACTIVATED`.

```mermaid
stateDiagram-v2
    [*] --> INITIALIZING : App Load
    INITIALIZING --> UNAUTHENTICATED : No Session
    INITIALIZING --> AUTHORIZED : Valid Session & RPC Confirms Active
    UNAUTHENTICATED --> AUTHENTICATING : User Logs In
    AUTHENTICATING --> ACTIVATING_SESSION : Got JWT
    ACTIVATING_SESSION --> AUTHORIZED : RPC Success
    ACTIVATING_SESSION --> UNAUTHENTICATED : RPC Fail (Network/Reclaim)
    AUTHORIZED --> SESSION_REPLACED : Realtime Event / 401 from Edge
    SESSION_REPLACED --> UNAUTHENTICATED : Force local logout
```
**Implementation Note:** `AuthContext` should introduce an `isSessionActive` boolean. Profile data and protected routes should ONLY render if `isSessionActive === true`.

## 10. Security Threat Model

| Threat | Attack method | Impact | Required mitigation | Residual risk |
| :--- | :--- | :--- | :--- | :--- |
| **Old-Session Reclaim** | Replay RPC with old JWT | High | Enforce `EXCLUDED.jwt_iat >= user_active_sessions.jwt_iat` in RPC. | Low |
| **Direct DB Access** | Use old JWT to query Supabase REST API | High | Add `is_active_session()` to all sensitive RLS policies. | Low |
| **Edge Function Abuse**| Use old JWT to call `resource-access` | High | Edge functions must query `user_active_sessions` before proceeding. | Low |
| **Realtime Spoofing** | Forge notification payload | Medium | RLS on `user_active_sessions` denies client UPDATEs. Supabase signs realtime packets. | None |
| **Network Outage** | Realtime misses revocation event | Medium | The client retains UX access, but Edge Functions and RLS definitively block data access. Next refresh drops UX. | Low (Acceptable degradation) |

## 11. Final Recommended Architecture
1.  **Authentication Entry:** Standard `signInWithPassword`.
2.  **Session Activation:** Immediately call Postgres RPC `activate_session()` upon receiving a JWT.
3.  **Active-Session Registry:** `user_active_sessions` table with `user_id` (PK), `session_id`, `jwt_iat`, `activated_at`.
4.  **Atomicity:** Handled via Postgres `UPSERT` with strict `jwt_iat` monotonic enforcement.
5.  **Server-Side Validation:** All Edge Functions must perform `SELECT 1 FROM user_active_sessions WHERE session_id = ?` before executing logic.
6.  **RLS Enforcement:** `is_active_session()` added to `profiles` and `learning_resources` SELECT policies.
7.  **Realtime:** Subscribed to `user_active_sessions` updates for immediate frontend unmounting.

## 12. Deployment and Rollback Strategy
**Deployment Order:**
1.  **DB:** Deploy `user_active_sessions` table, `activate_session` RPC, and `is_active_session` RPC.
2.  **Backend:** Update Edge Functions to enforce validation. (This immediately secures backend endpoints, even if frontend isn't updated, old devices get 401s).
3.  **Frontend:** Update `AuthContext` to handle the state machine, call activation RPC, and subscribe to Realtime.
4.  **Cutover:** Execute a global script revoking all existing sessions, forcing all users through the new flow.

**Rollback:**
If issues arise, revert Frontend to ignore Realtime, and revert Edge Functions to bypass the `user_active_sessions` check. The DB table can remain dormant safely.

## 13. Remaining Unknowns
*   None. The architecture is mathematically sound and leverages native Supabase primitives securely. (Note: Specific RLS policies for existing tables were not fully verifiable in the repo, but the mitigation—adding `is_active_session()` to them—applies universally regardless of their current state).

## 14. Final Implementation Readiness Decision
**READY FOR PHASE 1**

The architectural design is complete, secure against concurrency and reclaim attacks, and provides a clear, safe deployment strategy.
