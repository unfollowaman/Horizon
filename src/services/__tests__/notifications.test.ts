import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getInAppNotifications
} from '../notifications';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('notifications service', () => {
  const originalNotification = window.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalNotification) {
      window.Notification = originalNotification;
    } else {
      // @ts-expect-error cleanup notification property
      delete window.Notification;
    }
  });

  describe('requestNotificationPermission', () => {
    it('returns "denied" if Notification API is not supported in window', async () => {
      // @ts-expect-error property deletion for test
      delete window.Notification;

      const result = await requestNotificationPermission();
      expect(result).toBe('denied');
    });

    it('returns existing permission if already "granted"', async () => {
      const mockRequestPermission = vi.fn();
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: mockRequestPermission
        },
        writable: true,
        configurable: true
      });

      const result = await requestNotificationPermission();
      expect(result).toBe('granted');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('returns existing permission if already "denied"', async () => {
      const mockRequestPermission = vi.fn();
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'denied',
          requestPermission: mockRequestPermission
        },
        writable: true,
        configurable: true
      });

      const result = await requestNotificationPermission();
      expect(result).toBe('denied');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('calls Notification.requestPermission() when permission is "default" and returns result', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission
        },
        writable: true,
        configurable: true
      });

      const result = await requestNotificationPermission();
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      expect(result).toBe('granted');
    });
  });

  describe('subscribeToPushNotifications', () => {
    it('subscribes with a string device token for authenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      const mockRecord = {
        id: 'sub-1',
        user_id: 'user-123',
        endpoint: 'https://push.example.com/device-1',
        device_token: 'https://push.example.com/device-1',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await subscribeToPushNotifications('https://push.example.com/device-1');

      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          endpoint: 'https://push.example.com/device-1',
          device_token: 'https://push.example.com/device-1',
        }),
        { onConflict: 'endpoint' }
      );
      expect(result).toEqual(mockRecord);
    });

    it('subscribes with an object payload for unauthenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const payload = {
        endpoint: 'https://push.example.com/endpoint-xyz',
        keys: { p256dh: 'p256-key', auth: 'auth-key' },
        device_token: 'custom-token',
      };

      const mockRecord = {
        id: 'sub-2',
        user_id: null,
        endpoint: 'https://push.example.com/endpoint-xyz',
        p256dh: 'p256-key',
        auth: 'auth-key',
        device_token: 'custom-token',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await subscribeToPushNotifications(payload);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          endpoint: 'https://push.example.com/endpoint-xyz',
          p256dh: 'p256-key',
          auth: 'auth-key',
          device_token: 'custom-token',
        }),
        { onConflict: 'endpoint' }
      );
      expect(result).toEqual(mockRecord);
    });

    it('handles objects with toJSON() method (e.g. PushSubscription)', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const mockPushSubscription = {
        endpoint: 'https://push.browser.com/sub-999',
        toJSON: () => ({
          endpoint: 'https://push.browser.com/sub-999',
          keys: { p256dh: 'dh-123', auth: 'auth-123' },
        }),
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'sub-3', endpoint: 'https://push.browser.com/sub-999' },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await subscribeToPushNotifications(mockPushSubscription as unknown as PushSubscription);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://push.browser.com/sub-999',
          p256dh: 'dh-123',
          auth: 'auth-123',
        }),
        { onConflict: 'endpoint' }
      );
      expect(result).toBeDefined();
    });

    it('returns null when endpoint is missing and no browser push subscription exists', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await subscribeToPushNotifications();
      expect(result).toBeNull();
    });

    it('returns null if Supabase upsert returns an error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u-1' } },
        error: null,
      } as never);

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database failure' },
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as unknown as ReturnType<typeof supabase.from>);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await subscribeToPushNotifications('https://push.com/token');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('unsubscribeFromPushNotifications', () => {
    it('unsubscribes by string endpoint', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await unsubscribeFromPushNotifications('https://push.example.com/device-1');

      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('endpoint', 'https://push.example.com/device-1');
      expect(result).toBe(true);
    });

    it('unsubscribes by user_id if no endpoint is provided and user is authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as never);

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as unknown as ReturnType<typeof supabase.from>);

      const result = await unsubscribeFromPushNotifications();

      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toBe(true);
    });

    it('returns false if Supabase delete returns an error', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as unknown as ReturnType<typeof supabase.from>);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await unsubscribeFromPushNotifications('https://push.example.com/device-1');
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('getInAppNotifications', () => {
    it('returns empty array when user is unauthenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await getInAppNotifications();
      expect(result).toEqual([]);
    });

    it('returns empty array when user is authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u-1' } },
        error: null,
      } as never);

      const result = await getInAppNotifications();
      expect(result).toEqual([]);
    });
  });
});
