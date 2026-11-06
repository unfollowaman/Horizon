import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 1.2.5: Realtime and Frontend Teardown Specification & Invariants Suite', () => {
  const authServicePath = path.resolve(process.cwd(), 'src/services/auth.ts');
  const authContextPath = path.resolve(process.cwd(), 'src/context/AuthContext.tsx');
  const authListenerPath = path.resolve(process.cwd(), 'src/components/AuthListener.tsx');
  const loginPagePath = path.resolve(process.cwd(), 'src/pages/auth/Login.tsx');
  const usePdfDataPath = path.resolve(process.cwd(), 'src/pages/resources/pdf-viewer/hooks/usePdfData.ts');
  const downloadUtilPath = path.resolve(process.cwd(), 'src/utils/download.ts');
  const authLoginEdgeFnPath = path.resolve(process.cwd(), 'supabase/functions/auth-login/index.ts');

  const EXPECTED_MESSAGE =
    "You've been logged out because your account was signed in on another device or browser.";

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Exact Message Invariant
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Exact Replacement Message Invariant', () => {
    it('verifies exact replacement message is defined in src/services/auth.ts', () => {
      const code = fs.readFileSync(authServicePath, 'utf8');
      expect(code).toContain(EXPECTED_MESSAGE);
      expect(code).toMatch(/export const SESSION_REPLACEMENT_MESSAGE =\s*"You've been logged out because your account was signed in on another device or browser\.";/);
    });

    it('verifies exact replacement message matches auth-login edge function broadcast', () => {
      const code = fs.readFileSync(authLoginEdgeFnPath, 'utf8');
      expect(code).toContain(EXPECTED_MESSAGE);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Realtime Session Replacement Listener
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Realtime Session Replacement Listener Invariants', () => {
    it('verifies private channel topic convention `user:<uid>` in AuthContext', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/topic\s*=\s*`user:\$\{user\.id\}`;/);
      expect(code).toMatch(/supabase\.channel\(topic,\s*\{\s*config:\s*\{\s*private:\s*true/);
    });

    it('verifies listener listens strictly for session_replaced event on broadcast', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/channel\.on\(\s*'broadcast',\s*\{\s*event:\s*'session_replaced'\s*\}/);
    });

    it('verifies malformed and unrelated session events are rejected', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      // Malformed payload validation
      expect(code).toMatch(/if \(!payload \|\| typeof payload !== 'object'\)\s*\{\s*return;/);
      // Replaced session ID matching: protects newer session from stale listener termination
      expect(code).toMatch(/typedPayload\.replaced_session_id !== currentSessionId/);
    });

    it('verifies duplicate subscription prevention during renders and token refreshes', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/subscriptionKey\s*=\s*`\$\{user\.id\}:\$\{currentSessionId\}`;/);
      expect(code).toMatch(/if \(activeSubscriptionKeyRef\.current === subscriptionKey\)\s*\{\s*return;\s*\}/);
    });

    it('verifies channel cleanup on unmount and logout', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/supabase\.removeChannel/);
    });

    it('verifies reconnection fallback check is executed on SUBSCRIBED status', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/status === 'SUBSCRIBED'/);
      expect(code).toMatch(/validateSession\(false\)/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Frontend Session Teardown
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Frontend Session Teardown Invariants', () => {
    it('verifies immediate invalidation of authenticated state and in-flight requests', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      // authVersionRef invalidation
      expect(code).toMatch(/authVersionRef\.current\+\+;/);
      // Immediate clearing of React state
      expect(code).toMatch(/setSession\(null\);/);
      expect(code).toMatch(/setUser\(null\);/);
      expect(code).toMatch(/setProfile\(null\);/);
      expect(code).toMatch(/setSessionReplacementMessage\(message\);/);
    });

    it('verifies duplicate teardown operations are prevented via guard', () => {
      const authServiceCode = fs.readFileSync(authServicePath, 'utf8');
      const authContextCode = fs.readFileSync(authContextPath, 'utf8');
      expect(authServiceCode).toMatch(/let isTeardownInProgress = false;/);
      expect(authServiceCode).toMatch(/if \(isTeardownInProgress\)\s*\{\s*return/);
      expect(authContextCode).toMatch(/if \(teardownInProgressRef\.current\)\s*return;/);
    });

    it('verifies teardown clears user storage while preserving public application state', () => {
      const code = fs.readFileSync(authServicePath, 'utf8');
      expect(code).toMatch(/window\.sessionStorage\.removeItem\('horizon_notif_card_dismissed'\)/);
      // Ensures public reload guard is not cleared
      expect(code).not.toMatch(/removeItem\('chunk_reload_guard'\)/);
    });

    it('verifies teardown uses local sign out without remote deactivation RPC', () => {
      const code = fs.readFileSync(authServicePath, 'utf8');
      expect(code).toMatch(/supabase\.auth\.signOut\(\{\s*scope:\s*'local'\s*\}\)/);
      // teardownSession must NOT call deactivate_active_session because new device owns it
      const teardownBlock = code.slice(code.indexOf('export const teardownSession'));
      expect(teardownBlock).not.toContain('deactivate_active_session');
    });

    it('verifies AuthListener redirects replaced sessions to /login', () => {
      const code = fs.readFileSync(authListenerPath, 'utf8');
      expect(code).toMatch(/navigate\('\/login',\s*\{\s*replace:\s*true,\s*state:\s*\{\s*message/);
    });

    it('verifies Login component displays exact replacement message in role="alert"', () => {
      const code = fs.readFileSync(loginPagePath, 'utf8');
      expect(code).toMatch(/horizon_session_replacement_message/);
      expect(code).toMatch(/role="alert"/);
      expect(code).toMatch(/setError\(replacementMessage\)/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Fallback Security Checks
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Fallback Security Checks Invariants', () => {
    it('verifies window focus and document visibilitychange listeners in AuthContext', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/window\.addEventListener\('focus', onFocus\);/);
      expect(code).toMatch(/document\.addEventListener\('visibilitychange', onVisibilityChange\);/);
      expect(code).toMatch(/window\.removeEventListener\('focus', onFocus\);/);
      expect(code).toMatch(/document\.removeEventListener\('visibilitychange', onVisibilityChange\);/);
    });

    it('verifies rapid focus and visibility checks are throttled to prevent spam', () => {
      const code = fs.readFileSync(authContextPath, 'utf8');
      expect(code).toMatch(/now - lastActiveCheckTimeRef\.current < 5000/);
    });

    it('verifies server-side RPC is authoritative and network errors do not log out', () => {
      const code = fs.readFileSync(authServicePath, 'utf8');
      expect(code).toMatch(/supabase\.rpc\('is_active_session'\)/);
      // When rpcError occurs, do NOT mark as definitively inactive
      expect(code).toMatch(/if \(rpcError\)[\s\S]*?return\s*\{\s*isActive:\s*true,\s*isDefinitivelyInactive:\s*false/);
      // Only explicit false marks as definitively inactive
      expect(code).toMatch(/if \(data === false\)[\s\S]*?return\s*\{\s*isActive:\s*false,\s*isDefinitivelyInactive:\s*true\s*\};/);
    });

    it('verifies protected resource rejection triggers fallback session validation', () => {
      const pdfDataCode = fs.readFileSync(usePdfDataPath, 'utf8');
      const downloadCode = fs.readFileSync(downloadUtilPath, 'utf8');

      expect(pdfDataCode).toMatch(/checkIsActiveSession/);
      expect(pdfDataCode).toMatch(/teardownSession/);
      expect(downloadCode).toMatch(/checkIsActiveSession/);
      expect(downloadCode).toMatch(/teardownSession/);
    });

    it('verifies protected PDF memory and state is safely reset on unmount/teardown', () => {
      const pdfDataCode = fs.readFileSync(usePdfDataPath, 'utf8');
      // When user is null, protected resource signedUrl is wiped
      expect(pdfDataCode).toMatch(/if \(!user\)\s*\{\s*setPdfError\('401_UNAUTHORIZED'\);\s*setSignedUrl\(null\);/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Preservation of Established Single-Device Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Architectural Integrity Preservation', () => {
    it('verifies auth.admin.signOut("others") is nowhere in the codebase', () => {
      const files = [authServicePath, authContextPath, authListenerPath, loginPagePath];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).not.toContain('auth.admin.signOut');
        expect(content).not.toContain('"others"');
      }
    });

    it('verifies no inactivity timeouts or arbitrary maximum session lifetimes were introduced', () => {
      const files = [authServicePath, authContextPath];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).not.toMatch(/INACTIVITY_TIMEOUT/);
        expect(content).not.toMatch(/MAX_SESSION_LIFETIME/);
        expect(content).not.toMatch(/sessionExpiry/);
      }
    });
  });
});
