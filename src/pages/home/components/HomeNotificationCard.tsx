import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationStatus } from '../../../hooks/useNotificationStatus';
import styles from './HomeNotificationCard.module.css';

const SESSION_DISMISSAL_KEY = 'horizon_notif_card_dismissed';

export const HomeNotificationCard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: statusLoading,
    enableNotifications
  } = useNotificationStatus();

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(SESSION_DISMISSAL_KEY) === 'true';
    }
    return false;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState<boolean>(false);
  const [showGreeting, setShowGreeting] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (greetingTimerRef.current !== null) {
        clearTimeout(greetingTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(SESSION_DISMISSAL_KEY, 'true');
    }
  }, []);

  const handleAllow = useCallback(async () => {
    if (isEnabling) return;
    setIsEnabling(true);
    setErrorMessage(null);

    try {
      const result = await enableNotifications();
      if (!isMountedRef.current) return;

      if (result.success) {
        setShowGreeting(true);
        if (greetingTimerRef.current !== null) {
          clearTimeout(greetingTimerRef.current);
        }
        greetingTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setShowGreeting(false);
          handleDismiss();
        }, 5000);
      } else {
        const code = result.error?.code;
        if (code === 'PERMISSION_DENIED') {
          setErrorMessage('Notification permission was denied. You can enable it in your browser settings.');
        } else if (code === 'UNAUTHENTICATED') {
          setErrorMessage('Please sign in to enable notifications.');
        } else if (code === 'MISSING_VAPID_KEY') {
          setErrorMessage('Notification service is currently unavailable.');
        } else if (code === 'NETWORK_ERROR') {
          setErrorMessage('Network error occurred. Please check your connection and try again.');
        } else {
          setErrorMessage(result.error?.message || 'Failed to enable notifications. Please try again.');
        }
      }
    } catch {
      if (isMountedRef.current) {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsEnabling(false);
      }
    }
  }, [enableNotifications, handleDismiss, isEnabling]);

  // Condition checks
  // 1. If auth is still loading or status is loading, wait before rendering to prevent layout shifts
  if (authLoading || statusLoading) {
    return null;
  }

  // 2. Hide for unauthenticated users
  if (!user) {
    return null;
  }

  // 3. Graceful fallback for unsupported browsers
  if (!isSupported) {
    return null;
  }

  // 4. Hide if user dismissed card in the current session
  if (isDismissed) {
    return null;
  }

  // 5. Hide if permission denied (do not repeatedly prompt)
  if (permission === 'denied') {
    return null;
  }

  // 6. If user is already subscribed upon visit and not currently showing the 5s greeting, hide the card
  if (isSubscribed && !showGreeting) {
    return null;
  }

  // STATE B: Greeting Card (shown only for 5 seconds right after user taps "Yes, Allow")
  if (showGreeting) {
    return (
      <section className={styles.container} aria-label="Notification Status">
        <div className={styles.card}>
          <div className={styles.illustrationWrapper}>
            <img
              src="/assets/SVG%20Illustrations/Notification%20Success%20Bell.svg"
              alt="Notifications Enabled"
              className={styles.illustration}
            />
          </div>
          <h3 className={styles.heading}>Notifications Enabled</h3>
          <p className={styles.description}>
            Thank you! You'll now receive important updates, new resources and exam alerts.
          </p>
        </div>
      </section>
    );
  }

  // STATE A: Notification Request
  return (
    <section className={styles.container} aria-label="Enable Notifications">
      <div className={styles.card}>
        <div className={styles.illustrationWrapper}>
          <img
            src="/assets/SVG%20Illustrations/Notification%20Request%20Bell.svg"
            alt="Notification Request"
            className={styles.illustration}
          />
        </div>
        <h3 className={styles.heading}>Get Notifications</h3>
        <p className={styles.description}>
          Allow notifications to receive important updates, new resources and exam alerts.
        </p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleAllow}
            disabled={isEnabling}
            aria-busy={isEnabling}
          >
            {isEnabling ? 'Enabling...' : 'Yes, Allow'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleDismiss}
            disabled={isEnabling}
          >
            Not Now
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorMessage} role="alert">
            {errorMessage}
          </div>
        )}
      </div>
    </section>
  );
};
