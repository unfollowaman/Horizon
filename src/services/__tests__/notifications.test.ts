import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getInAppNotifications
} from '../notifications';

describe('notifications service', () => {
  describe('requestNotificationPermission', () => {
    const originalNotification = window.Notification;

    afterEach(() => {
      if (originalNotification) {
        window.Notification = originalNotification;
      } else {
        // @ts-expect-error cleanup notification property
        delete window.Notification;
      }
    });

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
    it('resolves without error', async () => {
      await expect(subscribeToPushNotifications()).resolves.toBeUndefined();
    });
  });

  describe('unsubscribeFromPushNotifications', () => {
    it('resolves without error', async () => {
      await expect(unsubscribeFromPushNotifications()).resolves.toBeUndefined();
    });
  });

  describe('getInAppNotifications', () => {
    it('returns empty array', async () => {
      const result = await getInAppNotifications();

      expect(result).toEqual([]);
    });
  });
});
