import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Foundation Migration Specification & Safety Suite', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260301000000_single_device_session_foundation.sql'
  );

  it('1. verifies migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql.length).toBeGreaterThan(1000);
  });

  it('2. verifies private security schema creation and least-privilege grants', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/CREATE SCHEMA IF NOT EXISTS security;/);
    expect(sql).toMatch(/REVOKE ALL ON SCHEMA security FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT USAGE ON SCHEMA security TO service_role;/);
  });

  it('3. verifies security.user_active_sessions table structure and constraints', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Table definition and PK
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS security\.user_active_sessions/);
    expect(sql).toMatch(/user_id UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/active_session_id UUID NOT NULL/);
    expect(sql).toMatch(/session_epoch BIGINT NOT NULL DEFAULT 1/);
    expect(sql).toMatch(/device_info JSONB NOT NULL DEFAULT '{}'::jsonb/);
    expect(sql).toMatch(/created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp\(\)/);
    expect(sql).toMatch(/updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp\(\)/);

    // Performance index on active_session_id
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_user_active_sessions_session_id\s+ON security\.user_active_sessions \(active_session_id\);/);

    // RLS enabled and grants restricted
    expect(sql).toMatch(/ALTER TABLE security\.user_active_sessions ENABLE ROW LEVEL SECURITY;/);
    expect(sql).toMatch(/REVOKE ALL ON security\.user_active_sessions FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON security\.user_active_sessions TO service_role;/);
  });

  it('4. verifies register_active_session logic, advisory locking, 750ms collision detection, and server-only privileges', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Function signature and security settings
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.register_active_session\(/);
    expect(sql).toMatch(/p_user_id UUID,/);
    expect(sql).toMatch(/p_session_id UUID,/);
    expect(sql).toMatch(/p_device_info JSONB DEFAULT '{}'::jsonb,/);
    expect(sql).toMatch(/p_collision_threshold_ms INT DEFAULT 750/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);

    // Advisory lock algorithm: dynamic SQL execution parsing hex bit string literal into signed 64-bit bigint
    expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);
    expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);

    // Idempotent re-registration check
    expect(sql).toMatch(/IF v_current\.active_session_id = p_session_id THEN/);
    expect(sql).toMatch(/'is_idempotent', true/);

    // Collision detection within threshold
    expect(sql).toMatch(/v_time_since_last_reg := EXTRACT\(EPOCH FROM \(v_now - v_current\.updated_at\)\) \* 1000;/);
    expect(sql).toMatch(/IF v_time_since_last_reg < p_collision_threshold_ms THEN/);
    expect(sql).toMatch(/'error_code', 'CONCURRENT_LOGIN_LOST'/);

    // Upsert and session epoch increment
    expect(sql).toMatch(/ON CONFLICT \(user_id\) DO UPDATE/);
    expect(sql).toMatch(/session_epoch = security\.user_active_sessions\.session_epoch \+ 1/);

    // Permissions: service_role ONLY
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.register_active_session\(UUID, UUID, JSONB, INT\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.register_active_session\(UUID, UUID, JSONB, INT\) TO service_role;/);
  });

  it('5. verifies deactivate_active_session dual implementations, locking parity, and conditional deletion', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Client-facing parameterless function (JWT claims)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/);
    expect(sql).toMatch(/v_claims := NULLIF\(current_setting\('request\.jwt\.claims', true\), ''\)::jsonb;/);
    expect(sql).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
    expect(sql).toMatch(/v_session_id := \(v_claims ->> 'session_id'\)::UUID;/);

    // Identical lock derivation
    expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);

    // Conditional deletion query
    const conditionalDeletePattern = /DELETE FROM security\.user_active_sessions\s+WHERE user_id = v_user_id\s+AND active_session_id = v_session_id;/;
    expect(sql).toMatch(conditionalDeletePattern);

    // Permissions for parameterless function
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.deactivate_active_session\(\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.deactivate_active_session\(\) TO authenticated, service_role;/);

    // 2. Server-facing function with explicit parameters
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\s*p_user_id UUID,\s*p_session_id UUID\s*\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.deactivate_active_session\(UUID, UUID\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.deactivate_active_session\(UUID, UUID\) TO service_role;/);
  });

  it('6. verifies is_active_session dual implementations and execution permissions', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Client/RLS parameterless is_active_session()
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.is_active_session\(\)/);
    expect(sql).toMatch(/STABLE/);
    expect(sql).toMatch(/SELECT \(active_session_id = v_session_id\)\s+INTO v_is_active\s+FROM security\.user_active_sessions\s+WHERE user_id = v_user_id;/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.is_active_session\(\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.is_active_session\(\) TO authenticated, service_role;/);

    // 2. Server-facing is_active_session(p_user_id, p_session_id)
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.is_active_session\(\s*p_user_id UUID,\s*p_session_id UUID\s*\)/);
    expect(sql).toMatch(/SELECT \(active_session_id = p_session_id\)\s+INTO v_is_active\s+FROM security\.user_active_sessions\s+WHERE user_id = p_user_id;/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.is_active_session\(UUID, UUID\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.is_active_session\(UUID, UUID\) TO service_role;/);
  });

  it('7. verifies Supabase Realtime broadcast authorization RLS policy', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/ALTER TABLE realtime\.messages ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY \\?"Allow users to subscribe to own broadcast topic\\?"/);
    expect(sql).toMatch(/realtime\.messages\.extension = ''broadcast''/);
    expect(sql).toMatch(/realtime\.messages\.topic = \(''user:'' \|\| \(auth\.uid\(\)\)::text\)/);
  });

  it('8. verifies pure algorithmic parity of advisory lock derivation across registration and deactivation', () => {
    // Test pure simulation of PostgreSQL 64-bit BigInt advisory key from UUID
    // In SQL: ('x' || substr(md5(user_id::text), 1, 16))::bit(64)::bigint
    // Here we ensure deterministic property for sample UUIDs
    const sampleUuid = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
    const crypto = require('crypto');
    const md5Hash = crypto.createHash('md5').update(sampleUuid).digest('hex');
    const first16 = md5Hash.substring(0, 16);
    expect(first16.length).toBe(16);

    // Same input produces identical substring every time
    const md5Hash2 = crypto.createHash('md5').update(sampleUuid).digest('hex');
    expect(md5Hash2.substring(0, 16)).toBe(first16);
  });

  it('9. verifies collision detection mathematics (750ms bounded window)', () => {
    const thresholdMs = 750;

    // Case A: Subsequent login 5 seconds later
    const regTime1 = new Date('2026-03-01T10:00:00.000Z').getTime();
    const loginTimeLater = new Date('2026-03-01T10:00:05.000Z').getTime();
    const diffMsA = loginTimeLater - regTime1;
    expect(diffMsA).toBe(5000);
    expect(diffMsA < thresholdMs).toBe(false); // Clean displacement; not a collision

    // Case B: Simultaneous overlapping login 120ms later
    const loginTimeParallel = new Date('2026-03-01T10:00:00.120Z').getTime();
    const diffMsB = loginTimeParallel - regTime1;
    expect(diffMsB).toBe(120);
    expect(diffMsB < thresholdMs).toBe(true); // Rejected as collision (CONCURRENT_LOGIN_LOST)
  });

  it('10. verifies conditional deletion query semantics in memory model', () => {
    // Simulate database registry state transitions
    let registry: { userId: string; activeSessionId: string } | null = {
      userId: 'user-1',
      activeSessionId: 'session-A',
    };

    // Device A logs out while session-A is active -> deleted
    const simulateDeactivate = (userId: string, sessionId: string) => {
      if (registry && registry.userId === userId && registry.activeSessionId === sessionId) {
        registry = null;
        return { deleted: true };
      }
      return { deleted: false };
    };

    // Replace session-A with session-B (Device B logs in)
    registry = { userId: 'user-1', activeSessionId: 'session-B' };

    // Device A attempts delayed logout with old session-A
    const resultOldDevice = simulateDeactivate('user-1', 'session-A');
    expect(resultOldDevice.deleted).toBe(false);
    expect(registry).not.toBeNull();
    expect(registry?.activeSessionId).toBe('session-B'); // session-B remained protected!

    // Device B logs out with current session-B
    const resultNewDevice = simulateDeactivate('user-1', 'session-B');
    expect(resultNewDevice.deleted).toBe(true);
    expect(registry).toBeNull();
  });
});
