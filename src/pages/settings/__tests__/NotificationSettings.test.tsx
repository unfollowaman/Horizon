import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import NotificationSettings from '../NotificationSettings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationSettings Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
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

  it('renders heading, back button, and category sections correctly', () => {
    act(() => {
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

    const h2s = Array.from(container?.querySelectorAll('h2') || []);
    expect(h2s.map(h => h.textContent)).toContain('Push Notifications');
    expect(h2s.map(h => h.textContent)).toContain('Email Preferences');
  });

  it('provides accessible disabled inputs with matching labels and ARIA attributes', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const pushInput = container?.querySelector('#push-notifications-toggle') as HTMLInputElement;
    expect(pushInput).not.toBeNull();
    expect(pushInput.disabled).toBe(true);
    expect(pushInput.getAttribute('aria-disabled')).toBe('true');
    expect(pushInput.getAttribute('title')).toBe('Push notification settings coming soon');

    const pushLabel = container?.querySelector('label[for="push-notifications-toggle"]');
    expect(pushLabel?.textContent).toContain('Enable Push Notifications');

    const announcementsInput = container?.querySelector('#email-announcements-toggle') as HTMLInputElement;
    expect(announcementsInput).not.toBeNull();
    expect(announcementsInput.disabled).toBe(true);
    expect(announcementsInput.getAttribute('aria-disabled')).toBe('true');
    expect(announcementsInput.checked).toBe(true);
  });

  it('triggers back navigation when back button is clicked', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <NotificationSettings />
        </MemoryRouter>
      );
    });

    const backButton = container?.querySelector('button[aria-label="Go Back"]') as HTMLButtonElement;
    act(() => {
      backButton.click();
    });

    expect(mockNavigate).toHaveBeenCalled();
  });
});
