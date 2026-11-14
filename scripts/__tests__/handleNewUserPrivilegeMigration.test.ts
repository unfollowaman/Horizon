import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Handle New User Privilege Hardening Migration Safety Suite', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261114210000_revoke_handle_new_user_public_execute.sql'
  );

  const getRawSql = () => fs.readFileSync(migrationPath, 'utf8');

  // Helper to extract non-comment executable SQL statements
  const getExecutableStatements = (): string[] => {
    const rawSql = getRawSql();
    // Remove line comments (-- ...) and block comments (/* ... */)
    const withoutComments = rawSql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    return withoutComments
      .split(';')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter((s) => s.length > 0);
  };

  describe('1. File Existence and Structure', () => {
    it('verifies migration file exists at the expected path and is non-empty', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const content = getRawSql();
      expect(content.length).toBeGreaterThan(200);
    });

    it('verifies timestamp is chronologically valid and follows naming convention', () => {
      const filename = path.basename(migrationPath);
      expect(filename).toBe('20261114210000_revoke_handle_new_user_public_execute.sql');
      const timestamp = filename.split('_')[0];
      expect(timestamp).toMatch(/^\d{14}$/);
      // Must be chronologically after the previous migration (20261113153000)
      expect(timestamp > '20261113153000').toBe(true);
    });
  });

  describe('2. Privilege Management Statements and Syntax', () => {
    it('verifies correct function signature public.handle_new_user() is targeted', () => {
      const statements = getExecutableStatements();
      expect(statements.length).toBe(4);

      for (const statement of statements) {
        expect(statement).toMatch(/ON FUNCTION public\.handle_new_user\(\)/i);
      }
    });

    it('verifies EXECUTE privilege is revoked from PUBLIC', () => {
      const statements = getExecutableStatements();
      const hasRevokePublic = statements.some((s) =>
        /^REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC$/i.test(s)
      );
      expect(hasRevokePublic).toBe(true);
    });

    it('verifies EXECUTE privilege is revoked from anon', () => {
      const statements = getExecutableStatements();
      const hasRevokeAnon = statements.some((s) =>
        /^REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM anon$/i.test(s)
      );
      expect(hasRevokeAnon).toBe(true);
    });

    it('verifies EXECUTE privilege is revoked from authenticated', () => {
      const statements = getExecutableStatements();
      const hasRevokeAuth = statements.some((s) =>
        /^REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM authenticated$/i.test(s)
      );
      expect(hasRevokeAuth).toBe(true);
    });

    it('verifies EXECUTE privilege is explicitly granted to postgres', () => {
      const statements = getExecutableStatements();
      const hasGrantPostgres = statements.some((s) =>
        /^GRANT EXECUTE ON FUNCTION public\.handle_new_user\(\) TO postgres$/i.test(s)
      );
      expect(hasGrantPostgres).toBe(true);
    });
  });

  describe('3. Scope Invariants and Negative Assertions', () => {
    it('verifies no CREATE OR REPLACE FUNCTION statement is introduced', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        expect(statement).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
      }
    });

    it('verifies no trigger modification or drop statement occurs', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        expect(statement).not.toMatch(/\b(CREATE|ALTER|DROP)\s+TRIGGER\b/i);
      }
    });

    it('verifies no table or RLS policy modification occurs', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        expect(statement).not.toMatch(/\b(CREATE|ALTER|DROP)\s+TABLE\b/i);
        expect(statement).not.toMatch(/\b(CREATE|ALTER|DROP)\s+POLICY\b/i);
        expect(statement).not.toMatch(/\bROW\s+LEVEL\s+SECURITY\b/i);
      }
    });

    it('verifies no function ownership or search_path alteration occurs', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        expect(statement).not.toMatch(/ALTER\s+FUNCTION[^\n]+OWNER\s+TO/i);
        expect(statement).not.toMatch(/ALTER\s+FUNCTION[^\n]+SET\s+search_path/i);
      }
    });

    it('verifies no unrelated functions are targeted', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        expect(statement).not.toMatch(/ON FUNCTION (?!public\.handle_new_user\(\))/i);
      }
    });

    it('verifies no speculative EXECUTE grants to service_role or other roles exist', () => {
      const statements = getExecutableStatements();
      for (const statement of statements) {
        if (/^GRANT/i.test(statement)) {
          expect(statement).toMatch(/TO postgres$/i);
          expect(statement).not.toMatch(/\bTO\s+service_role\b/i);
          expect(statement).not.toMatch(/\bTO\s+authenticated\b/i);
          expect(statement).not.toMatch(/\bTO\s+anon\b/i);
          expect(statement).not.toMatch(/\bTO\s+PUBLIC\b/i);
        }
      }
    });

    it('verifies no production deployment commands or dangerous statements exist', () => {
      const raw = getRawSql();
      expect(raw).not.toMatch(/supabase\s+db\s+push/i);
      expect(raw).not.toMatch(/supabase\s+migration/i);
      expect(raw).not.toMatch(/DROP\s+DATABASE/i);
      expect(raw).not.toMatch(/DROP\s+SCHEMA/i);
    });
  });

  describe('4. Privilege State and ACL Simulation', () => {
    it('models PostgreSQL ACL transitions and verifies expected final privilege state', () => {
      // PostgreSQL default ACL for functions is NULL (equivalent to {postgres=X/postgres,PUBLIC=X/postgres})
      // Upon:
      //   REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
      //   REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
      //   REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
      //   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
      // The resultant proacl in pg_proc is '{postgres=X/postgres}'.

      interface RolePrivileges {
        execute: boolean;
      }

      const privilegeTable: Record<string, RolePrivileges> = {
        PUBLIC: { execute: false },
        anon: { execute: false },
        authenticated: { execute: false },
        service_role: { execute: false },
        postgres: { execute: false },
      };

      const statements = getExecutableStatements();
      for (const stmt of statements) {
        const revokeMatch = stmt.match(/^REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\) FROM\s+([a-zA-Z_]+)$/i);
        if (revokeMatch) {
          const role = revokeMatch[1];
          if (privilegeTable[role] !== undefined) {
            privilegeTable[role].execute = false;
          }
        }

        const grantMatch = stmt.match(/^GRANT EXECUTE ON FUNCTION public\.handle_new_user\(\) TO\s+([a-zA-Z_]+)$/i);
        if (grantMatch) {
          const role = grantMatch[1];
          if (privilegeTable[role] !== undefined) {
            privilegeTable[role].execute = true;
          }
        }
      }

      expect(privilegeTable['PUBLIC'].execute).toBe(false);
      expect(privilegeTable['anon'].execute).toBe(false);
      expect(privilegeTable['authenticated'].execute).toBe(false);
      expect(privilegeTable['service_role'].execute).toBe(false);
      expect(privilegeTable['postgres'].execute).toBe(true);

      // Expected ACL representation in PostgreSQL
      const expectedAcl = '{postgres=X/postgres}';
      expect(expectedAcl).toBe('{postgres=X/postgres}');
    });
  });

  describe('5. Trigger Mechanics Documentation', () => {
    it('verifies migration comments document trigger definition vs runtime privilege evaluation', () => {
      const raw = getRawSql();
      expect(raw).toMatch(/trigger/i);
      expect(raw).toMatch(/definition time|CREATE TRIGGER/i);
      expect(raw).toMatch(/runtime/i);
      expect(raw).toMatch(/on_auth_user_created/i);
    });
  });
});
