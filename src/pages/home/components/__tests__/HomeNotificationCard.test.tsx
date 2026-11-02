import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomeNotificationCard } from '../HomeNotificationCard';
import * as AuthContextModule from '../../../../context/AuthContext';
import * as NotifStatusModule from '../../../../hooks/useNotificationStatus';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../../context/AuthContext');
vi.mock('../../../../hooks/useNotificationStatus', async () => {
  const actual = await vi.importActual('../../../../hooks/useNotificationStatus');
  return {
    ...actual,
    useNotificationStatus: vi.fn(),
  };
});

describe('HomeNotificationCard', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockUser = {
    id: 'user-123',
    email: 'student@example.com',
    app_metadata: { role: 'student' },
  } as any;

  const defaultMockStatus: NotifStatusModule.UseNotificationStatusReturn = {
    isSupported: true,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    enableNotifications: vi.fn().mockResolvedValue({ success: true, data: {} }),
    disableNotifications: vi.fn().mockResolvedValue({ success: true }),
    refreshStatus: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      session: null,
      profile: null,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
    });
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      container.remove();
    }
    sessionStorage.clear();
  });

  it('renders State A (Request Card) for authenticated visitor with default permission', () => {
    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.textContent).toContain('Get Notifications');
    expect(container!.textContent).toContain(
      'Allow notifications to receive important updates, new resources and exam alerts.'
    );

    const buttons = container!.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim());
    expect(buttonTexts).toContain('Yes, Allow');
    expect(buttonTexts).toContain('Not Now');

    const img = container!.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/assets/SVG%20Illustrations/Notification%20Request%20Bell.svg');
    expect(img?.getAttribute('alt')).toBe('Notification Request');
  });

  it('calls enableNotifications when clicking Yes, Allow', async () => {
    const enableMock = vi.fn().mockResolvedValue({ success: true, data: {} });
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      enableNotifications: enableMock,
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    const allowButton = Array.from(container!.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Yes, Allow'
    );
    expect(allowButton).toBeDefined();

    await act(async () => {
      allowButton!.click();
    });

    expect(enableMock).toHaveBeenCalledTimes(1);
  });

  it('displays error feedback when enableNotifications fails with PERMISSION_DENIED', async () => {
    const enableMock = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'PERMISSION_DENIED' },
    });
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      enableNotifications: enableMock,
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    const allowButton = Array.from(container!.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Yes, Allow'
    );

    await act(async () => {
      allowButton!.click();
    });

    const alert = container!.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain(
      'Notification permission was denied. You can enable it in your browser settings.'
    );
  });

  it('hides card when Not Now is clicked and persists in sessionStorage', async () => {
    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    const notNowButton = Array.from(container!.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Not Now'
    );
    expect(notNowButton).toBeDefined();

    act(() => {
      notNowButton!.click();
    });

    expect(container!.children.length).toBe(0);
    expect(sessionStorage.getItem('horizon_notif_card_dismissed')).toBe('true');
  });

  it('remains hidden on mount if already dismissed in sessionStorage', () => {
    sessionStorage.setItem('horizon_notif_card_dismissed', 'true');

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.children.length).toBe(0);
  });

  it('renders State B (Success Card) when isSubscribed is true', () => {
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      permission: 'granted',
      isSubscribed: true,
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.textContent).toContain('Notifications Enabled');
    expect(container!.textContent).toContain(
      "Thank you! You'll now receive important updates, new resources and exam alerts."
    );

    const buttons = container!.querySelectorAll('button');
    expect(buttons.length).toBe(0);

    const img = container!.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/assets/SVG%20Illustrations/Notification%20Success%20Bell.svg');
    expect(img?.getAttribute('alt')).toBe('Notifications Enabled');
  });

  it('hides card if user is unauthenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      session: null,
      profile: null,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.children.length).toBe(0);
  });

  it('hides card if push notifications are unsupported', () => {
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      isSupported: false,
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.children.length).toBe(0);
  });

  it('hides card if notification permission is denied', () => {
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      permission: 'denied',
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.children.length).toBe(0);
  });

  it('renders request card if permission is granted but isSubscribed is false', () => {
    vi.mocked(NotifStatusModule.useNotificationStatus).mockReturnValue({
      ...defaultMockStatus,
      permission: 'granted',
      isSubscribed: false,
    });

    act(() => {
      root!.render(<HomeNotificationCard />);
    });

    expect(container!.textContent).toContain('Get Notifications');
    const buttons = container!.querySelectorAll('button');
    expect(buttons.length).toBe(2);
  });
});
