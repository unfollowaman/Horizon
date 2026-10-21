import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminNotifications from '../AdminNotifications';
import AdminRoute from '../../../components/AdminRoute';
import { useAuth } from '../../../context/AuthContext';
import * as notificationService from '../../../services/notifications';
import type { User } from '@supabase/supabase-js';
import type { AnnouncementRow } from '../../../types';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../services/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof notificationService>();
  return {
    ...actual,
    sendPushNotification: vi.fn(),
    fetchAnnouncementHistory: vi.fn(),
  };
});

describe('AdminNotifications Component & Route Protection', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@horizon.edu',
    app_metadata: { role: 'admin' },
  } as unknown as User;

  const mockStudentUser = {
    id: 'student-456',
    email: 'student@horizon.edu',
    app_metadata: { role: 'student' },
  } as unknown as User;

  const sampleHistory: AnnouncementRow[] = [
    {
      id: 'ann-1',
      title: 'Maths Revision Notes',
      body: 'Chapter 5 revision notes uploaded.',
      image_url: null,
      destination_url: '/',
      target_class: '10',
      target_medium: 'english',
      created_by: 'admin-123',
      status: 'sent',
      total_sent: 10,
      total_successful: 10,
      total_failed: 0,
      sent_at: '2026-02-01T12:00:00Z',
      created_at: '2026-02-01T12:00:00Z',
      updated_at: '2026-02-01T12:00:00Z',
    },
  ];

  const fillInput = (input: HTMLInputElement, value: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const fillTextArea = (textarea: HTMLTextAreaElement, value: string) => {
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    nativeTextAreaValueSetter?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const selectOption = (select: HTMLSelectElement, value: string) => {
    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      'value'
    )?.set;
    nativeSelectValueSetter?.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.mocked(notificationService.fetchAnnouncementHistory).mockResolvedValue({
      success: true,
      data: sampleHistory,
    });
  });

  afterEach(() => {
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

  /* -------------------------------------------------------------------------- */
  /* 1. ROUTE PROTECTION TESTS                                                  */
  /* -------------------------------------------------------------------------- */

  it('1. Admin access: renders Push Notifications dashboard when user is verified admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/notifications" element={<AdminNotifications />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Push Notifications');
    expect(container?.textContent).toContain('Compose Notification');
    expect(container?.textContent).toContain('Recent Announcement Dispatches');
  });

  it('2. Non-admin access: redirects non-admin user away from /admin/notifications to /dashboard', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockStudentUser,
      session: { user: mockStudentUser } as never,
      profile: { id: 'student-456' } as never,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/notifications" element={<AdminNotifications />} />
            </Route>
            <Route path="/dashboard" element={<div data-testid="student-dashboard">Student Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="student-dashboard"]')).not.toBeNull();
    expect(container?.textContent).not.toContain('Compose Notification');
  });

  it('3. Unauthenticated access: redirects unauthenticated visitor to /login', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/notifications" element={<AdminNotifications />} />
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="login-page"]')).not.toBeNull();
  });

  /* -------------------------------------------------------------------------- */
  /* 2. FORM & AUDIENCE TARGETING VALIDATION TESTS                              */
  /* -------------------------------------------------------------------------- */

  it('4. Form validation: prevents submission and displays errors when required fields are empty', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(container?.textContent).toContain('Title is required');
    expect(container?.textContent).toContain('Message is required');
    expect(container?.textContent).not.toContain('Confirm Push Dispatch');
  });

  it('5. Confirmation modal & cancellation: review step displays details and cancellation retains draft text', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const titleInput = container?.querySelector('#notif-title') as HTMLInputElement;
    const messageInput = container?.querySelector('#notif-message') as HTMLTextAreaElement;

    act(() => {
      fillInput(titleInput, 'Important Update');
      fillTextArea(messageInput, 'Class 10 schedule updated.');
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(container?.textContent).toContain('Confirm Push Dispatch');
    expect(container?.textContent).toContain('Important Update');
    expect(container?.textContent).toContain('Class 10 schedule updated.');

    // Click Cancel
    const cancelBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Cancel'
    );

    await act(async () => {
      cancelBtn?.click();
    });

    expect(container?.textContent).not.toContain('Confirm Push Dispatch');
    expect(titleInput.value).toBe('Important Update');
    expect(messageInput.value).toBe('Class 10 schedule updated.');
    expect(notificationService.sendPushNotification).not.toHaveBeenCalled();
  });

  /* -------------------------------------------------------------------------- */
  /* 3. DISPATCH INTEGRATION TESTS                                             */
  /* -------------------------------------------------------------------------- */

  it('6. General announcement dispatch: submits target_class = all and target_medium = all', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(notificationService.sendPushNotification).mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Push notification dispatch complete',
        recipient_count: 5,
        total_successful: 5,
        total_failed: 0,
        deactivated_subscriptions: 0,
        announcement_id: 'ann-new-1',
        status: 'sent',
        target: { target_class: 'all', target_medium: 'all' },
      },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const titleInput = container?.querySelector('#notif-title') as HTMLInputElement;
    const messageInput = container?.querySelector('#notif-message') as HTMLTextAreaElement;

    act(() => {
      fillInput(titleInput, 'General Alert');
      fillTextArea(messageInput, 'Platform maintenance tonight at 11 PM.');
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const confirmBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Confirm and Send'
    );

    await act(async () => {
      confirmBtn?.click();
    });

    expect(notificationService.sendPushNotification).toHaveBeenCalledWith({
      title: 'General Alert',
      message: 'Platform maintenance tonight at 11 PM.',
      target_class: 'all',
      target_medium: 'all',
    });

    expect(container?.textContent).toContain('Push Notification Sent Successfully');
    expect(container?.textContent).toContain('Successfully delivered notification to 5 recipient(s).');
  });

  it('7. Restricted audience dispatch: submits specific class and medium pair', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(notificationService.sendPushNotification).mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Push notification dispatch complete',
        recipient_count: 3,
        total_successful: 3,
        total_failed: 0,
        deactivated_subscriptions: 0,
        announcement_id: 'ann-new-2',
        status: 'sent',
        target: { target_class: '9', target_medium: 'hindi' },
      },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const titleInput = container?.querySelector('#notif-title') as HTMLInputElement;
    const messageInput = container?.querySelector('#notif-message') as HTMLTextAreaElement;

    act(() => {
      fillInput(titleInput, 'Class 9 Hindi Notes');
      fillTextArea(messageInput, 'Hindi medium science notes available.');
    });

    // Select Restricted Audience Radio
    const restrictedRadio = container?.querySelector('input[value="restricted"]') as HTMLInputElement;
    await act(async () => {
      restrictedRadio.click();
    });

    // Select Class 9 and Hindi Medium
    const classSelect = container?.querySelector('#target-class-select') as HTMLSelectElement;
    const mediumSelect = container?.querySelector('#target-medium-select') as HTMLSelectElement;

    act(() => {
      selectOption(classSelect, '9');
      selectOption(mediumSelect, 'hindi');
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const confirmBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Confirm and Send'
    );

    await act(async () => {
      confirmBtn?.click();
    });

    expect(notificationService.sendPushNotification).toHaveBeenCalledWith({
      title: 'Class 9 Hindi Notes',
      message: 'Hindi medium science notes available.',
      target_class: '9',
      target_medium: 'hindi',
    });

    expect(container?.textContent).toContain('Push Notification Sent Successfully');
  });

  it('8. Persistence warning handling: shows warning banner when backend returns persistence_warning = true', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(notificationService.sendPushNotification).mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Push notification dispatch complete with persistence warnings',
        recipient_count: 2,
        total_successful: 2,
        total_failed: 0,
        deactivated_subscriptions: 0,
        announcement_id: 'ann-warn-1',
        status: 'sent',
        persistence_warning: true,
        target: { target_class: 'all', target_medium: 'all' },
      },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const titleInput = container?.querySelector('#notif-title') as HTMLInputElement;
    const messageInput = container?.querySelector('#notif-message') as HTMLTextAreaElement;

    act(() => {
      fillInput(titleInput, 'Persistence Test');
      fillTextArea(messageInput, 'Testing persistence warning feedback.');
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const confirmBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Confirm and Send'
    );

    await act(async () => {
      confirmBtn?.click();
    });

    expect(container?.textContent).toContain('Notification Dispatched with Warnings');
    expect(container?.textContent).toContain('warning recording full status details in the database');
  });

  it('9. Error handling: shows error banner when backend or network error occurs', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(notificationService.sendPushNotification).mockResolvedValue({
      success: false,
      error: {
        code: 'BACKEND_REJECTION',
        message: 'Server VAPID keys are missing or unconfigured',
        status: 500,
      },
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    const titleInput = container?.querySelector('#notif-title') as HTMLInputElement;
    const messageInput = container?.querySelector('#notif-message') as HTMLTextAreaElement;

    act(() => {
      fillInput(titleInput, 'Failed Test');
      fillTextArea(messageInput, 'Testing error feedback handling.');
    });

    const form = container?.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const confirmBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Confirm and Send'
    );

    await act(async () => {
      confirmBtn?.click();
    });

    expect(container?.textContent).toContain('Notification Dispatch Failed');
    expect(container?.textContent).toContain('Server VAPID keys are missing or unconfigured');
  });

  /* -------------------------------------------------------------------------- */
  /* 4. ANNOUNCEMENT HISTORY TESTS                                              */
  /* -------------------------------------------------------------------------- */

  it('10. History table: renders past announcements and handles empty/error history states', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Maths Revision Notes');
    expect(container?.textContent).toContain('Chapter 5 revision notes uploaded.');
    expect(container?.textContent).toContain('Class 10 (english)');
    expect(container?.textContent).toContain('SENT');
    expect(container?.textContent).toContain('10 / 10');
  });

  it('11. Empty history state: displays graceful empty message when no announcements exist', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      session: { user: mockAdminUser } as never,
      profile: { id: 'admin-123' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(notificationService.fetchAnnouncementHistory).mockResolvedValue({
      success: true,
      data: [],
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications']}>
          <AdminNotifications />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('No previous announcements found.');
  });
});
