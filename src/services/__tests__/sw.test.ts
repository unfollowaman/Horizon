import { describe, it, expect, beforeEach, vi } from 'vitest';
import swCode from '../../../public/sw.js?raw';

describe('public/sw.js Service Worker', () => {
  const listeners: Record<string, ((event: any) => any)[]> = {};

  const mockSkipWaiting = vi.fn();
  const mockClaim = vi.fn().mockResolvedValue(undefined);
  const mockShowNotification = vi.fn().mockResolvedValue(undefined);
  const mockFocus = vi.fn().mockResolvedValue(undefined);
  const mockOpenWindow = vi.fn().mockResolvedValue(undefined);
  const mockMatchAll = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }

    // Setup global self test double with location mock
    const mockSelf = {
      location: {
        origin: 'http://localhost',
        href: 'http://localhost/sw.js',
      },
      addEventListener: (type: string, listener: (event: any) => any) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(listener);
      },
      skipWaiting: mockSkipWaiting,
      clients: {
        claim: mockClaim,
        matchAll: mockMatchAll,
        openWindow: mockOpenWindow,
      },
      registration: {
        showNotification: mockShowNotification,
      },
    };

    // Evaluate sw.js in mock scope
    const executeSw = new Function('self', swCode);
    executeSw(mockSelf);
  });

  it('registers install and activate event listeners and invokes skipWaiting and claim', async () => {
    expect(listeners['install']).toBeDefined();
    expect(listeners['activate']).toBeDefined();

    // Trigger install
    listeners['install'][0]({});
    expect(mockSkipWaiting).toHaveBeenCalledTimes(1);

    // Trigger activate
    let waitUntilPromise: Promise<any> | null = null;
    listeners['activate'][0]({
      waitUntil: (p: Promise<any>) => {
        waitUntilPromise = p;
      },
    });

    await waitUntilPromise;
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  describe('push event', () => {
    it('ignores push event when event.data is null/undefined', () => {
      const mockWaitUntil = vi.fn();
      listeners['push'][0]({
        data: null,
        waitUntil: mockWaitUntil,
      });

      expect(mockWaitUntil).not.toHaveBeenCalled();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('parses valid JSON push payload and displays notification with custom fields', async () => {
      let waitUntilPromise: Promise<any> | null = null;

      const pushPayload = {
        title: 'New Class 10 Notes Available',
        body: 'Chapter 5 Science notes have been published.',
        icon: '/assets/custom-icon.png',
        badge: '/assets/custom-badge.png',
        data: { url: '/notes/123' },
      };

      listeners['push'][0]({
        data: {
          json: () => pushPayload,
          text: () => JSON.stringify(pushPayload),
        },
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      });

      await waitUntilPromise;

      expect(mockShowNotification).toHaveBeenCalledWith('New Class 10 Notes Available', {
        body: 'Chapter 5 Science notes have been published.',
        icon: '/assets/custom-icon.png',
        badge: '/assets/custom-badge.png',
        data: { url: '/notes/123' },
      });
    });

    it('falls back gracefully to text payload when JSON parsing throws an error', async () => {
      let waitUntilPromise: Promise<any> | null = null;

      listeners['push'][0]({
        data: {
          json: () => {
            throw new SyntaxError('Unexpected token');
          },
          text: () => 'Plain text announcement message',
        },
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      });

      await waitUntilPromise;

      expect(mockShowNotification).toHaveBeenCalledWith('Horizon Notification', {
        body: 'Plain text announcement message',
        icon: '/assets/favicon/favicon-96x96.png',
        badge: '/assets/favicon/favicon-96x96.png',
        data: {},
      });
    });
  });

  describe('notificationclick event', () => {
    it('closes notification and focuses matching open window client if present', async () => {
      let waitUntilPromise: Promise<any> | null = null;
      const mockClose = vi.fn();

      const matchingClient = {
        url: 'http://localhost/notes/456',
        focus: mockFocus,
      };
      mockMatchAll.mockResolvedValueOnce([matchingClient]);

      listeners['notificationclick'][0]({
        notification: {
          close: mockClose,
          data: { url: '/notes/456' },
        },
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      });

      await waitUntilPromise;

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockMatchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true });
      expect(mockFocus).toHaveBeenCalledTimes(1);
      expect(mockOpenWindow).not.toHaveBeenCalled();
    });

    it('closes notification and opens new window if no matching window client is open', async () => {
      let waitUntilPromise: Promise<any> | null = null;
      const mockClose = vi.fn();

      const otherClient = {
        url: 'http://localhost/dashboard',
        focus: mockFocus,
      };
      mockMatchAll.mockResolvedValueOnce([otherClient]);

      listeners['notificationclick'][0]({
        notification: {
          close: mockClose,
          data: { url: '/pyqs/789' },
        },
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      });

      await waitUntilPromise;

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockFocus).not.toHaveBeenCalled();
      expect(mockOpenWindow).toHaveBeenCalledWith('/pyqs/789');
    });

    it('uses root path "/" as fallback targetUrl when notification data URL is missing', async () => {
      let waitUntilPromise: Promise<any> | null = null;
      const mockClose = vi.fn();

      mockMatchAll.mockResolvedValueOnce([]);

      listeners['notificationclick'][0]({
        notification: {
          close: mockClose,
          data: null,
        },
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        },
      });

      await waitUntilPromise;

      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockOpenWindow).toHaveBeenCalledWith('/');
    });
  });
});
