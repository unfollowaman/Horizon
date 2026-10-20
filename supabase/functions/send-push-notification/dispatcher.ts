/**
 * Dispatcher module for Horizon Web Push Notifications.
 * Handles pre-flight endpoint validation, Web Push encryption, VAPID header generation,
 * timeout-bounded HTTP requests, gateway status classification, and bounded concurrency batching.
 */

import {
  encryptWebPushPayload,
  createVapidHeaders,
  extractVapidAudience,
} from "./vapid.ts";

export interface RecipientSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushNotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  url?: string;
}

export interface DispatchResult {
  subscriptionId: string;
  endpoint: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  deactivate: boolean;
}

export interface BatchDispatchResult {
  total: number;
  successful: number;
  failed: number;
  deactivatedSubscriptionIds: string[];
  results: DispatchResult[];
}

export interface DispatchOptions {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject?: string; // e.g. "mailto:admin@unfollowaman.tech"
  concurrencyLimit?: number; // Defaults to 25
  requestTimeoutMs?: number; // Defaults to 10000 (10 seconds)
  fetchFn?: typeof fetch; // Custom fetch function injection for unit testing
}

export const DEFAULT_CONCURRENCY_LIMIT = 25;
export const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
export const DEFAULT_VAPID_SUBJECT = "mailto:admin@unfollowaman.tech";

/**
 * Dispatches a single Web Push notification to a recipient's browser push endpoint.
 */
export async function dispatchSinglePushNotification(
  subscription: RecipientSubscription,
  notificationPayload: PushNotificationPayload,
  options: DispatchOptions
): Promise<DispatchResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const vapidSubject = options.vapidSubject ?? DEFAULT_VAPID_SUBJECT;

  // 1. Immediate pre-flight endpoint validation
  const audResult = extractVapidAudience(subscription.endpoint);
  if (!audResult.valid || !audResult.audience) {
    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      error: audResult.error || "Invalid endpoint URL for push dispatch",
      deactivate: false,
    };
  }

  // 2. Construct notification payload
  const jsonPayload = JSON.stringify({
    title: notificationPayload.title,
    body: notificationPayload.message,
    icon: notificationPayload.icon ?? "/assets/favicon/web-app-manifest-192x192.png",
    badge: notificationPayload.badge ?? "/assets/favicon/web-app-manifest-192x192.png",
    data: {
      url: notificationPayload.url ?? "/",
    },
  });

  // 3. Encrypt payload using RFC 8291 / RFC 8188 (aes128gcm)
  let encryptedPayload: { body: Uint8Array; contentEncoding: "aes128gcm" };
  try {
    encryptedPayload = await encryptWebPushPayload({
      payload: jsonPayload,
      p256dhBase64Url: subscription.p256dh,
      authBase64Url: subscription.auth,
    });
  } catch (e) {
    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      error: e instanceof Error ? e.message : "Payload encryption failed",
      deactivate: false,
    };
  }

  // 4. Generate RFC 8292 VAPID Authorization header
  let vapidHeaders: { Authorization: string };
  try {
    vapidHeaders = await createVapidHeaders({
      endpoint: subscription.endpoint,
      subscriber: vapidSubject,
      privateKeyBase64Url: options.vapidPrivateKey,
      publicKeyBase64Url: options.vapidPublicKey,
    });
  } catch (e) {
    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      error: e instanceof Error ? e.message : "VAPID header generation failed",
      deactivate: false,
    };
  }

  // 5. Send HTTP request with 10s timeout, redirect: "error", and standard Web Push headers
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (_e) {
      // Non-fatal abort catch
    }
  }, timeoutMs);

  try {
    const response = await fetchFn(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidHeaders.Authorization,
        "Content-Encoding": encryptedPayload.contentEncoding,
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body: encryptedPayload.body as unknown as BodyInit,
      signal: controller.signal,
      redirect: "error",
    });

    // Safely drain response body without logging sensitive details
    try {
      await response.arrayBuffer();
    } catch (_e) {
      // Discard body read errors
    }

    const statusCode = response.status;

    // 6. Gateway Response Classification
    if (statusCode === 200 || statusCode === 201) {
      return {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        success: true,
        statusCode,
        deactivate: false,
      };
    }

    if (statusCode === 404 || statusCode === 410) {
      // Expired or unregistered subscription endpoint
      return {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        success: false,
        statusCode,
        error: `Subscription expired or unregistered (HTTP ${statusCode})`,
        deactivate: true,
      };
    }

    if (statusCode === 429) {
      return {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        success: false,
        statusCode,
        error: "Push gateway rate limited (HTTP 429)",
        deactivate: false,
      };
    }

    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      statusCode,
      error: `Push gateway returned error status HTTP ${statusCode}`,
      deactivate: false,
    };
  } catch (e) {
    const isTimeout = controller.signal.aborted;
    const errorMsg = isTimeout
      ? `Push request timed out after ${timeoutMs}ms`
      : e instanceof Error
      ? e.message
      : "Network or gateway transport error";

    return {
      subscriptionId: subscription.id,
      endpoint: subscription.endpoint,
      success: false,
      error: errorMsg,
      deactivate: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Dispatches a push notification to a list of recipient subscriptions with bounded concurrency.
 */
export async function batchDispatchPushNotifications(
  subscriptions: RecipientSubscription[],
  notificationPayload: PushNotificationPayload,
  options: DispatchOptions
): Promise<BatchDispatchResult> {
  const concurrencyLimit = options.concurrencyLimit ?? DEFAULT_CONCURRENCY_LIMIT;

  // Recipient de-duplication: Ensure unique subscription IDs and endpoints
  const seenIds = new Set<string>();
  const seenEndpoints = new Set<string>();
  const uniqueSubscriptions: RecipientSubscription[] = [];

  for (const sub of subscriptions) {
    if (!sub || !sub.id || !sub.endpoint) continue;
    if (seenIds.has(sub.id) || seenEndpoints.has(sub.endpoint)) continue;
    seenIds.add(sub.id);
    seenEndpoints.add(sub.endpoint);
    uniqueSubscriptions.push(sub);
  }

  const results: DispatchResult[] = new Array(uniqueSubscriptions.length);
  const deactivatedSubscriptionIds: string[] = [];

  let successful = 0;
  let failed = 0;

  if (uniqueSubscriptions.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      deactivatedSubscriptionIds: [],
      results: [],
    };
  }

  // Bounded Concurrency Processing Queue
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < uniqueSubscriptions.length) {
      const currentIndex = nextIndex++;
      const sub = uniqueSubscriptions[currentIndex];

      let res: DispatchResult;
      try {
        res = await dispatchSinglePushNotification(sub, notificationPayload, options);
      } catch (e) {
        res = {
          subscriptionId: sub.id,
          endpoint: sub.endpoint,
          success: false,
          error: e instanceof Error ? e.message : "Unhandled dispatch exception",
          deactivate: false,
        };
      }

      results[currentIndex] = res;

      if (res.success) {
        successful++;
      } else {
        failed++;
        if (res.deactivate) {
          deactivatedSubscriptionIds.push(res.subscriptionId);
        }
      }
    }
  }

  // Launch at most `concurrencyLimit` concurrent workers
  const workerCount = Math.min(concurrencyLimit, uniqueSubscriptions.length);
  const workers: Promise<void>[] = [];

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return {
    total: uniqueSubscriptions.length,
    successful,
    failed,
    deactivatedSubscriptionIds,
    results,
  };
}
