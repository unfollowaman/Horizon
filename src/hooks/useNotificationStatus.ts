import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushResult,
} from '../services/notifications';

export const PUSH_STATUS_EVENT = 'horizon-push-status-changed';

export function dispatchPushStatusChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PUSH_STATUS_EVENT));
  }
}

export interface UseNotificationStatusReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  enableNotifications: () => Promise<PushResult<PushSubscriptionJSON>>;
  disableNotifications: () => Promise<PushResult<void>>;
  refreshStatus: () => Promise<void>;
}

export function useNotificationStatus(): UseNotificationStatusReturn {
  const [isSupported, setIsSupported] = useState<boolean>(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const refreshStatus = useCallback(async () => {
    if (!isPushSupported()) {
      if (isMountedRef.current) {
        setIsSupported(false);
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsSupported(true);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        if (isMountedRef.current) {
          setIsSubscribed(false);
          setIsLoading(false);
        }
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (isMountedRef.current) {
        setIsSubscribed(!!sub);
        setIsLoading(false);
      }
    } catch {
      if (isMountedRef.current) {
        setIsSubscribed(false);
        setIsLoading(false);
      }
    }
  }, []);

  const enableNotifications = useCallback(async (): Promise<PushResult<PushSubscriptionJSON>> => {
    if (inFlightRef.current) {
      return { success: false, error: { code: 'REGISTRATION_FAILED', message: 'Registration in progress' } };
    }
    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        if (isMountedRef.current) {
          setIsSubscribed(true);
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
          }
        }
        dispatchPushStatusChanged();
      } else {
        if (isMountedRef.current && typeof window !== 'undefined' && 'Notification' in window) {
          setPermission(Notification.permission);
        }
      }
      return res;
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const disableNotifications = useCallback(async (): Promise<PushResult<void>> => {
    if (inFlightRef.current) {
      return { success: false, error: { code: 'NETWORK_ERROR', message: 'Operation in progress' } };
    }
    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const res = await unsubscribeFromPushNotifications();
      if (res.success) {
        if (isMountedRef.current) {
          setIsSubscribed(false);
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
          }
        }
        dispatchPushStatusChanged();
      }
      return res;
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshStatus();

    const handleSync = () => {
      refreshStatus();
    };

    window.addEventListener(PUSH_STATUS_EVENT, handleSync);
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(PUSH_STATUS_EVENT, handleSync);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [refreshStatus]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    enableNotifications,
    disableNotifications,
    refreshStatus
  };
}
