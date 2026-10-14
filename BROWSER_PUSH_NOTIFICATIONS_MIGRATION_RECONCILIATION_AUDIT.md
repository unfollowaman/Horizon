# Browser Push Notifications Migration Reconciliation Audit

**Migration under audit:** `supabase/migrations/20260201000000_push_notifications_foundation.sql`
**Repository Branch / Commit:** `main`
**Audit Purpose:** Read-only analysis and preparation of a live database verification checklist and migration history reconciliation plan without re-executing SQL or modifying live database state.

---

## 1. Migration Inventory

The migration file `supabase/migrations/20260201000000_push_notifications_foundation.sql` contains the following database operations in exact execution order:

### 1. Table Creation: `public.push_subscriptions` (Lines 4–20)
* **Table:** `public.push_subscriptions`
* **Columns:**
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (Line 5)
  * `user_id`: `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` (Line 6)
  * `endpoint`: `TEXT NOT NULL UNIQUE` (Line 7)
  * `p256dh`: `TEXT NOT NULL` (Line 8)
  * `auth`: `TEXT NOT NULL` (Line 9)
  * `user_agent`: `TEXT` (Nullable) (Line 10)
  * `student_class`: `TEXT NOT NULL CHECK (student_class IN ('8', '9', '10', '11', '12', 'general_only'))` (Line 11)
  * `study_medium`: `TEXT NOT NULL CHECK (study_medium IN ('english', 'hindi', 'general_only'))` (Line 12)
  * `is_active`: `BOOLEAN NOT NULL DEFAULT true` (Line 13)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (Line 14)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (Line 15)
* **Constraints:**
  * `PRIMARY KEY (id)`
  * Foreign Key: `user_id REFERENCES auth.users(id) ON DELETE CASCADE`
  * `UNIQUE (endpoint)`
  * `CHECK (student_class IN ('8', '9', '10', '11', '12', 'general_only'))`
  * `CHECK (study_medium IN ('english', 'hindi', 'general_only'))`
  * `CONSTRAINT chk_paired_general_only CHECK ((student_class = 'general_only' AND study_medium = 'general_only') OR (student_class != 'general_only' AND study_medium != 'general_only'))` (Lines 16–19)

### 2. Indexes on `public.push_subscriptions` (Lines 22–26)
* **`idx_push_subs_user_id`**: `CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);` (Line 23)
* **`idx_push_subs_active_targeting`**: `CREATE INDEX IF NOT EXISTS idx_push_subs_active_targeting ON public.push_subscriptions(student_class, study_medium) WHERE is_active = true;` (Lines 24–26) — Partial index on `(student_class, study_medium)` filtered by `WHERE is_active = true`.

### 3. Table Creation: `public.announcements` (Lines 28–44)
* **Table:** `public.announcements`
* **Columns:**
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (Line 29)
  * `title`: `TEXT NOT NULL` (Line 30)
  * `body`: `TEXT NOT NULL` (Line 31)
  * `image_url`: `TEXT` (Nullable) (Line 32)
  * `destination_url`: `TEXT NOT NULL DEFAULT '/'` (Line 33)
  * `target_class`: `TEXT NOT NULL DEFAULT 'all' CHECK (target_class IN ('8', '9', '10', '11', '12', 'all'))` (Line 34)
  * `target_medium`: `TEXT NOT NULL DEFAULT 'all' CHECK (target_medium IN ('english', 'hindi', 'all'))` (Line 35)
  * `created_by`: `UUID REFERENCES auth.users(id) ON DELETE SET NULL` (Line 36)
  * `status`: `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed'))` (Line 37)
  * `total_sent`: `INTEGER NOT NULL DEFAULT 0 CHECK (total_sent >= 0)` (Line 38)
  * `total_successful`: `INTEGER NOT NULL DEFAULT 0 CHECK (total_successful >= 0)` (Line 39)
  * `total_failed`: `INTEGER NOT NULL DEFAULT 0 CHECK (total_failed >= 0)` (Line 40)
  * `sent_at`: `TIMESTAMPTZ` (Nullable) (Line 41)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (Line 42)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (Line 43)
* **Constraints:**
  * `PRIMARY KEY (id)`
  * Foreign Key: `created_by REFERENCES auth.users(id) ON DELETE SET NULL`
  * `CHECK (target_class IN ('8', '9', '10', '11', '12', 'all'))`
  * `CHECK (target_medium IN ('english', 'hindi', 'all'))`
  * `CHECK (status IN ('draft', 'sending', 'sent', 'failed'))`
  * `CHECK (total_sent >= 0)`
  * `CHECK (total_successful >= 0)`
  * `CHECK (total_failed >= 0)`

### 4. Indexes on `public.announcements` (Lines 46–48)
* **`idx_announcements_status`**: `CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);` (Line 47)
* **`idx_announcements_created_at`**: `CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);` (Line 48) — Index with descending sort direction on `created_at`.

### 5. Least-Privilege Grants & Revokes (Lines 50–63)
* **Revokes:**
  * `REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;` (Line 52)
  * `REVOKE ALL ON public.announcements FROM PUBLIC, anon, authenticated;` (Line 53)
* **Client Role Grants:**
  * `GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;` (Line 56)
  * `GRANT SELECT ON public.announcements TO authenticated, anon;` (Line 59)
* **Service Role Grants:**
  * `GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;` (Line 62)
  * `GRANT SELECT, INSERT, UPDATE ON public.announcements TO service_role;` (Line 63)

### 6. Row Level Security (RLS) Enablement & Policies (Lines 65–85)
* **RLS Status:**
  * `ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;` (Line 67)
  * `ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;` (Line 68)
* **RLS Policies:**
  1. `"Users can view own push subscriptions"` (Lines 71–74):
     * Table: `public.push_subscriptions`
     * Command: `FOR SELECT`
     * Roles: `TO authenticated`
     * USING: `(auth.uid() = user_id)`
  2. `"Users can delete own push subscriptions"` (Lines 77–80):
     * Table: `public.push_subscriptions`
     * Command: `FOR DELETE`
     * Roles: `TO authenticated`
     * USING: `(auth.uid() = user_id)`
  3. `"Anyone can view sent announcements"` (Lines 83–85):
     * Table: `public.announcements`
     * Command: `FOR SELECT`
     * Roles: Default (`PUBLIC` / all roles)
     * USING: `(status = 'sent')`

### 7. Execution Side-Effects & Re-Run Risks
* Statements with `IF NOT EXISTS` (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) are safe on re-run syntactically, but if an object already exists in a modified or partial state, `IF NOT EXISTS` silently skips execution without correcting discrepancies.
* Statements for `REVOKE`, `GRANT`, and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` are idempotent.
* Statements for `CREATE POLICY` are **NOT IDEMPOTENT**. Executing this file again on a database where policies already exist will fail with: `ERROR: policy "<name>" for table "<tablename>" already exists`.

---

## 2. Repository Cross-Checks

We cross-referenced `supabase/migrations/20260201000000_push_notifications_foundation.sql` against the codebase:

### 1. TypeScript Types (`src/types/index.ts`)
* **`PushSubscriptionRow`** (Lines 119–131): Matches 11 columns, data types, nullabilities, and string union literals (`'8' | '9' | '10' | '11' | '12' | 'general_only'` and `'english' | 'hindi' | 'general_only'`).
* **`AnnouncementRow`** (Lines 133–151): Matches 15 columns, data types, nullabilities, defaults, and union literals (`'all' | '8' | ...`, `'draft' | 'sending' | 'sent' | 'failed'`).
* **`Database['public']['Tables']`** (Lines 276–322): Explicitly defines table contracts for `push_subscriptions` and `announcements` with `Row`, `Insert`, `Update`, and `Relationships: []`.

### 2. Edge Functions
* **`supabase/functions/subscribe-push/index.ts`**:
  * Authenticates user via `supabase.auth.getUser()`.
  * Reads user class and medium from `public.profiles`.
  * Queries `push_subscriptions` (`endpoint`) and performs `INSERT` or `UPDATE` using `createClient(supabaseUrl, supabaseServiceRoleKey)`.
  * Expects exact columns created by the migration (`user_id`, `endpoint`, `p256dh`, `auth`, `student_class`, `study_medium`, `user_agent`, `is_active`, `updated_at`).
* **`supabase/functions/send-push-notification/index.ts`**:
  * Authorizes admin via `user.app_metadata.role === 'admin'` from `auth.users`.
  * Queries `push_subscriptions` count based on Option A targeting rules (`is_active = true`, `student_class`, `study_medium`).

### 3. Distinction Between Custom Migration Objects and Supabase System Objects
* **Supabase System Objects**: `auth.users` table (referenced via foreign keys), `auth.uid()` function (used in RLS policies), `gen_random_uuid()` and `now()` PostgreSQL functions, and `public.profiles` table (used in onboarding/profile setup).
* **Custom Migration Objects**: Tables `public.push_subscriptions` and `public.announcements`, indexes `idx_push_subs_user_id`, `idx_push_subs_active_targeting`, `idx_announcements_status`, `idx_announcements_created_at`, check constraint `chk_paired_general_only`, table grants, and RLS policies.

### 4. Mismatches
* Zero schema mismatches exist between migration `20260201000000_push_notifications_foundation.sql` and the repository TypeScript/Edge Function code.

---

## 3. Live SQL Verification Checklist

Execute the following copy-ready, read-only SQL queries in the Supabase Dashboard SQL Editor to verify complete schema equivalence:

### Query 1: Verify Table Existence, Columns, Data Types, Nullability & Defaults
```sql
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('push_subscriptions', 'announcements')
ORDER BY table_name, ordinal_position;
```
*Expected Result:*
* `push_subscriptions`: 11 columns (`id`, `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `student_class`, `study_medium`, `is_active`, `created_at`, `updated_at`). `user_agent` nullable; others non-nullable. Defaults for `id` (`gen_random_uuid()`), `is_active` (`true`), `created_at` (`now()`), `updated_at` (`now()`).
* `announcements`: 15 columns (`id`, `title`, `body`, `image_url`, `destination_url`, `target_class`, `target_medium`, `created_by`, `status`, `total_sent`, `total_successful`, `total_failed`, `sent_at`, `created_at`, `updated_at`). `image_url`, `created_by`, `sent_at` nullable.

### Query 2: Verify Foreign Keys, Delete Actions & Primary Keys
```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON rc.unique_constraint_name = ccu.constraint_name
  AND rc.constraint_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('push_subscriptions', 'announcements')
ORDER BY tc.table_name, tc.constraint_name;
```
*Expected Result:*
* `push_subscriptions`: Primary key on `id`, Unique key on `endpoint`, Foreign key `user_id` -> `auth.users(id)` with `delete_rule = 'CASCADE'`.
* `announcements`: Primary key on `id`, Foreign key `created_by` -> `auth.users(id)` with `delete_rule = 'SET NULL'`.

### Query 3: Verify Detailed Check Constraints
```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
 AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('push_subscriptions', 'announcements')
ORDER BY tc.table_name, tc.constraint_name;
```
*Expected Result:*
* `push_subscriptions`: Includes `chk_paired_general_only` clause `((student_class = 'general_only' AND study_medium = 'general_only') OR (student_class != 'general_only' AND study_medium != 'general_only'))`, plus value list checks on `student_class` and `study_medium`.
* `announcements`: Value list checks on `target_class`, `target_medium`, `status`, and non-negative checks on `total_sent >= 0`, `total_successful >= 0`, `total_failed >= 0`.

### Query 4: Verify Indexes, Partial Predicates & Sort Orders
```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('push_subscriptions', 'announcements')
ORDER BY tablename, indexname;
```
*Expected Result:*
* `push_subscriptions`: `push_subscriptions_pkey`, `push_subscriptions_endpoint_key`, `idx_push_subs_user_id`, `idx_push_subs_active_targeting` (with `WHERE (is_active = true)`).
* `announcements`: `announcements_pkey`, `idx_announcements_status`, `idx_announcements_created_at` (with `created_at DESC`).

### Query 5: Verify Row Level Security (RLS) Enablement
```sql
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('push_subscriptions', 'announcements');
```
*Expected Result:*
* Both `push_subscriptions` and `announcements` return `rowsecurity = true`.

### Query 6: Verify RLS Policies, Commands, Roles & Expressions
```sql
SELECT
    tablename,
    policyname,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('push_subscriptions', 'announcements')
ORDER BY tablename, policyname;
```
*Expected Result:*
* `push_subscriptions`:
  * `"Users can view own push subscriptions"`: `cmd = 'SELECT'`, `roles = {authenticated}`, `using_expression = '(auth.uid() = user_id)'`.
  * `"Users can delete own push subscriptions"`: `cmd = 'DELETE'`, `roles = {authenticated}`, `using_expression = '(auth.uid() = user_id)'`.
* `announcements`:
  * `"Anyone can view sent announcements"`: `cmd = 'SELECT'`, `roles = {public}`, `using_expression = '(status = ''sent''::text)'`.

### Query 7: Verify Effective Table Privileges
```sql
SELECT
    role,
    tablename,
    has_table_privilege(role, 'public.' || tablename, 'SELECT') AS select_priv,
    has_table_privilege(role, 'public.' || tablename, 'INSERT') AS insert_priv,
    has_table_privilege(role, 'public.' || tablename, 'UPDATE') AS update_priv,
    has_table_privilege(role, 'public.' || tablename, 'DELETE') AS delete_priv
FROM
    (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role)
CROSS JOIN
    (VALUES ('push_subscriptions'), ('announcements')) AS tables(tablename)
ORDER BY tablename, role;
```
*Expected Result:*
* `push_subscriptions`:
  * `anon`: `SELECT = false`, `INSERT = false`, `UPDATE = false`, `DELETE = false`
  * `authenticated`: `SELECT = true`, `INSERT = false`, `UPDATE = false`, `DELETE = true`
  * `service_role`: `SELECT = true`, `INSERT = true`, `UPDATE = true`, `DELETE = true`
* `announcements`:
  * `anon`: `SELECT = true`, `INSERT = false`, `UPDATE = false`, `DELETE = false`
  * `authenticated`: `SELECT = true`, `INSERT = false`, `UPDATE = false`, `DELETE = false`
  * `service_role`: `SELECT = true`, `INSERT = true`, `UPDATE = true`, `DELETE = false`

### Query 8: Check Migration Tracking Table State
```sql
SELECT *
FROM supabase_migrations.schema_migrations
WHERE version = '20260201000000';
```
*Expected Result:* `0` rows returned (confirming migration version `20260201000000` is currently unrecorded).

---

## 4. Already Verified vs. Outstanding

Based on task context:

### Already Verified
* `service_role` privileges on `public.push_subscriptions` (`SELECT`, `INSERT`, `UPDATE`, `DELETE` = `true`).
* `service_role` privileges on `public.announcements` (`SELECT`, `INSERT`, `UPDATE` = `true`).
* Absence of version `20260201000000` in `supabase_migrations.schema_migrations` (0 rows returned).

### Outstanding (To be confirmed via Queries 1–7 above)
* Table column data types, nullabilities, and default values.
* Foreign key CASCADE and SET NULL delete rules.
* Check constraints (`chk_paired_general_only`, enum value lists, non-negative counts).
* Index definitions, partial-index predicate (`WHERE is_active = true`), and sort directions (`created_at DESC`).
* RLS enablement (`rowsecurity = true`).
* RLS policy SQL expressions (`auth.uid() = user_id`, `status = 'sent'`).
* Exact privileges for `anon` and `authenticated` roles (confirming `authenticated` has NO direct `INSERT`/`UPDATE` privileges on `push_subscriptions`).

---

## 5. Migration Reconciliation Recommendation

### Safest Supported Method
Once 100% schema equivalence is confirmed via Queries 1–7, use the official Supabase CLI migration repair command:

```bash
supabase migration repair --status applied 20260201000000
```

### Command Behavior
This command inserts a record for version `20260201000000` into `supabase_migrations.schema_migrations` on the target remote database without re-executing the migration DDL SQL statements.

### Preconditions Before Executing Repair
1. **Schema Equivalence Verification:** All 8 verification queries must pass with expected results.
2. **File Alignment:** The migration file `supabase/migrations/20260201000000_push_notifications_foundation.sql` must exist on `main`.
3. **CLI Environment Authentication:** The Supabase CLI must be linked (`supabase link --project-ref <project-id>`) with a valid `SUPABASE_ACCESS_TOKEN`.
4. **Version Absence:** Query 8 must return 0 rows before executing repair.

### Why Alternative Methods Are Disapproved
* **Do NOT rerun the migration file:** The `CREATE POLICY` statements in `20260201000000_push_notifications_foundation.sql` are not idempotent and will crash with policy conflict errors.
* **Do NOT manually insert into `supabase_migrations.schema_migrations` via SQL Editor:** Direct SQL manipulation bypasses CLI state tracking and checksum validation.
* **Do NOT create a duplicate or workaround migration:** Adding a dummy migration introduces schema drift and pollutes migration history.

---

## 6. Risks and Stop Conditions

Do NOT proceed with `supabase migration repair` if any of the following conditions occur:

1. **Stop Condition 1: Schema Discrepancy Found**
   If any query (1 through 7) returns a discrepancy (e.g., missing check constraint `chk_paired_general_only`, missing partial index predicate `WHERE is_active = true`, missing FK CASCADE rule, or incorrect permissions), STOP. Fix the live database schema first via SQL Editor to align with `20260201000000_push_notifications_foundation.sql`.
2. **Stop Condition 2: Version Already Present**
   If Query 8 returns 1 row for version `20260201000000`, STOP. The migration is already recorded.
3. **Stop Condition 3: Insecure Client Privileges**
   If `authenticated` or `anon` roles possess `INSERT` or `UPDATE` privileges on `push_subscriptions`, STOP. Revoke client write privileges before repairing.
4. **Stop Condition 4: Unlinked CLI Environment**
   Executing `supabase db push` instead of `supabase migration repair` in an unlinked environment will attempt to re-run the entire SQL file against production, causing execution failures.
5. **Stop Condition 5: Attempting Manual SQL History Inserts**
   Bypassing the CLI to write directly to `supabase_migrations.schema_migrations` can cause checksum failures on future `supabase db push` invocations.
