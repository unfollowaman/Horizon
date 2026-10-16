/* eslint-disable no-restricted-globals */
/**
 * Horizon Push Service Worker
 * Handles background push notifications and notification click interactions.
 */

self.addEventListener('install', () => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Become active and take control of open clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (_e) {
    data = { title: 'Horizon', body: event.data.text() };
  }

  const title = data.title || 'Horizon Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/favicon/favicon-96x96.png',
    badge: data.badge || '/assets/favicon/favicon-96x96.png',
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
