import { describe, it, expect } from 'vitest';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getInAppNotifications
} from '../notifications';

describe('notifications service', () => {
  describe('requestNotificationPermission', () => {
    it('returns "default"', async () => {
      const result = await requestNotificationPermission();

      expect(result).toBe('default');
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
