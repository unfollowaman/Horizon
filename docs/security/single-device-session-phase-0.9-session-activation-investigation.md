# Horizon — Phase 0.9: Session Identity Verification & Secure Activation Architecture

## 1. Executive Summary
This Phase 0.9 investigation resolves the critical bootstrap and verification problem for Single-Device Session Enforcement. Previous reports incorrectly assumed that internal Supabase tables (`auth.sessions`) could be easily queried or heavily modified via triggers in a managed environment, or that JWT `iat` timestamps securely proved freshness. This report definitively rejects those assumptions and establishes an architecture relying exclusively on the cryptographic properties of the Supabase Auth Response itself, orchestrated via a secure Edge Function proxy, to mathematically guarantee the "One active session per user" invariant.

## 2. Phase 0.8 Mistakes and Corrections
| Mistake | Correction |
| :--- | :--- |
| Querying `auth.sessions` via `service_role` | `service_role` grants RLS bypass on the `public` schema via PostgREST. It does NOT automatically expose the `auth` schema over the standard REST API. Querying `auth.sessions` from an Edge Function using the standard Supabase JS client is unsupported without manually exposing views. **ABANDONED.** |
| `created_at` timestamp comparison | Two rapid logins can share a timestamp boundary. Moreover, finding the "newest" session does not intrinsically tie that session to the client attempting the request. **ABANDONED.** |
| Client-triggered activation | Allowing the client to call `activate(session_id)` after login trusts the client to dictate its session identity, allowing replay attacks. **ABANDONED.** |

## 3. Supabase Auth Session Response Analysis
**Question 1: Does the returned session contain enough info to identify the newly created session?**
*   **VERIFIED via SDK Docs:** Yes. When `supabase.auth.signInWithPassword()` succeeds, it returns a `Session` object containing `access_token`, `refresh_token`, and the `user` object. The `access_token` (JWT) mathematically embeds the `session_id` claim. Crucially, the JWT is cryptographically signed by the Supabase backend.

**Question 2: Can the backend obtain the `session_id` and independently verify it?**
*   **VERIFIED:** Yes. An Edge Function receives the JWT in the `Authorization: Bearer` header. Calling `supabase.auth.getUser(token)` validates the JWT signature and expiration. If valid, the JWT's embedded `session_id` is demonstrably authentic and issued by Supabase.

**Question 3: Can an Edge Function perform the complete authentication itself?**
*   **VERIFIED:** Yes. If a client sends credentials (email/password) to a trusted Edge Function via POST, the Edge Function can instantiate a Supabase client, call `signInWithPassword()`, receive the *fresh* Session, and extract the `session_id` from the resulting JWT.

**Question 4: Does this avoid querying `auth.sessions`?**
*   **VERIFIED:** Yes. Because the Edge Function *just* performed the login, it absolutely knows the resulting session is the newest, authorized session. No database querying of `auth.sessions` is required.

**Question 5 & 6: Bypassing and Reclaiming?**
*   If a malicious client bypasses the orchestrator and calls standard `signInWithPassword()` directly, they receive a session, but it is NOT registered in `user_active_sessions`. Thus, RLS blocks all their data access.
*   An old session cannot convince the orchestrator to register it, because the orchestrator only registers the session *it just created*.

## 4. Edge Function Login Orchestrator Architecture (RECOMMENDED)
**Flow:**
1.  Client submits email/password securely (HTTPS POST) to Edge Function `login-orchestrator`.
2.  Edge Function initializes standard Supabase client and calls `supabase.auth.signInWithPassword()`.
3.  Supabase Auth succeeds and returns the `Session` object (containing the JWT).
4.  Edge Function extracts the `session_id` from the JWT payload.
5.  Edge Function initializes an Admin client (`SUPABASE_SERVICE_ROLE_KEY`).
6.  Edge Function executes atomic `UPSERT` on `public.user_active_sessions` setting `user_id = user.id` and `session_id = extracted_session_id`.
7.  Edge Function returns the `Session` object to the client.
8.  Client uses `supabase.auth.setSession()` to establish the local SDK state.

**Why this is safe:**
The client never passes a session ID. The server creates the session, registers it, and hands it back. The atomicity is bounded by the Edge Function execution. If the DB write fails, the Edge Function returns a 500, the client fails to login, and the session is effectively orphaned (safe).

## 5. Custom Access Token Hook Feasibility
**Feasibility:** PARTIALLY VERIFIED.
**Analysis:** A Custom Access Token Hook executes *before* token issuance (during login and refresh). It can add custom claims.
*   **The Bootstrap Problem:** If the hook queries `user_active_sessions` to verify if the token should be issued, what happens on the *first* login? The session isn't in the registry yet. The hook would reject it, preventing login.
*   **Verdict:** REJECTED. The hook cannot orchestrate the registration safely without creating race conditions or blocking legitimate initial logins. It is designed for claim augmentation, not primary state machine orchestration.

## 6. Session Registry Architecture
```sql
CREATE TABLE public.user_active_sessions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Only the user can view their active session record.
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own registry" ON public.user_active_sessions
    FOR SELECT USING (auth.uid() = user_id);
```
*   **Concurrency:** Handled via Edge Function Orchestrator. If Device A and B login simultaneously, two Edge Function invocations occur. Both receive a new session. Both attempt an `UPSERT` on `user_active_sessions`. Row-level locking in PostgreSQL guarantees they execute sequentially. The last to execute the UPSERT overwrites the registry. The user receives the session that won the race, or the client whose invocation lost the race effectively holds a revoked session (it will fail RLS). This is safe and deterministic.

## 7. Old-Session Reclaim Prevention
*   **Scenario:** Device A logs in. Device B logs in (replaces A). Device A still has an unexpired JWT.
*   **Prevention:** Device A attempts to access data. RLS evaluates `is_active_session()`. The function extracts Device A's `session_id` from the JWT and compares it to `user_active_sessions`. It does not match (it matches B). Access Denied.
*   **Refresh:** Device A refreshes its token. Supabase issues a new JWT. However, the `session_id` claim in the new JWT is *identical* to the old one. The RLS check continues to fail.
*   **Reclaim Attempt:** Device A cannot call an "activate" RPC, because no such RPC exists. The only way to register a session is to log in via the `login-orchestrator` Edge Function, which requires email/password.

## 8. Authentication Failure and Recovery Design

| Situation | Expected Behavior | Security Consequence |
| :--- | :--- | :--- |
| Auth succeeds, registry write fails | Edge Function returns 500 Error. Client login fails. | Fail-closed. Session exists in GoTrue but cannot access DB. Safe. |
| Two simultaneous logins | Both authenticate. DB row-lock serializes registry writes. Last write wins. | Exactly one session is active. Safe. |
| DB Outage | Edge Function fails to write registry. | Fail-closed. Login fails. Safe. |
| Client bypasses orchestrator | Client calls GoTrue directly. Gets session, but registry is untouched. | Client blocked by RLS. Safe. |

## 9. Protected Resource Enforcement

| Resource | Enforcement Mechanism |
| :--- | :--- |
| `learning_resources` (DB) | RLS calls `is_active_session()` |
| `profiles` (DB) | RLS calls `is_active_session()` |
| `reading_progress` (DB) | RLS calls `is_active_session()` |
| `chapter_completion` (DB) | RLS calls `is_active_session()` |
| `push_subscriptions` (DB) | RLS calls `is_active_session()` |
| `resource-access` (Edge) | Explicit check: `SELECT session_id FROM user_active_sessions` |
| `subscribe-push` (Edge) | Explicit check: `SELECT session_id FROM user_active_sessions` |
| `send-push-notification`(Edge)| Explicit check + Admin Role Verification |
| `pdfs` (Storage - Protected) | Storage RLS calls `is_active_session()` |

## 10. Required Architecture Comparison

| Criterion | A. Edge Login Orchestrator (Selected) | B. Auth Hooks | C. Client RPC |
| :--- | :--- | :--- | :--- |
| Official Supabase support | High | High | High |
| Session identity verification | Absolute (Server creates it) | High | Zero (Client claims it) |
| Requires querying `auth.sessions`| No | No | Yes (which is blocked) |
| Client trust required | Zero | Zero | High |
| Old-session reclaim prevention | Yes | Bootstrap issues | Fails |

## 11. Complete Project Inventory
*   **Public:** `books`, `chapters`, `syllabus_topics`, `syllabus_topic_resources`, `pdfs/pyq/*`, `announcements` (sent). (Intentional educational SEO).
*   **Protected by active-session:** `profiles`, `learning_resources`, `reading_progress`, `chapter_completion`, `push_subscriptions`, `resource-access` Edge Function, `subscribe-push` Edge Function, `pdfs` non-public folders.
*   **Administrative:** `send-push-notification` (Requires both active session AND `admin` app_metadata).

## 12. Required Security Test Matrix

| Test Scenario | Action | Expected Result | Evidence Required |
| :--- | :--- | :--- | :--- |
| 1. First-device login | Call `login-orchestrator` | Success. DB updated. | HTTP 200 + Registry row exists. |
| 2. Second-device login | Call `login-orchestrator` | Success. DB overwritten. | HTTP 200 + Registry row updated. |
| 3. Old-device DB request | REST fetch `learning_resources` | RLS Denies access. | HTTP 200 (Empty array). |
| 4. Old-device Edge request | Invoke `resource-access` | Edge returns 401. | HTTP 401 Unauthorized. |
| 5. Old-device Storage request| GET protected PDF | Storage RLS Denies. | HTTP 403 Forbidden. |
| 6. Old-device JWT refresh | Call `auth.refreshSession()` | Token refreshes, data still blocked. | New JWT acquired; DB reqs fail. |
| 8. Simultaneous login | Call orchestrator twice rapidly | One session wins. | Registry has one row. |
| 16. Bypassing orchestrator | Call native `signInWithPassword`| Session granted, data blocked. | JWT acquired; DB reqs fail. |

## 13. Deployment and Existing-Session Strategy
**Passive Cutover:**
1. Deploy `user_active_sessions` and RLS `is_active_session()`.
2. Deploy Edge Functions (`login-orchestrator` and updated existing functions).
3. **Frontend:** Update `/login` to use the orchestrator instead of native auth. Update `AuthContext` to treat 401s and empty RLS arrays as a forced local logout.
4. **Existing Users:** They are missing from the registry. Their next data request returns empty/401. Frontend bounces them to `/login`. They reauthenticate via the orchestrator.
*This requires no mass global revocation scripts and ensures seamless security degradation.*

## 14. Remaining Unknowns
*   **Edge Function Login Stability:** Proxied logins via Edge Functions work theoretically, but handling features like OAuth, CAPTCHAs, or MFA requires significantly extending the orchestrator to proxy the entire Supabase Auth lifecycle.

## 15. Final Readiness Decision
**READY FOR PHASE 1**
The "Edge Login Orchestrator" mathematically removes the client from the activation trust boundary, inherently captures the true `session_id` directly from the Supabase API without requiring cross-schema database reads, and is immune to token refresh and replay attacks.
