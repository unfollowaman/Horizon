import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getBaseSupabaseUrl,
  getSubscribePushUrl,
  getSendPushUrl,
  sendPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../notifications';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const PRODUCTION_PROJECT_REF = 'rhzftlytulgnpodxqzqr';
const PRODUCTION_URL = 'https://rhzftlytulgnpodxqzqr.supabase.co';

describe('notifications service: URL derivation & environment isolation', () => {
  const originalFetch = window.fetch;
  const originalNavigatorSW = navigator.serviceWorker;
  const originalPushManager = window.PushManager;
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.fetch = originalFetch;

    if (originalNavigatorSW) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalNavigatorSW,
        writable: true,
        configurable: true,
      });
    }

    if (originalPushManager) {
      window.PushManager = originalPushManager;
    } else {
      // @ts-expect-error test cleanup
      delete window.PushManager;
    }

    if (originalNotification) {
      window.Notification = originalNotification;
    } else {
      // @ts-expect-error test cleanup
      delete window.Notification;
    }
  });

  describe('getBaseSupabaseUrl: URL sanitization and normalization', () => {
    it('returns sanitized base URL when VITE_SUPABASE_URL has no trailing slash', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co');
      expect(getBaseSupabaseUrl()).toBe('https://custom-project.supabase.co');
    });

    it('strips single trailing slash cleanly', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co/');
      expect(getBaseSupabaseUrl()).toBe('https://custom-project.supabase.co');
    });

    it('strips multiple trailing slashes cleanly', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://custom-project.supabase.co///');
      expect(getBaseSupabaseUrl()).toBe('https://custom-project.supabase.co');
    });

    it('trims leading and trailing whitespace around URL', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '   https://custom-project.supabase.co/   ');
      expect(getBaseSupabaseUrl()).toBe('https://custom-project.supabase.co');
    });

    it('supports local development Supabase origin with port', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
      expect(getBaseSupabaseUrl()).toBe('http://localhost:54321');
    });

    it('supports local development IPv4 origin with port and trailing slash', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321/');
      expect(getBaseSupabaseUrl()).toBe('http://127.0.0.1:54321');
    });

    it('supports preview deployment URLs', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://preview-pr-123.supabase.co');
      expect(getBaseSupabaseUrl()).toBe('https://preview-pr-123.supabase.co');
    });

    it('supports production Supabase URLs', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://rhzftlytulgnpodxqzqr.supabase.co');
      expect(getBaseSupabaseUrl()).toBe('https://rhzftlytulgnpodxqzqr.supabase.co');
    });
  });

  describe('getBaseSupabaseUrl: strict URL structure validation', () => {
    it('throws clear configuration error when VITE_SUPABASE_URL is undefined', () => {
      vi.unstubAllEnvs();
      delete (import.meta.env as Record<string, unknown>).VITE_SUPABASE_URL;

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Missing required VITE_SUPABASE_URL environment variable'
      );
    });

    it('throws clear configuration error when VITE_SUPABASE_URL is empty string', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Missing required VITE_SUPABASE_URL environment variable'
      );
    });

    it('throws clear configuration error when VITE_SUPABASE_URL is whitespace only', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '    ');

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Missing required VITE_SUPABASE_URL environment variable'
      );
    });

    it('throws clear error when VITE_SUPABASE_URL is a malformed URL', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'not-a-valid-url');

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Invalid VITE_SUPABASE_URL environment variable: "not-a-valid-url" is not a valid URL'
      );
    });

    it('throws clear error when VITE_SUPABASE_URL uses unsupported protocol (ftp:)', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'ftp://custom-project.supabase.co');

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Invalid VITE_SUPABASE_URL environment variable: protocol must be http: or https: (received ftp:)'
      );
    });

    it('throws clear error when VITE_SUPABASE_URL uses script protocol', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'javascript:alert(1)');

      expect(() => getBaseSupabaseUrl()).toThrowError(
        'Invalid VITE_SUPABASE_URL environment variable: protocol must be http: or https: (received javascript:)'
      );
    });

    it('throws clear error when VITE_SUPABASE_URL contains username or password credentials', () => {
      const credentialsUrls = [
        'https://user:pass@custom-project.supabase.co',
        'https://user@custom-project.supabase.co',
        'http://admin:secret@localhost:54321',
      ];

      for (const url of credentialsUrls) {
        vi.stubEnv('VITE_SUPABASE_URL', url);
        expect(() => getBaseSupabaseUrl()).toThrowError(
          'Invalid VITE_SUPABASE_URL environment variable: URL must not contain username or password credentials'
        );
      }
    });

    it('throws clear error when VITE_SUPABASE_URL contains query parameters', () => {
      const queryUrls = [
        'https://custom-project.supabase.co?token=123',
        'https://custom-project.supabase.co/?apiKey=abc&env=test',
        'http://localhost:54321?filter=true',
      ];

      for (const url of queryUrls) {
        vi.stubEnv('VITE_SUPABASE_URL', url);
        expect(() => getBaseSupabaseUrl()).toThrowError(
          'Invalid VITE_SUPABASE_URL environment variable: URL must not contain query parameters'
        );
      }
    });

    it('throws clear error when VITE_SUPABASE_URL contains a fragment', () => {
      const fragmentUrls = [
        'https://custom-project.supabase.co#section',
        'https://custom-project.supabase.co/#header',
        'http://localhost:54321#token',
      ];

      for (const url of fragmentUrls) {
        vi.stubEnv('VITE_SUPABASE_URL', url);
        expect(() => getBaseSupabaseUrl()).toThrowError(
          'Invalid VITE_SUPABASE_URL environment variable: URL must not contain a fragment'
        );
      }
    });

    it('throws clear error when VITE_SUPABASE_URL contains a non-root pathname', () => {
      const nonRootUrls = [
        'https://custom-project.supabase.co/api',
        'https://custom-project.supabase.co/custom/path',
        'https://custom-project.supabase.co/v1/auth/',
        'http://localhost:54321/api/v1',
      ];

      for (const url of nonRootUrls) {
        vi.stubEnv('VITE_SUPABASE_URL', url);
        expect(() => getBaseSupabaseUrl()).toThrowError(
          /URL must not contain a non-root pathname/
        );
      }
    });

    it('NEVER resolves to production Supabase URL under missing or invalid configurations', () => {
      const invalidConfigs = [
        '',
        '   ',
        'not-a-url',
        'ftp://supabase.co',
        'http://',
        'https://user:pass@other.supabase.co',
        'https://other.supabase.co?query=1',
        'https://other.supabase.co#fragment',
        'https://other.supabase.co/subpath',
      ];

      for (const config of invalidConfigs) {
        vi.stubEnv('VITE_SUPABASE_URL', config);
        let resultUrl = '';
        try {
          resultUrl = getBaseSupabaseUrl();
        } catch {
          // Expected to throw
        }

        expect(resultUrl).not.toBe(PRODUCTION_URL);
        expect(resultUrl).not.toContain(PRODUCTION_PROJECT_REF);
      }
    });
  });

  describe('Edge Function URL construction', () => {
    it('constructs subscribe-push endpoint without double slashes', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321/');
      expect(getSubscribePushUrl()).toBe('http://127.0.0.1:54321/functions/v1/subscribe-push');
    });

    it('constructs send-push-notification endpoint without double slashes', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321/');
      expect(getSendPushUrl()).toBe('http://127.0.0.1:54321/functions/v1/send-push-notification');
    });

    it('fails immediately when building Edge Function URLs with missing or invalid VITE_SUPABASE_URL', () => {
      const badEnvs = [
        '',
        'https://custom.supabase.co/non-root',
        'https://user:pass@custom.supabase.co',
        'https://custom.supabase.co?query=1',
      ];

      for (const badEnv of badEnvs) {
        vi.stubEnv('VITE_SUPABASE_URL', badEnv);
        expect(() => getSubscribePushUrl()).toThrow();
        expect(() => getSendPushUrl()).toThrow();
      }
    });
  });

  describe('Fail-closed safety: operations never contact production on missing or invalid configuration', () => {
    it('fails sendPushNotification with explicit error and zero fetch calls when VITE_SUPABASE_URL is missing', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'test-admin-token',
            user: { id: 'admin-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn();
      window.fetch = mockFetch;

      const result = await sendPushNotification({
        title: 'Important Alert',
        message: 'Physics test tomorrow',
        target_class: '12',
        target_medium: 'english',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Missing required VITE_SUPABASE_URL environment variable');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fails sendPushNotification with explicit error and zero fetch calls when VITE_SUPABASE_URL has non-root path or query', async () => {
      const invalidUrls = [
        'https://custom.supabase.co/invalid-path',
        'https://user:pass@custom.supabase.co',
        'https://custom.supabase.co?search=1',
      ];

      for (const invalidUrl of invalidUrls) {
        vi.stubEnv('VITE_SUPABASE_URL', invalidUrl);

        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
          data: {
            session: {
              access_token: 'test-admin-token',
              user: { id: 'admin-id' },
            } as never,
          },
          error: null,
        });

        const mockFetch = vi.fn();
        window.fetch = mockFetch;

        const result = await sendPushNotification({
          title: 'Alert',
          message: 'Test message',
          target_class: '12',
          target_medium: 'english',
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Invalid VITE_SUPABASE_URL environment variable');
        expect(mockFetch).not.toHaveBeenCalled();
      }
    });

    it('fails subscribeToPushNotifications with explicit error and zero fetch calls when VITE_SUPABASE_URL is missing', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa_Ib9_Skv69yViEuiBIa_Ib9_Skv69yViEuiBIa0=');

      const mockPushSubscription = {
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'k1', auth: 'k2' } }),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockPushSubscription),
            },
          }),
        },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-user-token',
            user: { id: 'user-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn();
      window.fetch = mockFetch;

      const result = await subscribeToPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toContain('Missing required VITE_SUPABASE_URL environment variable');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fails subscribeToPushNotifications with explicit error and zero fetch calls when VITE_SUPABASE_URL contains credentials', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://user:pass@custom.supabase.co');
      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa_Ib9_Skv69yViEuiBIa_Ib9_Skv69yViEuiBIa0=');

      const mockPushSubscription = {
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'k1', auth: 'k2' } }),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockPushSubscription),
            },
          }),
        },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-user-token',
            user: { id: 'user-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn();
      window.fetch = mockFetch;

      const result = await subscribeToPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toContain('URL must not contain username or password credentials');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fails unsubscribeFromPushNotifications with explicit error and zero fetch calls when VITE_SUPABASE_URL is missing', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/test-endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockPushSubscription),
            },
          }),
        },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-user-token',
            user: { id: 'user-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn();
      window.fetch = mockFetch;

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toContain('Missing required VITE_SUPABASE_URL environment variable');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fails unsubscribeFromPushNotifications with explicit error and zero fetch calls when VITE_SUPABASE_URL contains query parameters', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://custom.supabase.co/?malicious=true');

      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/test-endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockPushSubscription),
            },
          }),
        },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-user-token',
            user: { id: 'user-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn();
      window.fetch = mockFetch;

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toContain('URL must not contain query parameters');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Environment isolation in dispatch operations', () => {
    it('dispatches sendPushNotification to environment-configured Supabase URL', async () => {
      const customEnvUrl = 'https://staging-project.supabase.co';
      vi.stubEnv('VITE_SUPABASE_URL', customEnvUrl);

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'valid-test-token',
            user: { id: 'admin-user-id' },
          } as never,
        },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, recipient_count: 5 }),
      });
      window.fetch = mockFetch;

      const payload = {
        title: 'New Chapter Available',
        message: 'Check out Chapter 4',
        target_class: '10' as const,
        target_medium: 'english' as const,
      };

      const result = await sendPushNotification(payload);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://staging-project.supabase.co/functions/v1/send-push-notification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-test-token',
          },
          body: JSON.stringify(payload),
        }
      );
      expect(mockFetch.mock.calls[0][0]).not.toContain(PRODUCTION_PROJECT_REF);
    });
  });
});
