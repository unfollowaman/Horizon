# Horizon Push Notifications — Phase 8, Unit 8.2 Stage A Configuration Audit Report

## 1. Executive Summary & Context

This Stage A audit report presents the read-only findings for **Phase 8, Unit 8.2: Environment Configuration & Controlled Deployment** of Horizon's Web Push Notification system.

**Current Audit Status:** **`APPROVAL GATE — AWAITING EXPLICIT APPROVAL FOR STAGE B`**

In accordance with the strict audit-first workflow:
- Zero mutations, zero secret modifications, zero Edge Function deployments, and zero user role changes have been performed during Stage A.
- Read-only queries executed via the Supabase CLI established the exact live infrastructure state of Supabase project `rhzftlytulgnpodxqzqr`.
- Proposed Stage B commands and configuration steps are detailed below for review and explicit approval.

---

## 2. Environment & Repository Context

- **Repository Branch:** `jules-4206562772182746470-0d620d2f`
- **Base Commit SHA:** `bd505612f0049e6fcfebdf7238719543be293f0b`
- **Supabase Project Reference:** `rhzftlytulgnpodxqzqr`
- **Production Site Origin:** `https://unfollowaman.tech`

---

## 3. Read-Only Audit Findings

### 3.1 Edge Function Deployment Status

Live function status verified via `npx supabase functions list --project-ref rhzftlytulgnpodxqzqr`:

| Function Name | Status | Version | Last Updated (UTC) | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `resource-access` | **ACTIVE** | 167 | 2026-09-04 05:23:17 | None (Unmodified) |
| `subscribe-push` | **ACTIVE** | 1 | 2026-10-15 15:12:37 | None (Preserve existing active deployment) |
| `send-push-notification` | **NOT DEPLOYED** | N/A | N/A | **Deploy in Stage B** upon explicit approval |

### 3.2 VAPID Secrets & Environment Variables Status

Live secret inventory verified via `npx supabase secrets list --project-ref rhzftlytulgnpodxqzqr`:

| Variable Name | Scope | Verified Status | Details & Safety Assessment |
| :--- | :--- | :--- | :--- |
| `VAPID_PUBLIC_KEY` | Server (Supabase Secrets) | **ABSENT** | Not present in Supabase Secrets inventory. Must be set in Stage B. |
| `VAPID_PRIVATE_KEY` | Server (Supabase Secrets) | **ABSENT** | Not present in Supabase Secrets inventory. Must be set in Stage B. |
| `VAPID_SUBJECT` | Server (Supabase Secrets) | **ABSENT** | Not present in Supabase Secrets. Code defaults safely to `"mailto:admin@unfollowaman.tech"`. |
| `VITE_VAPID_PUBLIC_KEY` | Frontend (Build Env) | **UNVERIFIED** | Must match `VAPID_PUBLIC_KEY` in Cloudflare Pages / local `.env`. |

**Key Safety Principles:**
- No existing VAPID keypair exists in Supabase Secrets, so no existing subscriptions will be invalidated by creating the initial keypair.
- A single matching P-256 keypair will be generated once and configured identically across server secrets and frontend environment variables.
- The VAPID private key will remain strictly confined to server-side Supabase Secrets and will never be placed in frontend build configs or committed to repository files.

### 3.3 Administrator Account Provisioning Analysis

Inspected `scripts/seed_admin.mjs` and `scripts/__tests__/seed_admin.test.ts`:

- **Required Environment Variables:** `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (or `VITE_SUPABASE_URL`), and target identifier (`ADMIN_IDENTIFIER`, `ADMIN_EMAIL`, or `ADMIN_USER_ID`).
- **Targeting Mechanics:** Supports both UUID lookup (`getUserById`) and email search (`listUsers`). Handles duplicate emails safely by aborting with an ambiguity error to prevent accidental escalation of unintended accounts.
- **Role Isolation & Preservation:** Updates strictly `app_metadata.role = 'admin'`. Preserves all other existing `app_metadata` keys. Does not alter `profiles` or user-controlled metadata.
- **Idempotency:** Checks if `user.app_metadata.role === 'admin'` before making API calls. Returns `updated: false` gracefully if already provisioned.
- **Non-Auto-Creating:** Does not create new user accounts if the identifier is not found.
- **PII & Secret Protection:** Sanitizes and masks emails and UUIDs in console output (e.g., `a***n@example.com`, `123e4567...4000`).

---

## 4. Proposed Stage B Action Plan & Exact Execution Commands

Upon receiving explicit approval from the user, Stage B will execute the following four steps in order:

### Step 1: Generate & Set Matching Server VAPID Secrets
Generate a valid Web Push P-256 keypair in Base64URL format and execute:
```bash
npx supabase secrets set VAPID_PUBLIC_KEY="<APPROVED_PUBLIC_KEY>" VAPID_PRIVATE_KEY="<APPROVED_PRIVATE_KEY>" VAPID_SUBJECT="mailto:admin@unfollowaman.tech" --project-ref rhzftlytulgnpodxqzqr
```

### Step 2: Deploy `send-push-notification` Edge Function
Deploy the server-side dispatcher function using the project's supported API bundler flag:
```bash
npx supabase functions deploy send-push-notification --project-ref rhzftlytulgnpodxqzqr --use-api
```

### Step 3: Configure Frontend VAPID Public Key Variable
Configure `VITE_VAPID_PUBLIC_KEY="<APPROVED_PUBLIC_KEY>"` in the local development environment and Cloudflare Pages build settings so frontend subscription requests pass matching keys.

### Step 4: Provision Designated Administrator Account
Execute the safe admin seeding script using the user-approved target account identifier:
```bash
ADMIN_IDENTIFIER="<APPROVED_ADMIN_EMAIL_OR_UUID>" SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY>" node scripts/seed_admin.mjs
```

---

## 5. Risk Assessment & Rollback Procedures

- **Risk Level:** **LOW & CONTROLLED**
  - Deploying `send-push-notification` and setting VAPID secrets affects only the push dispatch subsystem and does not alter existing database schemas, student user profiles, or resource downloads.
  - `subscribe-push` is already active and tested; no redeployment is needed.
- **Rollback Procedures:**
  - *Edge Function Rollback:* `npx supabase functions delete send-push-notification --project-ref rhzftlytulgnpodxqzqr`
  - *Secrets Rollback:* `npx supabase secrets unset VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT --project-ref rhzftlytulgnpodxqzqr`
  - *Admin Privileges Rollback:* Update target user via Supabase Auth Admin API removing `role: 'admin'` from `app_metadata`.

---

## 6. Action Items Categorization

### Completed in Stage A (Zero Production Mutation)
- [x] Query live function deployment status via Supabase CLI.
- [x] Query live secrets inventory via Supabase CLI.
- [x] Verify `seed_admin.mjs` safety, idempotency, and parameter constraints.
- [x] Verify Edge Function bundler deployment flags (`--use-api`).
- [x] Prepare comprehensive Stage A Configuration Audit Report.

### Awaiting Explicit Approval for Stage B
- [ ] Set server VAPID secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) on Supabase project `rhzftlytulgnpodxqzqr`.
- [ ] Deploy `send-push-notification` Edge Function to project `rhzftlytulgnpodxqzqr`.
- [ ] Set `VITE_VAPID_PUBLIC_KEY` in frontend build environment.
- [ ] Execute `scripts/seed_admin.mjs` for designated test admin account.

---

## 7. Approval Gate Request

This completes Stage A read-only verification.

**Please review this report and provide explicit approval for the proposed Stage B execution commands.** Once approved, Stage B deployment and Stage C post-deployment verification will be carried out immediately.
