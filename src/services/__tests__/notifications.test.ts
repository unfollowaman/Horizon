import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isPushSupported,
  urlBase64ToUint8Array,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getInAppNotifications,
} from '../notifications';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('notifications service', () => {
  const originalNotification = window.Notification;
  const originalNavigatorSW = navigator.serviceWorker;
  const originalPushManager = window.PushManager;
  const originalFetch = window.fetch;

  const mockVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa_Ib9_Skv69yViEuiBIa_Ib9_Skv69yViEuiBIa0=';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', mockVapidKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalNotification) {
      window.Notification = originalNotification;
    } else {
      // @ts-expect-error test cleanup
      delete window.Notification;
    }

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

    window.fetch = originalFetch;
  });

  describe('isPushSupported', () => {
    it('returns true when serviceWorker, PushManager, and Notification exist', () => {
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
      window.PushManager = vi.fn() as unknown as typeof PushManager;
      window.Notification = vi.fn() as unknown as typeof Notification;

      expect(isPushSupported()).toBe(true);
    });

    it('returns false when serviceWorker is missing', () => {
      Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
      window.PushManager = vi.fn() as unknown as typeof PushManager;
      window.Notification = vi.fn() as unknown as typeof Notification;

      expect(isPushSupported()).toBe(false);
    });
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts url-safe base64 string to Uint8Array', () => {
      const result = urlBase64ToUint8Array('SGVsbG8');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns "denied" if Notification API is not supported in window', async () => {
      // @ts-expect-error test cleanup
      delete window.Notification;

      const result = await requestNotificationPermission();
      expect(result).toBe('denied');
    });

    it('returns existing permission if already "granted"', async () => {
      const mockRequestPermission = vi.fn();
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: mockRequestPermission,
        },
        writable: true,
        configurable: true,
      });

      const result = await requestNotificationPermission();
      expect(result).toBe('granted');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('calls Notification.requestPermission() when permission is "default" and returns result', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        writable: true,
        configurable: true,
      });

      const result = await requestNotificationPermission();
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      expect(result).toBe('granted');
    });
  });

  describe('subscribeToPushNotifications', () => {
    it('returns UNSUPPORTED_BROWSER if push APIs are not supported', async () => {
      // @ts-expect-error test cleanup
      delete window.PushManager;

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: false,
        error: {
          code: 'UNSUPPORTED_BROWSER',
          message: 'Push notifications are not supported in this browser.',
        },
      });
    });

    it('returns MISSING_VAPID_KEY if VITE_VAPID_PUBLIC_KEY is not configured', async () => {
      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
      window.PushManager = vi.fn() as unknown as typeof PushManager;
      window.Notification = vi.fn() as unknown as typeof Notification;

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: false,
        error: {
          code: 'MISSING_VAPID_KEY',
          message: 'Public VAPID key is not configured in frontend environment.',
        },
      });
    });

    it('returns PERMISSION_DENIED if user denies permission', async () => {
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'denied',
          requestPermission: vi.fn().mockResolvedValue('denied'),
        },
        writable: true,
        configurable: true,
      });

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Notification permission was denied or dismissed by the user.',
        },
      });
    });

    it('returns UNAUTHENTICATED if Supabase session is missing or invalid', async () => {
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User must be authenticated to subscribe to push notifications.',
        },
      });
    });

    it('successfully subscribes and sends POST request to Edge Function', async () => {
      const mockSubscriptionJson = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        keys: { p256dh: 'mockP256dhKey', auth: 'mockAuthKey' },
      };

      const mockPushSubscription = {
        toJSON: () => mockSubscriptionJson,
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
      };

      const mockRegistration = {
        pushManager: mockPushManager,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
          register: vi.fn().mockResolvedValue(mockRegistration),
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
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Push subscription updated successfully' }),
      });
      window.fetch = mockFetch;

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: true,
        data: mockSubscriptionJson,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rhzftlytulgnpodxqzqr.supabase.co/functions/v1/subscribe-push',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token',
          },
          body: JSON.stringify({ subscription: mockSubscriptionJson }),
        }
      );
    });

    it('handles 409 Conflict auto-recovery by unsubscribing orphaned local subscription and resubscribing', async () => {
      const oldSubJson = { endpoint: 'https://fcm.googleapis.com/fcm/send/old-token', keys: { p256dh: 'old-p256', auth: 'old-auth' } };
      const newSubJson = { endpoint: 'https://fcm.googleapis.com/fcm/send/new-token', keys: { p256dh: 'new-p256', auth: 'new-auth' } };

      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const oldSubscription = {
        toJSON: () => oldSubJson,
        unsubscribe: mockUnsubscribe,
      };
      const newSubscription = {
        toJSON: () => newSubJson,
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe: vi.fn().mockResolvedValue(newSubscription),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: mockPushManager }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn()
        // First POST returns 409 Conflict
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({ success: false, error: 'Push subscription endpoint already registered to another account' }),
        })
        // Second POST after auto-recovery succeeds with 200 OK
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Push subscription updated successfully' }),
        });
      window.fetch = mockFetch;

      const result = await subscribeToPushNotifications();

      expect(result).toEqual({
        success: true,
        data: newSubJson,
      });
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockPushManager.subscribe).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent subscribeToPushNotifications calls using subscribeInFlightPromise', async () => {
      let resolveFetch: (val: unknown) => void = () => {};
      const pendingFetch = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      const mockPushSubscription = {
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test-token', keys: { p256dh: 'a', auth: 'b' } }),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn().mockImplementation(() => pendingFetch);
      window.fetch = mockFetch;

      // Trigger two concurrent subscriptions
      const promise1 = subscribeToPushNotifications();
      const promise2 = subscribeToPushNotifications();

      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const [res1, res2] = await Promise.all([promise1, promise2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles 409 Conflict auto-recovery failure when retry re-subscription fails', async () => {
      const oldSubJson = { endpoint: 'https://fcm.googleapis.com/fcm/send/old-token', keys: { p256dh: 'old-p256', auth: 'old-auth' } };

      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const oldSubscription = {
        toJSON: () => oldSubJson,
        unsubscribe: mockUnsubscribe,
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe: vi.fn().mockRejectedValue(new Error('Browser PushManager subscribe failed')),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: mockPushManager }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ success: false, error: 'Push subscription endpoint already registered to another account' }),
      });
      window.fetch = mockFetch;

      const result = await subscribeToPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BACKEND_REJECTION');
      expect(result.error?.status).toBe(409);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('handles service worker registration promise rejection in getServiceWorkerRegistration', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockRejectedValue(new Error('Service worker registration failed')),
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
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const result = await subscribeToPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toBe('Service worker registration failed');
    });

    it('handles network failures during subscribe fetch', async () => {
      const mockPushSubscription = {
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test-token', keys: { p256dh: 'a', auth: 'b' } }),
      };

      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(mockPushSubscription),
        },
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue(mockRegistration) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await subscribeToPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('unsubscribeFromPushNotifications', () => {
    it('verifies explicit backend-first execution order before calling PushSubscription.unsubscribe()', async () => {
      const executionOrder: string[] = [];

      const mockUnsubscribe = vi.fn().mockImplementation(async () => {
        executionOrder.push('local_unsubscribe');
        return true;
      });

      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: mockUnsubscribe,
      };

      const mockRegistration = {
        pushManager: {
          getSubscription: vi.fn().mockImplementation(async () => {
            executionOrder.push('get_subscription');
            return mockPushSubscription;
          }),
        },
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue(mockRegistration) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn().mockImplementation(async () => {
        executionOrder.push('backend_fetch_delete');
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: 'Push subscription deactivated successfully' }),
        };
      });
      window.fetch = mockFetch;

      const result = await unsubscribeFromPushNotifications();

      expect(result).toEqual({ success: true });
      expect(executionOrder).toEqual(['get_subscription', 'backend_fetch_delete', 'local_unsubscribe']);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('handles backend HTTP 500 server error by keeping local subscription intact and returning error', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: mockUnsubscribe,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Internal server error' }),
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BACKEND_REJECTION');
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });

    it('handles backend network failure during unsubscribe fetch without unsubscribing locally', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: mockUnsubscribe,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });

    it('handles 403 Forbidden on unsubscribe by cleaning up local subscription and returning localOnly=true', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true);
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/orphaned-token',
        unsubscribe: mockUnsubscribe,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Forbidden: Cannot deactivate a subscription owned by another user' }),
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result).toEqual({ success: true, localOnly: true });
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('returns error when 403 Forbidden is returned and local subscription removal fails', async () => {
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/orphaned-token',
        unsubscribe: vi.fn().mockResolvedValue(false),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Forbidden' }),
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BACKEND_REJECTION');
      expect(result.error?.status).toBe(403);
    });

    it('handles local unsubscribe() promise rejection cleanly', async () => {
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: vi.fn().mockRejectedValue(new Error('Browser PushManager error')),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toBe('Browser PushManager error');
    });

    it('handles local unsubscribe() returning false cleanly', async () => {
      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: vi.fn().mockResolvedValue(false),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      window.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRATION_FAILED');
      expect(result.error?.message).toBe('Local browser subscription could not be removed.');
    });

    it('returns success idempotently when local subscription is missing', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const result = await unsubscribeFromPushNotifications();

      expect(result).toEqual({ success: true });
    });

    it('deduplicates concurrent unsubscribe requests using unsubscribeInFlightPromise', async () => {
      let resolveFetch: (val: unknown) => void = () => {};
      const pendingFetch = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      const mockPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(mockPushSubscription) } }) },
        configurable: true,
      });

      window.PushManager = vi.fn() as unknown as typeof PushManager;
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'granted' },
        writable: true,
        configurable: true,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        // @ts-expect-error simplified session mock
        data: { session: { access_token: 'mock-jwt-token' } },
        error: null,
      });

      const mockFetch = vi.fn().mockImplementation(() => pendingFetch);
      window.fetch = mockFetch;

      const promise1 = unsubscribeFromPushNotifications();
      const promise2 = unsubscribeFromPushNotifications();

      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const [res1, res2] = await Promise.all([promise1, promise2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInAppNotifications', () => {
    it('returns empty array', async () => {
      const result = await getInAppNotifications();
      expect(result).toEqual([]);
    });
  });
});
