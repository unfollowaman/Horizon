import { supabase } from './supabase';
import type { AnnouncementRow } from '../types';

export type PushErrorCode =
  | 'UNSUPPORTED_BROWSER'
  | 'PERMISSION_DENIED'
  | 'MISSING_VAPID_KEY'
  | 'UNAUTHENTICATED'
  | 'NETWORK_ERROR'
  | 'BACKEND_REJECTION'
  | 'REGISTRATION_FAILED';

export interface PushError {
  code: PushErrorCode;
  message: string;
  status?: number;
  details?: unknown;
}

export interface PushResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: PushError;
  localOnly?: boolean;
}

const EDGE_FUNCTION_URL =
  'https://rhzftlytulgnpodxqzqr.supabase.co/functions/v1/subscribe-push';

const SEND_PUSH_EDGE_FUNCTION_URL =
  'https://rhzftlytulgnpodxqzqr.supabase.co/functions/v1/send-push-notification';

let subscribeInFlightPromise: Promise<PushResult<PushSubscriptionJSON>> | null = null;
let unsubscribeInFlightPromise: Promise<PushResult<void>> | null = null;

export interface SendPushPayload {
  title: string;
  message: string;
  target_class: 'all' | '8' | '9' | '10' | '11' | '12';
  target_medium: 'all' | 'english' | 'hindi';
}

export interface SendPushResponseData {
  success: boolean;
  message?: string;
  error?: string;
  recipient_count?: number;
  total_successful?: number;
  total_failed?: number;
  deactivated_subscriptions?: number;
  announcement_id?: string;
  status?: 'sent' | 'failed';
  persistence_warning?: boolean;
  target?: {
    target_class: string;
    target_medium: string;
  };
}

/**
 * Checks if the browser supports Service Worker, Push API, and Notification API.
 */
export const isPushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    Boolean(navigator.serviceWorker) &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Utility to convert base64 VAPID key string to Uint8Array for PushManager.subscribe()
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Ensures service worker is registered and returns active registration.
 */
export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration> => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js');
  }

  // Wait for the service worker to become active if it is installing/waiting
  if (registration.installing || registration.waiting) {
    await new Promise<void>((resolve) => {
      const worker = registration!.installing || registration!.waiting;
      if (!worker) {
        resolve();
        return;
      }
      const stateChangeHandler = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', stateChangeHandler);
          resolve();
        }
      };
      worker.addEventListener('statechange', stateChangeHandler);
      // Fallback timeout in case statechange listener misses
      setTimeout(resolve, 2000);
    });
  }

  return registration;
};

/**
 * Backwards compatible helper to request notification permission.
 * DOES NOT auto-prompt on module load/mount.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  return await Notification.requestPermission();
};

/**
 * Subscribes user to browser push notifications and syncs subscription with backend Edge Function.
 * Triggered strictly upon explicit user action.
 */
export const subscribeToPushNotifications = async (): Promise<PushResult<PushSubscriptionJSON>> => {
  if (subscribeInFlightPromise) {
    return subscribeInFlightPromise;
  }

  subscribeInFlightPromise = (async () => {
    if (!isPushSupported()) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_BROWSER',
          message: 'Push notifications are not supported in this browser.',
        },
      };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || !vapidPublicKey.trim()) {
      return {
        success: false,
        error: {
          code: 'MISSING_VAPID_KEY',
          message: 'Public VAPID key is not configured in frontend environment.',
        },
      };
    }

    // Request/check user notification permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Notification permission was denied or dismissed by the user.',
        },
      };
    }

    // Get active Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) {
      return {
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User must be authenticated to subscribe to push notifications.',
        },
      };
    }

    const accessToken = sessionData.session.access_token;

    try {
      const registration = await getServiceWorkerRegistration();
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        });
      }

      let subscriptionJson = subscription.toJSON();

      // Send subscription payload to Edge Function
      let response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscription: subscriptionJson,
        }),
      });

      let responseData = await response.json().catch(() => ({}));

      // Auto-recovery for 409 Conflict: local subscription is orphaned (owned by previous account)
      if (!response.ok && response.status === 409) {
        try {
          await subscription.unsubscribe();
          const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource,
          });
          subscriptionJson = subscription.toJSON();

          response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              subscription: subscriptionJson,
            }),
          });
          responseData = await response.json().catch(() => ({}));
        } catch (_retryErr) {
          // If auto-recovery fails, fall through to error handling
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'BACKEND_REJECTION',
            message: responseData.error || `Server responded with HTTP ${response.status}`,
            status: response.status,
            details: responseData,
          },
        };
      }

      return {
        success: true,
        data: subscriptionJson,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: err instanceof TypeError ? 'NETWORK_ERROR' : 'REGISTRATION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to register push subscription.',
          details: err,
        },
      };
    }
  })();

  try {
    return await subscribeInFlightPromise;
  } finally {
    subscribeInFlightPromise = null;
  }
};

/**
 * Unsubscribes current user device from push notifications and deactivates subscription on backend Edge Function.
 */
export const unsubscribeFromPushNotifications = async (): Promise<PushResult<void>> => {
  if (unsubscribeInFlightPromise) {
    return unsubscribeInFlightPromise;
  }

  unsubscribeInFlightPromise = (async () => {
    if (!isPushSupported()) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_BROWSER',
          message: 'Push notifications are not supported in this browser.',
        },
      };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) {
      return {
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User must be authenticated to unsubscribe from push notifications.',
        },
      };
    }

    const accessToken = sessionData.session.access_token;

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return { success: true };
      }

      const endpoint = subscription.endpoint;

      // Call DELETE endpoint on Edge Function
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          endpoint: endpoint,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      const isForbidden = response.status === 403;

      // If backend fails with non-200 and non-403 (e.g. 500 server error, 401, 415), do NOT unsubscribe locally
      if (!response.ok && !isForbidden) {
        return {
          success: false,
          error: {
            code: 'BACKEND_REJECTION',
            message: responseData.error || `Server responded with HTTP ${response.status}`,
            status: response.status,
            details: responseData,
          },
        };
      }

      // Perform local browser unsubscribe after backend confirms deactivation (200) or ownership mismatch (403)
      try {
        const unsubscribed = await subscription.unsubscribe();
        if (unsubscribed === false) {
          return {
            success: false,
            error: {
              code: isForbidden ? 'BACKEND_REJECTION' : 'REGISTRATION_FAILED',
              status: isForbidden ? 403 : undefined,
              message: isForbidden
                ? 'Server rejected request and local subscription could not be removed.'
                : 'Local browser subscription could not be removed.',
            },
          };
        }
      } catch (localErr: unknown) {
        return {
          success: false,
          error: {
            code: isForbidden ? 'BACKEND_REJECTION' : 'REGISTRATION_FAILED',
            status: isForbidden ? 403 : undefined,
            message: localErr instanceof Error ? localErr.message : 'Failed to remove local push subscription.',
            details: localErr,
          },
        };
      }

      if (isForbidden) {
        return { success: true, localOnly: true };
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: err instanceof TypeError ? 'NETWORK_ERROR' : 'REGISTRATION_FAILED',
          message: err instanceof Error ? err.message : 'Failed to unsubscribe push subscription.',
          details: err,
        },
      };
    }
  })();

  try {
    return await unsubscribeInFlightPromise;
  } finally {
    unsubscribeInFlightPromise = null;
  }
};

/**
 * Dispatches a push notification to students via the existing send-push-notification Edge Function.
 * Executed strictly by authenticated administrators.
 */
export const sendPushNotification = async (
  payload: SendPushPayload
): Promise<PushResult<SendPushResponseData>> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    return {
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'User must be authenticated to send push notifications.',
      },
    };
  }

  const accessToken = sessionData.session.access_token;

  try {
    const response = await fetch(SEND_PUSH_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData: SendPushResponseData = await response.json().catch(() => ({ success: false }));

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'BACKEND_REJECTION',
          message: responseData.error || `Server responded with HTTP ${response.status}`,
          status: response.status,
          details: responseData,
        },
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: err instanceof TypeError ? 'NETWORK_ERROR' : 'BACKEND_REJECTION',
        message: err instanceof Error ? err.message : 'Failed to dispatch push notification.',
        details: err,
      },
    };
  }
};

/**
 * Retrieves sent announcement history from public.announcements.
 */
export const fetchAnnouncementHistory = async (): Promise<PushResult<AnnouncementRow[]>> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: {
          code: 'BACKEND_REJECTION',
          message: error.message || 'Failed to fetch announcement history.',
          details: error,
        },
      };
    }

    return {
      success: true,
      data: (data ?? []) as AnnouncementRow[],
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error fetching announcement history.',
        details: err,
      },
    };
  }
};

/**
 * Placeholder for in-app notification list retrieval.
 */
export const getInAppNotifications = async () => {
  return [];
};
