import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import NotificationSettings from '../NotificationSettings';
import * as notificationsService from '../../../services/notifications';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockAuthValue = {
  user: { id: 'test-user-123', email: 'student@example.com' },
  session: { access_token: 'test-token' },
  profile: { name: 'Test Student' },
  loading: false,
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

describe('NotificationSettings Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa';

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();

    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', mockVapidKey);

    // Mock Notification global
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
      configurable: true,
    });

    // Mock notification service calls
    vi.spyOn(notificationsService, 'isPushSupported').mockReturnValue(true);
    vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockResolvedValue({
      success: true,
      data: { endpoint: 'https://push.example.com', keys: { p256dh: 'a', auth: 'b' } },
    });
    vi.spyOn(notificationsService, 'unsubscribeFromPushNotifications').mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders heading, back button, and category sections correctly', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Notification Settings');

    const backButton = container?.querySelector('button[aria-label="Go Back"]');
    expect(backButton).not.toBeNull();
    expect(backButton?.getAttribute('title')).toBe('Go Back');
    expect(backButton?.className).toContain('focus-visible:ring-[#E91E8C]');

    const h2s = Array.from(container?.querySelectorAll('h2') || []);
    expect(h2s.map((h) => h.textContent)).toContain('Push Notifications');
    expect(h2s.map((h) => h.textContent)).toContain('Email Preferences');
  });

  it('does NOT request notification permission or subscribe on component mount', async () => {
    const subscribeSpy = vi.spyOn(notificationsService, 'subscribeToPushNotifications');

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    expect(subscribeSpy).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('handles unsupported browser state correctly', async () => {
    vi.spyOn(notificationsService, 'isPushSupported').mockReturnValue(false);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const switchBtn = container?.querySelector('#push-notifications-toggle') as HTMLButtonElement;
    expect(switchBtn?.disabled).toBe(true);
    expect(container?.textContent).toContain('Not supported');
  });

  it('handles signed-out user state correctly', async () => {
    mockAuthValue.user = null as unknown as typeof mockAuthValue.user;

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Sign in required');
    expect(container?.textContent).toContain('You must be signed in to manage push notification preferences.');

    // Reset user
    mockAuthValue.user = { id: 'test-user-123', email: 'student@example.com' };
  });

  it('handles missing VAPID key state correctly', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Unavailable');
    const switchBtn = container?.querySelector('#push-notifications-toggle') as HTMLButtonElement;
    expect(switchBtn?.disabled).toBe(true);
  });

  it('handles browser permission denied state correctly', async () => {
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Blocked in browser');
    expect(container?.textContent).toContain('How to enable browser notifications:');

    const switchBtn = container?.querySelector('#push-notifications-toggle') as HTMLButtonElement;
    expect(switchBtn?.disabled).toBe(true);
  });

  it('handles browser permission granted but subscription registration pending state', async () => {
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock SW registration with null subscription
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
          },
        }),
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Registration pending');
    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Complete Setup')
    );
    expect(actionBtn).not.toBeUndefined();
  });

  it('triggers subscribeToPushNotifications on explicit opt-in action and displays success feedback', async () => {
    const subscribeSpy = vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockResolvedValueOnce({
      success: true,
      data: { endpoint: 'https://push.example.com', keys: { p256dh: 'a', auth: 'b' } },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Enable Push Notifications')
    );
    expect(actionBtn).not.toBeUndefined();

    await act(async () => {
      actionBtn?.click();
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    const statusBanner = container?.querySelector('[role="status"]');
    expect(statusBanner?.textContent).toContain('Push notifications enabled successfully!');
  });

  it('displays user-friendly error state on network or backend failure', async () => {
    vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockResolvedValueOnce({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch',
      },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Enable Push Notifications')
    );

    await act(async () => {
      actionBtn?.click();
    });

    const statusBanner = container?.querySelector('[role="status"]');
    expect(statusBanner?.textContent).toContain('Network error during push notification registration');
    // Ensure raw message isn't leaked
    expect(statusBanner?.textContent).not.toContain('Failed to fetch');
  });

  it('suppresses rapid duplicate clicks across switch button and action button using inFlightRef guard', async () => {
    let resolveSubscribe: (val: unknown) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveSubscribe = resolve;
    });

    const subscribeSpy = vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockImplementationOnce(
      () => pendingPromise as ReturnType<typeof notificationsService.subscribeToPushNotifications>
    );

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const switchBtn = container?.querySelector('#push-notifications-toggle') as HTMLButtonElement;
    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Enable Push Notifications')
    );

    // Rapid concurrent clicks across both controls
    await act(async () => {
      switchBtn?.click();
      actionBtn?.click();
      switchBtn?.click();
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    // Resolve pending promise
    await act(async () => {
      resolveSubscribe({
        success: true,
        data: { endpoint: 'https://push.example.com' },
      });
    });
  });

  it('recovers processing state safely when subscribeToPushNotifications throws an unexpected error', async () => {
    vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockRejectedValueOnce(
      new Error('Unexpected system error')
    );

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Enable Push Notifications')
    );

    await act(async () => {
      actionBtn?.click();
    });

    const statusBanner = container?.querySelector('[role="status"]');
    expect(statusBanner?.textContent).toContain('An unexpected error occurred while updating push notification settings.');

    // Button should be re-enabled and restored after error
    const switchBtn = container?.querySelector('#push-notifications-toggle') as HTMLButtonElement;
    expect(switchBtn.disabled).toBe(false);
  });

  it('recovers processing state safely when unsubscribeFromPushNotifications throws an unexpected error', async () => {
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted' },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com' }),
          },
        }),
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(notificationsService, 'unsubscribeFromPushNotifications').mockRejectedValueOnce(
      new Error('Unexpected unsubscribe error')
    );

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const disableBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Disable Notifications')
    );

    await act(async () => {
      disableBtn?.click();
    });

    const statusBanner = container?.querySelector('[role="status"]');
    expect(statusBanner?.textContent).toContain('An unexpected error occurred while updating push notification settings.');
  });

  it('handles component unmount cleanly during pending asynchronous subscription', async () => {
    let resolveSubscribe: (val: unknown) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveSubscribe = resolve;
    });

    vi.spyOn(notificationsService, 'subscribeToPushNotifications').mockImplementationOnce(
      () => pendingPromise as ReturnType<typeof notificationsService.subscribeToPushNotifications>
    );

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const actionBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Enable Push Notifications')
    );

    await act(async () => {
      actionBtn?.click();
    });

    // Unmount before promise resolves
    await act(async () => {
      root?.unmount();
      root = null;
    });

    // Resolve after unmount - should not throw or cause state update errors
    await act(async () => {
      resolveSubscribe({
        success: true,
        data: { endpoint: 'https://push.example.com' },
      });
    });
  });

  it('triggers back navigation when back button is clicked', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const backButton = container?.querySelector('button[aria-label="Go Back"]') as HTMLButtonElement;
    await act(async () => {
      backButton.click();
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('refreshes permission state when window receives focus event', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    // Change Notification.permission dynamically
    Object.defineProperty(window.Notification, 'permission', { value: 'granted', configurable: true });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(container?.textContent).not.toContain('Blocked in browser');
  });
});
