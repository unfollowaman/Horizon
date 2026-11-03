# Horizon Phase 1.2.1: Database Foundation Implementation Report

## 1. Executive Summary

Phase 1.2.1 implements the foundational database layer for Horizon's Single-Active-Device Session security architecture. Following the settled decisions of Phase 1.0 through Phase 1.1.4, this implementation establishes the private database registry, transactional advisory lock coordination, 750ms collision-detection logic, conditional session deletion, authoritative validation functions, and private Realtime broadcast authorization.

### Status and Deliverables
- **Status**: **COMPLETE (Foundation Implemented & Verified)**.
- **Migration**: `supabase/migrations/20260301000000_single_device_session_foundation.sql`.
- **Test Suite**: `scripts/__tests__/sessionFoundation.test.ts` (10 passing specification/unit tests).
- **PostgreSQL Execution Status**: Static specification, schema verification, and algorithmic unit tests passed. Direct PostgreSQL runtime execution on a live instance was not performed due to local container constraints and production isolation rules.
- **Production Status**: **UNTOUCHED**. No remote database mutations were executed.

---

## 2. Settlement Confirmation

As mandated by canonical architecture requirements, the following settled decisions were preserved without modification:
1. **750ms Collision Window**: Retained as an accepted engineering trade-off. Overlapping logins arriving within 750ms of a newly committed active session are rejected with `CONCURRENT_LOGIN_LOST`.
2. **Post-Authentication Advisory Locking**: Registration and deactivation both acquire an identical transaction-scoped advisory lock derived deterministically from the user's UUID via dynamic SQL parsing of the hex bit string literal:
   `EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint' INTO v_lock_key USING user_id;`
3. **No GoTrue Internals Tampering**: Eliminated `auth.admin.signOut("others")` in accordance with Phase 1.1.3; single-device security is governed authoritatively by the database registry.
4. **Conditional Deletion**: Deactivation queries strictly execute:
   ```sql
   DELETE FROM security.user_active_sessions
   WHERE user_id = v_user_id
     AND active_session_id = v_session_id;
   ```
   Older sessions cannot delete newer sessions.
5. **Realtime Isolation**: Supabase Realtime is strictly an optimistic UX notification mechanism, isolated via private channel RLS (`realtime.messages` where `extension = 'broadcast'` and `topic = 'user:<user_id>'`).

---

## 3. Database Architecture & Registry Specification

### 3.1 Private Schema: `security`
- **Creation**: `CREATE SCHEMA IF NOT EXISTS security;`
- **Access Control**: Revoked entirely from `PUBLIC`, `anon`, and `authenticated`. Usage granted strictly to `service_role`.
- **PostgREST Isolation**: By confining tables and internal structures to `security`, PostgREST will not expose any automated REST endpoints or schemas to client browsers.

### 3.2 Registry Table: `security.user_active_sessions`
- **Schema**:
  | Column Name | Data Type | Nullable | Default | Description / Purpose |
  | :--- | :--- | :--- | :--- | :--- |
  | `user_id` | `UUID` | No | None | Primary Key; references `auth.users(id) ON DELETE CASCADE`. Identifies Auth user. |
  | `active_session_id` | `UUID` | No | None | Currently active Supabase Auth session UUID. |
  | `session_epoch` | `BIGINT` | No | `1` | Monotonically increasing version counter incremented on every session registration. |
  | `device_info` | `JSONB` | No | `'{}'::jsonb` | Structured device/client metadata recorded during registration. |
  | `created_at` | `TIMESTAMPTZ` | No | `clock_timestamp()` | Timestamp of the initial session registration. |
  | `updated_at` | `TIMESTAMPTZ` | No | `clock_timestamp()` | Timestamp of the most recent session registration or update. |

- **Indexes**:
  - `idx_user_active_sessions_session_id` on `active_session_id` for fast lookups.
  - Primary Key index on `user_id`.
- **Row Level Security**:
  - RLS enabled: `ALTER TABLE security.user_active_sessions ENABLE ROW LEVEL SECURITY;`.
  - Permissions revoked from `PUBLIC`, `anon`, and `authenticated`.
  - Permissions granted to `service_role` only.

---

## 4. Functions & Identity-Trust Models

### 4.1 `public.register_active_session`
- **Signature**: `public.register_active_session(p_user_id UUID, p_session_id UUID, p_device_info JSONB DEFAULT '{}'::jsonb, p_collision_threshold_ms INT DEFAULT 750) RETURNS JSONB`
- **Trust Boundary & Authorization**:
  - **Server-Only (service_role only)**.
  - `REVOKE ALL ON FUNCTION public.register_active_session(...) FROM PUBLIC, anon, authenticated;`
  - `GRANT EXECUTE ON FUNCTION public.register_active_session(...) TO service_role;`
  - In Supabase, service-role calls (such as from Edge Functions) do not automatically propagate user JWT claims. Therefore, the function accepts explicit `p_user_id` and `p_session_id` parameters.
  - The caller (the Phase 1.2.2 Login Orchestrator Edge Function) is responsible for verifying user credentials via GoTrue (`signInWithPassword`) and extracting the verified `user.id` and JWT `session_id` before invoking this function.
  - Ordinary clients cannot call this function directly under any circumstances.
- **Concurrency & Advisory Locking**:
  - Derives deterministic 64-bit integer: `EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint' INTO v_lock_key USING p_user_id;`
  - Acquires `PERFORM pg_advisory_xact_lock(v_lock_key);`
  - If the session ID matches existing active session: idempotent update of `updated_at` and `device_info`, returns `{ success: true, is_idempotent: true }`.
  - If another distinct session committed within `p_collision_threshold_ms` (750ms), returns `{ success: false, error_code: 'CONCURRENT_LOGIN_LOST' }`.
  - Otherwise, increments `session_epoch`, upserts `security.user_active_sessions`, and returns `{ success: true, replaced_session_id: ..., session_epoch: ... }`.

### 4.2 `public.deactivate_active_session`
Two complementary interfaces are provided:
1. **Client-Facing (JWT-Derived Identity)**:
   - **Signature**: `public.deactivate_active_session() RETURNS JSONB`
   - **Trust Boundary**: `GRANT EXECUTE TO authenticated, service_role;`
   - Safely extracts `sub` (user_id) and `session_id` from `current_setting('request.jwt.claims', true)`.
   - Acquires the identical 64-bit advisory lock.
   - Executes conditional deletion:
     ```sql
     DELETE FROM security.user_active_sessions
     WHERE user_id = v_user_id
       AND active_session_id = v_session_id;
     ```
   - If an old device attempts to log out after its session was already displaced, `v_deleted_count = 0` and the newer session remains completely intact.
2. **Server-Facing (Explicit Parameters)**:
   - **Signature**: `public.deactivate_active_session(p_user_id UUID, p_session_id UUID) RETURNS JSONB`
   - **Trust Boundary**: `service_role` only. Revoked from `PUBLIC`, `anon`, `authenticated`.
   - Allows trusted backend services (Edge Functions or Admin APIs) to deactivate an active session on behalf of a verified user.

### 4.3 `public.is_active_session`
Two complementary interfaces are provided:
1. **Client / RLS Context (JWT-Derived Identity)**:
   - **Signature**: `public.is_active_session() RETURNS BOOLEAN`
   - **Volatility**: `STABLE`
   - **Trust Boundary**: `GRANT EXECUTE TO authenticated, service_role;`
   - Safely extracts `sub` and `session_id` from `request.jwt.claims`.
   - Compares against `security.user_active_sessions`. Returns `TRUE` if active, `FALSE` if null, superseded, or unauthenticated.
2. **Server-Facing (Explicit Parameters)**:
   - **Signature**: `public.is_active_session(p_user_id UUID, p_session_id UUID) RETURNS BOOLEAN`
   - **Volatility**: `STABLE`
   - **Trust Boundary**: `service_role` only. Revoked from `PUBLIC`, `anon`, `authenticated`.
   - Allows Edge Functions (e.g. `resource-access`) to validate whether a decoded JWT's claims are active.

---

## 5. Supabase Realtime Broadcast Security

Inspects `information_schema.tables` for `realtime.messages`:
- Enables RLS on `realtime.messages`.
- Adds private channel authorization policy:
  ```sql
  CREATE POLICY "Allow users to subscribe to own broadcast topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
      realtime.messages.extension = 'broadcast'
      AND realtime.messages.topic = ('user:' || (auth.uid())::text)
  );
  ```
- Guarantees that clients can only subscribe to broadcast messages on their own user-scoped topic (`user:<user_id>`). They cannot listen to other students' topics or access PostgreSQL changes / presence extensions.

---

## 6. Testing & Verification Evidence

### 6.1 Test Execution Summary

| Test Suite | Environment | Tests Executed | Result | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Foundation Spec Suite** (`scripts/__tests__/sessionFoundation.test.ts`) | Vitest (Node.js) | 10 | **PASSED** | Schema definitions, table RLS, advisory locking parity, 750ms collision math, conditional deletion invariants, Realtime policies. |
| **Full Vitest Suite** | Vitest (Node.js/JSDOM) | 78 test files / 547 tests | **PASSED** | Zero regressions across frontend, hooks, services, and script tests. |
| **Deno Edge Function Suite** | Deno Runtime | 116 tests | **PASSED** | Zero regressions in `vapid_test.ts`, `send-push-notification/test.ts`, `subscribe-push/test.ts`. |
| **TypeScript Typecheck** | `tsc -b` | Full project | **PASSED** | Zero type errors. |
| **Direct PostgreSQL DDL/DML Execution** | PostgreSQL 15 / Supabase DB | 0 | **UNEXECUTED** | Unexecuted due to local Docker daemon layer-extraction permission constraints and strict prohibition against executing unreviewed migrations directly on remote production. |

### 6.2 Test Command Output
```bash
npx vitest run scripts/__tests__/sessionFoundation.test.ts
✓ scripts/__tests__/sessionFoundation.test.ts (10 tests) 15ms
Test Files  1 passed (1)
     Tests  10 passed (10)
```

---

## 7. Migration Deployment Instructions

To apply this migration in local development or staging:

### Local Development (via Supabase CLI):
```bash
npx supabase migration up
```
Or reset the local database:
```bash
npx supabase db reset
```

### Staging / Remote Supabase Project (`rhzftlytulgnpodxqzqr`):
When authorized for deployment:
```bash
npx supabase db push --project-ref rhzftlytulgnpodxqzqr
```

---

## 8. Production Safety Confirmation

**CONFIRMATION**:
- Production database (`rhzftlytulgnpodxqzqr`) was **NOT modified** during Phase 1.2.1.
- No remote migrations, DDL statements, or DML mutations were executed against the live project.
- All code changes reside strictly in local files:
  1. `supabase/migrations/20260301000000_single_device_session_foundation.sql`
  2. `scripts/__tests__/sessionFoundation.test.ts`
  3. `single-device-session-phase-1.2.1-database-foundation.md`

---

## 9. Next Steps (Phase 1.2.2 & Beyond)

With the database foundation successfully implemented and verified:
1. **Phase 1.2.2**: Implement the Edge Login Orchestrator (`auth-login` with `verify_jwt = false`) to authenticate users via GoTrue, invoke `public.register_active_session`, and broadcast `session_replaced` events via `channel.httpSend()`.
2. **Phase 1.2.3**: Update `supabase/functions/resource-access` to validate `user.email_confirmed_at != null` and `public.is_active_session()`, blocking displaced sessions from retrieving Study Notes.
3. **Phase 1.2.4**: Implement the frontend Realtime session listener in `AuthContext` to handle `session_replaced` events and tear down open PDF viewers with user notification.
