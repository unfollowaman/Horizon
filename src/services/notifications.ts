/**
 * Notification Service
 *
 * Support for browser push notifications, push subscription management via Supabase,
 * and fetching user notifications.
 */

import { supabase } from './supabase';
import type { PushSubscriptionRecord, PushSubscriptionPayload } from '../types';

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  return await Notification.requestPermission();
};

export type PushSubscriptionInput =
  | PushSubscription
  | PushSubscriptionJSON
  | PushSubscriptionPayload
  | { token?: string; endpoint?: string; keys?: { p256dh?: string; auth?: string }; device_token?: string }
  | string;

export const subscribeToPushNotifications = async (
  subscriptionInput?: PushSubscriptionInput | null
): Promise<PushSubscriptionRecord | null> => {
  try {
    let endpoint: string | undefined;
    let p256dh: string | undefined;
    let auth: string | undefined;
    let deviceToken: string | undefined;

    if (typeof subscriptionInput === 'string') {
      endpoint = subscriptionInput;
      deviceToken = subscriptionInput;
    } else if (subscriptionInput && typeof subscriptionInput === 'object') {
      let subJson: PushSubscriptionJSON | PushSubscriptionPayload = subscriptionInput as PushSubscriptionPayload;
      if ('toJSON' in subscriptionInput && typeof (subscriptionInput as PushSubscription).toJSON === 'function') {
        subJson = (subscriptionInput as PushSubscription).toJSON();
      }

      endpoint = subJson.endpoint || (subscriptionInput as { token?: string }).token;
      deviceToken =
        (subscriptionInput as { device_token?: string }).device_token ||
        (subscriptionInput as { token?: string }).token ||
        endpoint;

      if (subJson.keys) {
        p256dh = subJson.keys.p256dh;
        auth = subJson.keys.auth;
      }
    } else if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'serviceWorker' in window.navigator &&
      'PushManager' in window
    ) {
      const registration = await window.navigator.serviceWorker.getRegistration();
      if (registration) {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          const subJson = existingSub.toJSON();
          endpoint = subJson.endpoint;
          deviceToken = endpoint;
          if (subJson.keys) {
            p256dh = subJson.keys.p256dh;
            auth = subJson.keys.auth;
          }
        }
      }
    }

    if (!endpoint) {
      return null;
    }

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    } catch {
      // User auth session optional
    }

    const payload = {
      user_id: userId,
      endpoint,
      p256dh: p256dh || null,
      auth: auth || null,
      device_token: deviceToken || endpoint,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(payload, { onConflict: 'endpoint' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error saving push subscription:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return null;
  }
};

export const unsubscribeFromPushNotifications = async (
  subscriptionInput?: PushSubscriptionInput | null
): Promise<boolean> => {
  try {
    let endpoint: string | undefined;

    if (typeof subscriptionInput === 'string') {
      endpoint = subscriptionInput;
    } else if (subscriptionInput && typeof subscriptionInput === 'object') {
      let subJson: PushSubscriptionJSON | PushSubscriptionPayload = subscriptionInput as PushSubscriptionPayload;
      if ('toJSON' in subscriptionInput && typeof (subscriptionInput as PushSubscription).toJSON === 'function') {
        subJson = (subscriptionInput as PushSubscription).toJSON();
      }
      endpoint = subJson.endpoint || (subscriptionInput as { token?: string }).token;
    }

    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'serviceWorker' in window.navigator &&
      'PushManager' in window
    ) {
      const registration = await window.navigator.serviceWorker.getRegistration();
      if (registration) {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          if (!endpoint || existingSub.endpoint === endpoint) {
            endpoint = existingSub.endpoint;
            await existingSub.unsubscribe();
          }
        }
      }
    }

    if (endpoint) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Error deleting push subscription record:', error);
        return false;
      }
      return true;
    }

    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    } catch {
      // User auth session optional
    }

    if (userId) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting user push subscriptions:', error);
        return false;
      }
      return true;
    }

    return true;
  } catch (err) {
    console.error('Failed to unsubscribe from push notifications:', err);
    return false;
  }
};

export const getInAppNotifications = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return [];
  } catch {
    return [];
  }
};
