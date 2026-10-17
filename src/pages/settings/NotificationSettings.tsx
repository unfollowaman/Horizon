import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../../services/notifications';

interface StatusFeedback {
  type: 'success' | 'error' | 'info';
  text: string;
}

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [isSupported] = useState<boolean>(() => isPushSupported());
  const [isVapidConfigured] = useState<boolean>(() =>
    Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY && import.meta.env.VITE_VAPID_PUBLIC_KEY.trim().length > 0)
  );

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback | null>(null);

  // Sync current service worker push subscription state on mount / user change
  const refreshSubscriptionStatus = useCallback(async () => {
    if (!isSupported) {
      if (isMountedRef.current) setIsLoadingStatus(false);
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPerm = Notification.permission;
      if (isMountedRef.current) setPermission(currentPerm);

      if (currentPerm === 'granted' && user) {
        try {
          const registration = await navigator.serviceWorker?.getRegistration();
          const sub = await registration?.pushManager?.getSubscription();
          if (isMountedRef.current) setIsSubscribed(Boolean(sub));
        } catch {
          if (isMountedRef.current) setIsSubscribed(false);
        }
      } else {
        if (isMountedRef.current) setIsSubscribed(false);
      }
    }
    if (isMountedRef.current) setIsLoadingStatus(false);
  }, [isSupported, user]);

  useEffect(() => {
    refreshSubscriptionStatus();

    const handleWindowFocus = () => {
      refreshSubscriptionStatus();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [refreshSubscriptionStatus]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleTogglePush = async () => {
    // Synchronous in-flight guard against rapid duplicate clicks before React re-render
    if (inFlightRef.current || isProcessing || isLoadingStatus) return;

    if (isMountedRef.current) setStatusFeedback(null);

    if (!user) {
      if (isMountedRef.current) {
        setStatusFeedback({
          type: 'error',
          text: 'Please sign in to manage push notification preferences.',
        });
      }
      return;
    }

    if (!isSupported) {
      if (isMountedRef.current) {
        setStatusFeedback({
          type: 'error',
          text: 'Push notifications are not supported in your browser.',
        });
      }
      return;
    }

    if (!isVapidConfigured) {
      if (isMountedRef.current) {
        setStatusFeedback({
          type: 'error',
          text: 'Push notification service is currently unavailable.',
        });
      }
      return;
    }

    if (permission === 'denied') {
      if (isMountedRef.current) {
        setStatusFeedback({
          type: 'info',
          text: 'Notification permission is blocked in your browser settings. To enable alerts, please update your browser site settings.',
        });
      }
      return;
    }

    inFlightRef.current = true;
    if (isMountedRef.current) setIsProcessing(true);

    try {
      if (!isSubscribed) {
        // Subscribe user to push notifications
        const result = await subscribeToPushNotifications();

        if (typeof window !== 'undefined' && 'Notification' in window && isMountedRef.current) {
          setPermission(Notification.permission);
        }

        if (!isMountedRef.current) return;

        if (result.success) {
          setIsSubscribed(true);
          setStatusFeedback({
            type: 'success',
            text: 'Push notifications enabled successfully! You will now receive real-time alerts for new resources and announcements.',
          });
        } else {
          setIsSubscribed(false);
          const code = result.error?.code;
          let msg = 'Unable to enable push notifications. Please try again.';

          if (code === 'PERMISSION_DENIED') {
            msg = 'Notification permission was dismissed or denied.';
          } else if (code === 'UNAUTHENTICATED') {
            msg = 'Please sign in to manage push notification preferences.';
          } else if (code === 'MISSING_VAPID_KEY') {
            msg = 'Push notification service is currently unavailable.';
          } else if (code === 'NETWORK_ERROR') {
            msg = 'Network error during push notification registration. Please check your connection and try again.';
          } else if (code === 'BACKEND_REJECTION') {
            msg = 'Server rejection during registration. Please try again later.';
          }

          setStatusFeedback({
            type: 'error',
            text: msg,
          });
        }
      } else {
        // Unsubscribe user from push notifications
        const result = await unsubscribeFromPushNotifications();

        if (!isMountedRef.current) return;

        if (result.success) {
          setIsSubscribed(false);
          setStatusFeedback({
            type: 'info',
            text: 'Push notifications disabled.',
          });
        } else {
          setStatusFeedback({
            type: 'error',
            text: 'Unable to disable push notifications. Please try again.',
          });
        }
      }
    } catch (_err) {
      if (isMountedRef.current) {
        setStatusFeedback({
          type: 'error',
          text: 'An unexpected error occurred while updating push notification settings. Please try again.',
        });
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Determine label & subtitle for push section
  const getPushStateDetails = () => {
    if (!user) {
      return {
        badge: 'Sign in required',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        actionText: 'Sign In to Enable',
        isToggleDisabled: true,
      };
    }
    if (!isSupported) {
      return {
        badge: 'Not supported',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
        actionText: 'Unsupported Browser',
        isToggleDisabled: true,
      };
    }
    if (!isVapidConfigured) {
      return {
        badge: 'Unavailable',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        actionText: 'Service Unavailable',
        isToggleDisabled: true,
      };
    }
    if (permission === 'denied') {
      return {
        badge: 'Blocked in browser',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
        actionText: 'Blocked in Browser',
        isToggleDisabled: true,
      };
    }
    if (permission === 'granted' && !isSubscribed) {
      return {
        badge: 'Registration pending',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        actionText: 'Complete Setup',
        isToggleDisabled: false,
      };
    }
    if (isSubscribed) {
      return {
        badge: 'Active',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        actionText: 'Push Notifications Enabled',
        isToggleDisabled: false,
      };
    }
    return {
      badge: 'Disabled',
      badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      actionText: 'Enable Push Notifications',
      isToggleDisabled: false,
    };
  };

  const stateDetails = getPushStateDetails();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Navigation Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center shrink-0 cursor-pointer text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
          aria-label="Go Back"
          title="Go Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div>
          <span className="text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
            Account Settings
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase text-ink leading-tight">
            Notification Settings
          </h1>
        </div>
      </div>

      <p className="text-sm sm:text-body1 text-ink/80 leading-relaxed">
        Configure how you receive updates and study alerts across your devices.
      </p>

      {/* Push Notifications Card */}
      <section className="neu-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">Push Notifications</h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stateDetails.badgeColor}`}
            >
              {stateDetails.badge}
            </span>
          </div>
        </div>

        <p className="text-sm text-ink/70 leading-relaxed">
          Receive real-time alerts on your device whenever new study notes, PYQ papers, or important class announcements are published for your class.
        </p>

        {/* Status Feedback Banner */}
        {statusFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl text-sm font-medium leading-normal flex items-start gap-2.5 ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                : statusFeedback.type === 'error'
                ? 'bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/20'
                : 'bg-[#E91E8C]/10 text-ink dark:text-gray-200 border border-[#E91E8C]/20'
            }`}
          >
            <span className="shrink-0 mt-0.5" aria-hidden="true">
              {statusFeedback.type === 'success' ? '✓' : statusFeedback.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex-1">{statusFeedback.text}</div>
          </div>
        )}

        {/* Denied Permission Helper Notice */}
        {permission === 'denied' && (
          <div className="p-3.5 rounded-xl text-xs sm:text-sm bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 leading-relaxed space-y-1">
            <p className="font-semibold">How to enable browser notifications:</p>
            <p>
              Click the lock/settings icon next to the URL in your browser address bar, set <strong>Notifications</strong> to <strong>Allow</strong>, and refresh this page.
            </p>
          </div>
        )}

        {/* Signed Out Helper Notice */}
        {!user && (
          <div className="p-3.5 rounded-xl text-xs sm:text-sm bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>You must be signed in to manage push notification preferences.</span>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#E91E8C] hover:bg-[#C2185B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Interactive Opt-in Control */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              id="push-notifications-toggle"
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              aria-label="Toggle Push Notifications"
              disabled={stateDetails.isToggleDisabled || isProcessing || isLoadingStatus}
              onClick={handleTogglePush}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                isSubscribed ? 'bg-[#E91E8C]' : 'bg-gray-300 dark:bg-gray-700'
              } ${stateDetails.isToggleDisabled || isProcessing || isLoadingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isSubscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <label
              htmlFor="push-notifications-toggle"
              className={`text-sm font-semibold text-ink/90 select-none ${
                stateDetails.isToggleDisabled || isProcessing || isLoadingStatus ? 'cursor-not-allowed text-ink/60' : 'cursor-pointer'
              }`}
              onClick={() => {
                if (!stateDetails.isToggleDisabled && !isProcessing && !isLoadingStatus) {
                  handleTogglePush();
                }
              }}
            >
              {stateDetails.actionText}
            </label>
          </div>

          {/* Action Button for Explicit Opt-In / Unsubscribe */}
          {user && isSupported && isVapidConfigured && permission !== 'denied' && (
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={isProcessing || isLoadingStatus}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                isSubscribed
                  ? 'neu-raised neu-raised-hover text-ink/80 hover:text-ink'
                  : 'bg-[#E91E8C] text-white hover:bg-[#C2185B] shadow-md hover:shadow-lg'
              } ${isProcessing || isLoadingStatus ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isProcessing
                ? 'Processing...'
                : isSubscribed
                ? 'Disable Notifications'
                : permission === 'granted'
                ? 'Complete Setup'
                : 'Enable Push Notifications'}
            </button>
          )}
        </div>
      </section>

      {/* Email Preferences Card */}
      <section className="neu-card rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-ink">Email Preferences</h2>
        <ul className="space-y-3 list-none p-0 m-0">
          <li className="flex items-center gap-3">
            <input
              id="email-announcements-toggle"
              type="checkbox"
              disabled
              checked
              readOnly
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label
              htmlFor="email-announcements-toggle"
              className="text-sm font-semibold text-ink/80 cursor-not-allowed"
            >
              New Announcements
            </label>
          </li>
          <li className="flex items-center gap-3">
            <input
              id="email-enrolled-toggle"
              type="checkbox"
              disabled
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label
              htmlFor="email-enrolled-toggle"
              className="text-sm font-semibold text-ink/80 cursor-not-allowed"
            >
              New Resources in your enrolled categories
            </label>
          </li>
          <li className="flex items-center gap-3">
            <input
              id="email-digest-toggle"
              type="checkbox"
              disabled
              aria-disabled="true"
              title="Email preferences coming soon"
              className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] cursor-not-allowed"
            />
            <label
              htmlFor="email-digest-toggle"
              className="text-sm font-semibold text-ink/80 cursor-not-allowed"
            >
              Weekly Digest
            </label>
          </li>
        </ul>
        <p className="text-xs text-ink/60 font-semibold pt-2 border-t border-ink/5">
          (Coming Soon)
        </p>
      </section>
    </div>
  );
};

export default NotificationSettings;
