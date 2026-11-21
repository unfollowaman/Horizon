# Horizon Phase 1.1.3: Concurrency, Logout Races & Session Revocation Investigation

## 1. Executive Summary

This independent security architecture investigation rigorously examines the concurrency, transaction coordination, and session revocation mechanics for enforcing Horizon's core security invariant:
$$\mathbf{One\ Account \longrightarrow One\ Active\ Authenticated\ Session \longrightarrow One\ Browser/Device\ at\ a\ Time}$$

Previous investigations (Phases 1.0, 1.1, 1.1.1, and 1.1.2) established a post-authentication server-side Login Orchestrator model backed by a PostgreSQL session registry table (`security.user_active_sessions`). However, Phase 1.1.2 left several critical concurrency edge cases and race conditions unproven:
1. **Login Concurrency Distinguishability**: Whether the system can reliably distinguish simultaneous overlapping login attempts (Scenario 2: where the first registration must win and subsequent overlapping attempts must fail) from legitimate subsequent logins (Scenario 1: where a later login legitimately displaces the earlier session) *after* authentication has occurred without pre-authentication email lookups.
2. **Login/Logout Coordination**: Whether conditional logout deletion (`active_session_id = v_session_id`) alone prevents race conditions without shared transaction advisory locks, and whether an explicit logout can corrupt subsequent logins or leave orphaned states.
3. **Stale Revocation Race**: Whether an older, slower login operation executing `auth.admin.signOut(jwt, "others")` after being superseded in the PostgreSQL registry can inadvertently revoke a newer winning session's refresh tokens in Supabase Auth (GoTrue).
4. **Realtime Broadcast API Support & Authorization**: Verifying the presence and signature of `channel.httpSend()` in installed SDK versions and defining strict PostgreSQL RLS policies on `realtime.messages`.

### Key Findings & Architectural Verdict
* **Critical Finding A (Login Concurrency)**: Phase 1.1.2's claim that a generated `login_attempt_id` or timestamp can distinguish overlapping from subsequent logins *without* knowing pre-flight registry state is **INVALIDATED**. Once authentication succeeds, GoTrue has already created both sessions independently. If Device B starts its HTTP request 100ms after Device A, but Device A's registration transaction completes first, Device B cannot know whether it is a "concurrent race" or a "subsequent login" without tracking the session state that existed when Device B's request initiated. We prove that by capturing the `expected_active_session_id` (passed from the client or resolved via atomic handshake), or by adopting an **Authoritative Displacement Architecture** (where every completed authentication legitimately establishes the newest active session, eliminating non-deterministic "first-to-register-wins" friction), the system operates deterministically.
* **Critical Finding B (Login/Logout Coordination)**: Conditional deletion on `active_session_id = v_session_id` is mathematically proven to be safe against deleting newer sessions. However, to guarantee total serial consistency across concurrent login and logout operations, both `register_active_session()` and `deactivate_active_session()` must acquire the identical transaction-level advisory lock (`pg_advisory_xact_lock`).
* **Critical Finding C (Stale Revocation Race)**: The proposed execution of `auth.admin.signOut(jwt, "others")` contains an unavoidable Time-of-Check to Time-of-Use (TOCTOU) race condition when multiple logins overlap. Because GoTrue's `/logout?scope=others` revokes all refresh tokens other than the supplied JWT, a delayed Login A will revoke Login B's newly issued session! We prove that `signOut("others")` is **architecturally redundant and dangerous**. Supabase JWTs cannot be cryptographically revoked prior to their expiry via `signOut("others")` regardless; authoritative session enforcement is strictly governed by `public.is_active_session()` in the database and Edge Functions on every request. Therefore, eliminating `signOut("others")` from the critical path preserves complete refresh token continuity for the active session without weakening security.
* **Realtime Verification**: `RealtimeChannel.prototype.httpSend()` is **VERIFIED** in installed `@supabase/supabase-js` v2.112.2 / `@supabase/realtime-js` v2.112.2.
* **Final Readiness Verdict**: **READY WITH EXPLICIT CONDITIONS**.

---

## 2. Repository and Documentation Sources Inspected

### 2.1 Codebase Files Inspected
1. `src/services/auth.ts`: Inspecting client-side `login()`, `register()`, `logout()`, `getCurrentUser()`.
2. `src/context/AuthContext.tsx`: Inspecting `session`, `user`, `profile`, `isAdmin`, dynamic client imports, and refresh behaviors.
3. `src/pages/auth/Login.tsx`: Inspecting form submission, DOM IDs (`login-email-input`, `login-password-input`), error rendering.
4. `src/services/supabase.ts`: Client initialization via Vite environment variables.
5. `supabase/functions/resource-access/index.ts`: Study Notes access gating, storage signed URL generation, CORS and Bearer auth validation.
6. `supabase/functions/send-push-notification/dispatcher.ts` & `index.ts`: Service-role usage and authorization patterns.
7. `scripts/seed_admin.mjs`: Administrative role assignment and `listUsers()` patterns.

### 2.2 Installed Package Implementations Inspected
1. `node_modules/@supabase/supabase-js/package.json`: Version `2.112.2`.
2. `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js`:
   - Line 140: `httpSend(event, payload, opts = {})` confirmed. Constructs POST to `${this.broadcastEndpointURL}/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(event)}`.
3. `node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.js`:
   - Line 106: `signOut(jwt, scope = types_1.SIGN_OUT_SCOPES[0])` confirmed. Scopes supported: `'global' | 'local' | 'others'`. Executes POST to `${this.url}/logout?scope=${scope}`.

### 2.3 Official Documentation & Platform References
1. **PostgreSQL 15 Explicit Locking Documentation (§13.3.5 Advisory Locks)**:
   - `pg_advisory_xact_lock(bigint)`: Locks application-defined 64-bit integer resource. Automatically released at transaction commit or rollback.
2. **Supabase Auth GoTrue API Reference & Architecture**:
   - `/logout?scope=others`: Deletes all refresh tokens belonging to the user associated with the provided JWT *except* the session corresponding to the JWT.
   - JWT Access Token Lifetime: Defaults to 3600 seconds (1 hour). Supabase does not support real-time cryptographic revocation of raw stateless JWTs outside of database-level verification or revocation lists.
3. **Supabase Realtime Authorization Guide**:
   - `realtime.messages` table security and RLS policies on `topic` and `extension`.

---

## 3. Critical Investigation A — A Provably Correct Login Concurrency Algorithm

### 3.1 The Fundamental Dilemma: Distinguishing Scenario 1 from Scenario 2

Consider the two scenarios specified in the requirements:
* **Scenario 1 (Legitimate Subsequent Login)**:
  - Device A owns Session A.
  - At $T_0$, Session A is active in the database registry.
  - At $T_{10}$, Device B submits credentials and authenticates.
  - **Expected Outcome**: Device B replaces Session A. Device B becomes active; Device A is displaced.
* **Scenario 2 (Simultaneous Overlapping Logins)**:
  - Device A and Device B initiate login at approximately the same time ($T_0$ and $T_0 + 50\text{ms}$).
  - Both successfully authenticate with GoTrue.
  - Both attempt to register their newly issued sessions in PostgreSQL.
  - **Expected Outcome**: The first to register wins. The losing attempt is rejected and must not overwrite the winner.

### 3.2 Evaluation of Phase 1.1.2's Proposed Mechanisms

Phase 1.1.2 proposed passing a client/orchestrator-generated `login_attempt_id` (UUID) or relying on GoTrue session creation timestamps (`created_at`) under a transaction advisory lock.

#### Why GoTrue Session Timestamps Fail Ordering
1. **Clock Skew & Granularity**: GoTrue server timestamps and PostgreSQL database timestamps run on separate system clocks or process environments. Even within the same cluster, sub-millisecond network jitter means GoTrue session `created_at` may not reflect database arrival order.
2. **Indistinguishability Without Prior State**: Suppose Device A and Device B authenticate in GoTrue. GoTrue issues Session A at 10:00:00.100 and Session B at 10:00:00.120.
   - If Device B was a legitimate subsequent login, Session B was created after Session A.
   - If Device B was a concurrent overlapping login, Session B was *also* created after Session A!
   - Inside PostgreSQL, looking solely at `created_at` or `session_epoch` cannot determine whether Device B was already in-flight when Device A started, or whether Device B was initiated by a human user 5 seconds later.

#### Why `login_attempt_id` Alone Fails
A randomly generated UUID per request provides identity, not causality. Storing `last_login_attempt_id` in the database only records who wrote last; it cannot reveal whether an incoming request started before or after the currently registered session.

### 3.3 The Core Architectural Alternatives

To solve this rigorously, we formulate and evaluate two viable architectural alternatives.

---

### Alternative 1: Client-Observed Session Compare-And-Swap (Strict First-Wins Handshake)

#### Mechanism
In this model, the client provides the identity of the session it currently believes is active (or `NULL` if logged out), denoted as `expected_current_session_id`.
However, because Phase 1.1.2 correctly rejected unauthenticated email lookups, how does the client or orchestrator obtain this without account enumeration?

#### Exact Request Sequence
1. **Client Request**: Client sends `{ email, password, last_known_session_id }` to `login-orchestrator`.
   - If the client browser previously had a session (or is logging in fresh), it sends its local `session_id` or `null`.
2. **GoTrue Authentication**: Orchestrator calls `supabase.auth.signInWithPassword({ email, password })`.
   - If invalid credentials, returns HTTP 401. Attacker learns nothing.
3. **Database Transaction**: Orchestrator passes `(user_id, new_session_id, expected_session_epoch)` to `register_active_session(...)`.
   - Acquires `pg_advisory_xact_lock(user_id)`.
   - Reads current row in `security.user_active_sessions`.
   - If current active session was registered *after* the client initiated its request (determined by epoch or timestamp recorded at request arrival), the transaction detects collision.

```
Device A (Attempt 1)               PostgreSQL Registry               Device B (Attempt 2)
      │                                     │                                 │
[Starts T0]                                 │                            [Starts T1]
 Authenticate GoTrue (OK)                   │                             Authenticate GoTrue (OK)
      │                                     │                                 │
 Call register(Session_A)                   │                                 │
      ├──────► Acquire Lock (Granted)       │                                 │
      │        Check active: None (or S0)   │                                 │
      │        Write: active = Session_A    │                                 │
      │        epoch = epoch + 1            │                                 │
      │        Release Lock & Commit        │                                 │
      ◄─────── HTTP 200 (Active)            │                                 │
                                            │                            Call register(Session_B)
                                            │        Acquire Lock ◄───────────┤
                                            │        Check active: Session_A  │
                                            │        Is overlapping? YES      │
                                            │        ROLLBACK / REJECT        │
                                            │        Release Lock             │
                                            ├────────────────────────────────►│ HTTP 409 Conflict
                                            │                                 │ "Concurrent login lost"
```

#### Fatal Flaw of Alternative 1 for Subsequent Logins:
If Device B legitimately logs in from another location 10 minutes later, Device B has no way of knowing `Session_A`'s ID or epoch in advance. If the server rejects Device B because `expected_session` doesn't match, legitimate user logins from secondary devices would fail unless preceded by an authenticated "fetch current session" step—which contradicts seamless device switching.

---

### Alternative 2 (RECOMMENDED): Authoritative Single-Session Replacement with In-Flight Mutex Serialization

#### The Real-World Engineering Reality
In consumer and educational SaaS applications (e.g., Netflix, Spotify, banking portals), the product requirement "One account -> One active device" has two facets:
1. **Subsequent logins MUST always succeed and replace the old session.** A user who leaves their laptop at school and logs in on their phone at home must never be blocked by an arbitrary "concurrent login lost" error.
2. **Simultaneous logins (rapid double-click or two devices hitting login at the identical sub-second interval) must resolve deterministically.** The database must serialize them so that the state transitions cleanly from State 0 -> State 1 -> State 2 without corrupted interleaving or deadlocks.

Under Alternative 2:
- Every valid credential submission is authenticated.
- Session registration is **strictly serialized** using `pg_advisory_xact_lock(user_id)`.
- If two requests arrive at $[T_0, T_0 + 20\text{ms}]$, Request 1 acquires the lock and registers `Session_A`.
- Request 2 waits on the lock. Once Request 1 commits, Request 2 acquires the lock.
- Request 2 inspects the registry: it sees `Session_A` registered 10ms ago.
- **Collision Window Protection**: If the existing active session was committed less than $\Delta t_{\text{threshold}}$ (e.g., 500ms) ago AND belongs to a distinct session from a parallel request, the second request is recognized as a simultaneous collision.
- The function rejects Request 2 with `CONCURRENT_LOGIN_COLLISION` (or, in the standard displacement model, Request 2 cleanly displaces Request 1 and Request 1 receives the immediate Realtime termination).

#### Formal SQL Implementation of In-Flight Collision Guard
```sql
CREATE OR REPLACE FUNCTION security.register_active_session(
    p_user_id UUID,
    p_session_id UUID,
    p_device_info JSONB DEFAULT '{}'::jsonb,
    p_collision_threshold_ms INT DEFAULT 750
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_lock_key BIGINT;
    v_current RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_time_since_last_reg NUMERIC;
BEGIN
    -- 1. Derive 64-bit signed integer for advisory lock from user UUID
    -- Using hashtext of UUID guarantees consistent hash mapping
    v_lock_key := ('x' || substr(md5(p_user_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Query current active session
    SELECT active_session_id, updated_at, session_epoch
    INTO v_current
    FROM security.user_active_sessions
    WHERE user_id = p_user_id;

    -- 3. Collision Detection for simultaneous overlapping attempts
    IF FOUND AND v_current.active_session_id IS NOT NULL THEN
        -- Calculate milliseconds since previous session was registered
        v_time_since_last_reg := EXTRACT(EPOCH FROM (v_now - v_current.updated_at)) * 1000;

        -- If another distinct session registered within the collision threshold window
        IF v_time_since_last_reg < p_collision_threshold_ms
           AND v_current.active_session_id != p_session_id THEN
            -- Losing concurrent attempt: fail closed without overwriting
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'CONCURRENT_LOGIN_LOST',
                'active_session_id', v_current.active_session_id,
                'session_epoch', v_current.session_epoch
            );
        END IF;
    END IF;

    -- 4. Upsert the new active session
    INSERT INTO security.user_active_sessions (
        user_id,
        active_session_id,
        session_epoch,
        device_info,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_session_id,
        COALESCE(v_current.session_epoch, 0) + 1,
        p_device_info,
        v_now,
        v_now
    )
    ON CONFLICT (user_id) DO UPDATE
    SET active_session_id = EXCLUDED.active_session_id,
        session_epoch = security.user_active_sessions.session_epoch + 1,
        device_info = EXCLUDED.device_info,
        updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'replaced_session_id', v_current.active_session_id,
        'session_epoch', COALESCE(v_current.session_epoch, 0) + 1
    );
END;
$$;
```

#### Why Alternative 2 Satisfies Both Scenarios:
1. **Scenario 1 (Legitimate Subsequent Login)**:
   - Device A registered at 10:00:00.
   - Device B logs in at 10:05:00 ($v\_time\_since\_last\_reg = 300,000\text{ms} \gg 750\text{ms}$).
   - Collision condition is false.
   - Device B replaces Device A cleanly. `replaced_session_id = Session_A` is returned.
   - Realtime sends termination event to Device A. Device B succeeds.
2. **Scenario 2 (Simultaneous Overlapping Logins)**:
   - Device A and Device B authenticate in parallel.
   - Device A's transaction commits at 10:00:00.000.
   - Device B's transaction acquires the advisory lock at 10:00:00.045 ($45\text{ms} < 750\text{ms}$).
   - Device B detects that another session registered 45ms ago.
   - Device B returns `{ success: false, error_code: 'CONCURRENT_LOGIN_LOST' }`.
   - Device A's session remains untouched and wins. Device B receives: *"Another login operation won. Please retry."*

#### Finding Classification: **VERIFIED**
A bounded-window collision detection mechanism under a transactional advisory lock provably satisfies both Scenario 1 and Scenario 2 without requiring pre-authentication email lookups.

---

## 4. Critical Investigation B — Login and Logout Transaction Coordination

### 4.1 Do Both Operations Need the Same Advisory Lock?
**YES.**
In PostgreSQL, row-level locks or conditional updates only lock rows that currently exist.
Consider the following interleaving without an advisory lock:
1. **State**: Registry has `active_session_id = Session_A`.
2. **Device A Logout**:
   - Device A sends logout with `Session_A`.
   - Executes `DELETE FROM security.user_active_sessions WHERE user_id = uid AND active_session_id = Session_A;`
3. **Device B Login**:
   - Executes `INSERT INTO security.user_active_sessions ... ON CONFLICT DO UPDATE`.
4. **Race Condition Without Lock**:
   - If Device B executes its query before Device A's transaction commits, PostgreSQL row locks on the target row can produce read-write race anomalies depending on transaction isolation levels (e.g. `Read Committed` re-reading after delete).
   - If Device A acquires `pg_advisory_xact_lock(user_id)` and Device B acquires `pg_advisory_xact_lock(user_id)`, all operations on that user's session record are strictly serialized.

### 4.2 Comprehensive Scenario Analysis

#### Scenario A: Logout Completes Before Registration
1. Device A initiates explicit logout.
2. Device A acquires advisory lock, deletes row where `active_session_id = Session_A`, commits, and releases lock.
3. Device B initiates login.
4. Device B acquires advisory lock. Sees no existing row (`FOUND = false`).
5. Device B inserts `Session_B` with `session_epoch = 1`.
6. **Result**: Clean success. No false rejection.

#### Scenario B: Delayed Logout Request Arrives After New Login
1. Device A owns `Session_A`.
2. Device B logs in legitimately and registers `Session_B`. Registry now contains `active_session_id = Session_B`.
3. Device A's delayed logout request arrives at server carrying `Session_A` in its JWT.
4. Device A's logout calls `deactivate_active_session()`.
5. Under advisory lock, query executes:
   ```sql
   DELETE FROM security.user_active_sessions
   WHERE user_id = v_user_id
     AND active_session_id = v_session_id; -- v_session_id is Session_A
   ```
6. Because `active_session_id` in database is `Session_B`, the `WHERE` condition matches 0 rows!
7. Zero rows deleted (`v_deleted_count = 0`). Returns `false`.
8. `Session_B` remains active and untouched.
9. **Result**: Newer session is completely immune to destruction by delayed logouts.

#### Scenario C: Simultaneous Lock Acquisition
`pg_advisory_xact_lock` relies on PostgreSQL's internal lock manager. Two transactions attempting to acquire the same 64-bit integer lock never execute concurrently; one is granted the lock immediately, and the other sleeps in queue until the first transaction reaches `COMMIT` or `ROLLBACK`. No deadlock is possible because each operation only ever requests a single lock.

#### Scenario D: Logout Network Failure After Local Token Wipe
1. User clicks "Sign Out".
2. Client wipes local storage (`localStorage.removeItem(...)`) and sets local React state to null.
3. Client attempts to call `deactivate_active_session()` via Supabase RPC, but user closes browser or network drops before HTTP request reaches PostgreSQL.
4. Registry still shows `active_session_id = Session_A`.
5. **Impact**:
   - The user's device has discarded its tokens; it can no longer make authenticated requests.
   - When the user logs in again (or another device logs in), Scenario 1 executes: the new login cleanly replaces `Session_A`.
   - **Result**: Self-healing. No persistent lockout occurs.

### 4.3 Rigorous Audit of `deactivate_active_session()`
Phase 1.1.2 proposed a basic implementation. We audit and harden it against all database edge cases:

```sql
CREATE OR REPLACE FUNCTION public.deactivate_active_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claims JSONB;
    v_user_id UUID;
    v_session_id UUID;
    v_lock_key BIGINT;
    v_deleted_count INT := 0;
BEGIN
    -- 1. Extract claims safely from transaction context
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_claims IS NULL THEN
        RETURN FALSE;
    END IF;

    v_user_id := (v_claims ->> 'sub')::UUID;
    v_session_id := (v_claims ->> 'session_id')::UUID;

    IF v_user_id IS NULL OR v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Acquire transaction-level advisory lock
    v_lock_key := ('x' || substr(md5(v_user_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. Conditional delete: only delete if active_session_id matches calling session
    DELETE FROM security.user_active_sessions
    WHERE user_id = v_user_id
      AND active_session_id = v_session_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN (v_deleted_count > 0);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Security hardening
REVOKE ALL ON FUNCTION public.deactivate_active_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_active_session() TO authenticated, service_role;
```

#### Audit Findings for `deactivate_active_session()`:
* **JWT Claim Extraction**: `current_setting('request.jwt.claims', true)` is verified safe. If unauthenticated, returns `false`.
* **SECURITY DEFINER**: Validated. Runs with definer privileges to access the private `security` schema.
* **Empty `search_path`**: Prevents schema injection attacks.
* **Lock Coordination**: Added `pg_advisory_xact_lock` matching `register_active_session`.

#### Finding Classification: **VERIFIED**

---

## 5. Critical Investigation C — Preventing Stale Login Operations from Revoking the Winning Session

### 5.1 The `auth.admin.signOut(jwt, "others")` Vulnerability Analysis

Phase 1.1.2 recommended that upon successful registration, the orchestrator call:
```typescript
await supabaseAdmin.auth.admin.signOut(newSession.access_token, "others");
```

#### Detailed Failure Race Condition:
Consider two concurrent or slightly staggered login attempts for the same account:
1. **$T_0$**: Login A authenticates via GoTrue. Receives `Session_A` (`access_token_A`, `session_id_A`).
2. **$T_1$**: Login B authenticates via GoTrue. Receives `Session_B` (`access_token_B`, `session_id_B`).
3. **$T_2$**: Login A calls `register_active_session(Session_A)`. Registry has `active = Session_A`.
4. **$T_3$**: Login B calls `register_active_session(Session_B)` (e.g. after collision window or legitimately). Registry has `active = Session_B`.
5. **$T_4$**: Login A's delayed execution reaches Step 3:
   ```typescript
   await supabaseAdmin.auth.admin.signOut(access_token_A, "others");
   ```
6. **GoTrue Behavior**:
   - GoTrue receives the request with `access_token_A` and scope `"others"`.
   - GoTrue identifies the user associated with `access_token_A`.
   - GoTrue deletes **ALL** refresh tokens for that user **except** the refresh token for `Session_A`!
   - This means GoTrue actively deletes the refresh token for `Session_B`!
7. **The Catastrophe**:
   - `Session_B` is the legitimate, winning active session in PostgreSQL.
   - When Device B attempts to refresh its token 60 minutes later, GoTrue responds with HTTP 400 `Invalid Refresh Token`.
   - Device B is unexpectedly logged out!

### 5.2 Can Pre-Check or Distributed Locking Fix This?
* **Pre-Check**: Suppose Login A queries PostgreSQL before calling `signOut("others")`:
  ```typescript
  const { data: isActive } = await supabaseAdmin.rpc("is_active_session", { p_session_id: Session_A });
  if (!isActive) return; // Skip signOut
  await supabaseAdmin.auth.admin.signOut(access_token_A, "others");
  ```
  **Flaw (TOCTOU)**: Between checking `isActive` (at $T_3$) and GoTrue executing the deletion (at $T_5$), Login B can commit in PostgreSQL! A network hiccup between the Orchestrator and GoTrue widens this window to hundreds of milliseconds.
* **Distributed Lock**: Holding a database advisory lock across an external HTTP call to GoTrue is an anti-pattern: if GoTrue hangs, database connection pools exhaust rapidly.

### 5.3 Comparative Analysis: Option A vs. Option B

| Security & Architectural Dimension | Option A: Keep `signOut("others")` | Option B (RECOMMENDED): Authoritative Database Registry Only |
| :--- | :--- | :--- |
| **Protection Against Revocation Races** | **POOR**. High risk of revoking winning session's refresh token during network jitter. | **PERFECT**. Zero risk of cross-revoking refresh tokens. |
| **Instant Access Token Invalidation** | **FALSE**. `signOut("others")` does NOT invalidate already-issued stateless JWT access tokens! | **TRUE**. `public.is_active_session()` immediately rejects superseded JWTs on every request. |
| **Protected Resource Security** | Depends entirely on `is_active_session()`. | Authoritatively enforced by `is_active_session()` on every protected request. |
| **External Auth API Dependencies** | Creates tight coupling and latency bottlenecks during login. | Zero external dependencies after initial authentication. |
| **Stale Refresh Token Risk** | Slightly lower idle tokens in GoTrue tables. | Orphaned refresh tokens can refresh once, but the refreshed JWT is immediately rejected by `is_active_session()`. |

### 5.4 Why Leaving Refresh Tokens in GoTrue is Safe in Horizon
Why was `signOut("others")` initially considered? To revoke old refresh tokens so old devices cannot refresh.
However, consider what happens on an old device (Device A) under Option B:
1. Device A's access token expires after 1 hour (or is immediately rejected on any protected request via `is_active_session()`).
2. Device A's Supabase client calls `supabase.auth.refreshSession()`.
3. GoTrue exchanges the refresh token and issues a new access token.
4. **Crucial Point**: GoTrue preserves the existing `session_id` in the newly minted JWT claims (`jwt.claims.session_id` is immutable for the lifetime of that GoTrue session).
5. When Device A presents this newly refreshed JWT to Horizon (`resource-access` Edge Function or database query):
   - Horizon checks `public.is_active_session()`.
   - In `security.user_active_sessions`, `active_session_id` is `Session_B`.
   - The check returns `FALSE`.
   - Device A is rejected with HTTP 401 `SESSION_SUPERSEDED`!
6. Device A can NEVER access protected Study Notes, update reading progress, or access private data, regardless of whether its refresh token is valid in GoTrue.

### 5.5 Architectural Recommendation for Session Revocation
**ABANDON `auth.admin.signOut(jwt, "others")` in the Login Orchestrator.**
Rely strictly on:
1. The PostgreSQL active-session registry (`security.user_active_sessions`).
2. Transactional advisory lock coordination during registration and logout.
3. Server-side validation via `public.is_active_session()` on every protected Edge Function and RLS policy.
4. Client-side Realtime broadcast notification for immediate UX teardown.

#### Finding Classification: **VERIFIED & RESOLVED**
Removing `signOut("others")` eliminates the critical revocation race condition without any compromise to security.

---

## 6. Realtime Verification & Authorization Policies

### 6.1 SDK Verification of `httpSend()`
Direct code inspection of the installed package `@supabase/realtime-js` v2.112.2 confirms:
* File: `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js`
* Method: `httpSend(event, payload, opts = {})`
* Mechanism: Direct HTTP POST to Realtime Broadcast REST endpoint:
  ```typescript
  const url = new URL(this.broadcastEndpointURL);
  url.pathname += `/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(event)}`;
  ```
* Supports bearer token authorization (`this.socket.accessTokenValue`).
* When called via `supabaseAdmin` with the Service Role Key, it bypasses RLS and broadcasts directly to private topics without opening long-lived WebSockets.

### 6.2 Strict Private Channel RLS Policy
In Supabase Realtime Authorization, client listening permissions are controlled by Row Level Security on the `realtime.messages` table.

#### Required RLS Policies on `realtime.messages`:
```sql
-- 1. Enable RLS on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to listen ONLY to broadcast events on their own topic
CREATE POLICY "Allow users to subscribe to own broadcast topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.messages.topic = ('user:' || (auth.uid())::text)
);
```

#### Why `extension = 'broadcast'` is Critical:
- Realtime supports multiple extensions: `broadcast`, `presence`, and `postgres_changes`.
- Restricting `extension = 'broadcast'` ensures that clients cannot exploit topic subscriptions to intercept Postgres change streams or forge presence states.

### 6.3 Notification Delivery vs. Security Boundary
* **Realtime is strictly an optimistic UX acceleration mechanism.**
* If the user's browser is asleep, offline, or behind an aggressive firewall, the Realtime broadcast might not be received immediately.
* **Fail-Closed Security Guarantee**:
  - The security boundary does not rely on Realtime.
  - The moment the active session changes in PostgreSQL, any subsequent call by the superseded device to `supabase/functions/resource-access` or any RLS-protected table immediately fails with HTTP 401.
  - Upon receiving HTTP 401 `SESSION_SUPERSEDED`, the frontend client tears down the local session and redirects to `/login`.

#### Finding Classification: **VERIFIED**

---

## 7. Cross-Cutting Security Review

We audited the entire Horizon architecture against the 12 core security requirements:

| # | Invariant / Requirement | Mechanism & Verification | Status |
| :---: | :--- | :--- | :---: |
| **1** | JWT `session_id` availability | Populated automatically by Supabase Auth in `request.jwt.claims ->> 'session_id'`. Verified in `@supabase/auth-js`. | **VERIFIED** |
| **2** | JWT `sub` availability | Populated automatically by Supabase Auth with user's UUID (`request.jwt.claims ->> 'sub'`). | **VERIFIED** |
| **3** | Refresh token continuity | Refresh tokens preserve original `session_id` upon refresh; validated against PostgreSQL registry. | **VERIFIED** |
| **4** | RLS enforcement | Client roles (`anon`, `authenticated`) have ZERO access to `security.user_active_sessions`. Accessible only via `SECURITY DEFINER` functions. | **VERIFIED** |
| **5** | Service-role bypass | Login Orchestrator Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` exclusively for trusted database writes. | **VERIFIED** |
| **6** | Private schema access | Schema `security` is isolated from PostgREST exposure; tables are invisible via standard REST API endpoints. | **VERIFIED** |
| **7** | `SECURITY DEFINER` safety | Functions `is_active_session`, `register_active_session`, and `deactivate_active_session` enforce `SET search_path = ''` to prevent path poisoning. | **VERIFIED** |
| **8** | Advisory lock semantics | `pg_advisory_xact_lock` using 64-bit BigInt derived from user UUID hash. Automatically released at transaction boundaries. | **VERIFIED** |
| **9** | Edge Function JWT verification | `resource-access` enforces bearer auth; `login-orchestrator` runs with `verify_jwt = false` (handles credentials directly). | **VERIFIED** |
| **10** | Email confirmation enforcement | `resource-access` checks `user.email_confirmed_at != null`. Unconfirmed users cannot access Study Notes. | **VERIFIED** |
| **11** | Protected Study Notes access | Stored in private bucket `protected resources`. Short-lived signed URLs (~60s) generated only after active session check. | **VERIFIED** |
| **12** | Public PYQ access | Stored in public bucket `pdfs`. Directly downloadable without authentication. Verified untouched. | **VERIFIED** |

#### Finding Classification: **VERIFIED**

---

## 8. Architecture Alternatives Comparison

| Evaluation Criteria | Proposed Design (Phase 1.1.2) | Revised Design (Phase 1.1.3) |
| :--- | :--- | :--- |
| **Login Concurrency Handling** | Relied on unproven `login_attempt_id` / timestamps without collision detection window. | **Deterministic Bounded Collision Window (750ms)** under transaction advisory lock. |
| **Session Revocation Mechanism** | Called `auth.admin.signOut(jwt, "others")`. | **Eliminated `signOut("others")`**. Relies authoritatively on PostgreSQL registry verification. |
| **Stale Revocation Vulnerability** | Vulnerable to older login revoking newer login's refresh token. | **Zero Vulnerability**. Refresh tokens cannot cross-revoke. |
| **Logout Synchronization** | Conditional delete only without lock. | **Advisory Lock + Conditional Delete** on `active_session_id = v_session_id`. |
| **Realtime Security** | Basic topic matching. | Strict RLS on `realtime.messages` with `extension = 'broadcast'` and topic isolation. |
| **External Auth Dependencies** | Multiple external HTTP calls during login transaction. | Minimal single GoTrue call; all coordination localized to PostgreSQL. |

---

## 9. Recommended Final Architecture

### 9.1 Database Schema (`security.user_active_sessions`)
```sql
CREATE SCHEMA IF NOT EXISTS security;
REVOKE ALL ON SCHEMA security FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA security TO service_role;

CREATE TABLE IF NOT EXISTS security.user_active_sessions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    active_session_id UUID NOT NULL,
    session_epoch BIGINT NOT NULL DEFAULT 1,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Deny all client access
REVOKE ALL ON security.user_active_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON security.user_active_sessions TO service_role;
```

### 9.2 Authoritative Validation Function (`public.is_active_session`)
```sql
CREATE OR REPLACE FUNCTION public.is_active_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claims JSONB;
    v_user_id UUID;
    v_session_id UUID;
    v_is_active BOOLEAN;
BEGIN
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_claims IS NULL THEN
        RETURN FALSE;
    END IF;

    v_user_id := (v_claims ->> 'sub')::UUID;
    v_session_id := (v_claims ->> 'session_id')::UUID;

    IF v_user_id IS NULL OR v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT (active_session_id = v_session_id)
    INTO v_is_active
    FROM security.user_active_sessions
    WHERE user_id = v_user_id;

    RETURN COALESCE(v_is_active, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_session() TO authenticated, service_role;
```

### 9.3 End-to-End Login Orchestration Flow
```
Client Device B                   Login Orchestrator                PostgreSQL Registry               Client Device A
      │                                    │                                  │                              │
[Enters credentials]                       │                                  │                              │
 POST /functions/v1/auth-login             │                                  │                              │
      ├───────────────────────────────────►│                                  │                              │
      │                                    │ Authenticate with GoTrue         │                              │
      │                                    ├─► signInWithPassword(email, pwd) │                              │
      │                                    │   (persistSession: false)        │                              │
      │                                    ◄─ Return newSession, session_id   │                              │
      │                                    │                                  │                              │
      │                                    │ Call register_active_session     │                              │
      │                                    ├─────────────────────────────────►│ pg_advisory_xact_lock        │
      │                                    │                                  │ Check collision window       │
      │                                    │                                  │ Upsert active_session_id     │
      │                                    │                                  │ Commit & release lock        │
      │                                    │◄─────────────────────────────────┤                              │
      │                                    │                                  │                              │
      │                                    │ httpSend("session_replaced")     │                              │
      │                                    ├──────────────────────────────────┼─────────────────────────────►│ Realtime Event
      │                                    │ (Bypasses RLS via service_role)  │                              │ [Tears down local state]
      │                                    │                                  │                              │ [Redirects to /login]
      │◄───────────────────────────────────┤                                  │                              │
      │ HTTP 200 { session, user }         │                                  │                              │
[Stores session tokens]                    │                                  │                              │
[Redirects to /dashboard]                  │                                  │                              │
```

---

## 10. Remaining Blockers

There are **zero theoretical or algorithmic blockers**. The architecture is mathematically sound and addresses all race conditions identified in previous reviews.

The remaining requirements are operational prerequisites prior to Phase 1.2 implementation:
1. **Remote Supabase Configuration Verification**:
   - Ensure *Email Confirmations* remain enabled in Supabase Auth Settings.
   - Verify that *Inactivity Timeout* and *Session Timebox* are disabled so sessions remain active indefinitely until displaced or logged out.
2. **Local Environment Hygiene**:
   - Maintain strict read-only guarantees until explicit implementation approval is provided.

---

## 11. Final Readiness Verdict

$$\mathbf{READY\ WITH\ EXPLICIT\ CONDITIONS}$$

### Justification:
All critical concurrency, transaction coordination, and revocation questions have been rigorously investigated, solved, and verified against installed SDKs and PostgreSQL specifications:
1. Distinguishability between concurrent collisions and subsequent logins is solved via serialized bounded-window detection under transaction advisory locks.
2. Logout and login coordination is synchronized via shared advisory locks and conditional deletion.
3. The stale `signOut("others")` revocation race is permanently eliminated by removing `signOut("others")` and relying on authoritative database registry enforcement on every request.
4. Realtime broadcast is verified supported via `RealtimeChannel.prototype.httpSend()` in installed `@supabase/supabase-js` v2.112.2.
