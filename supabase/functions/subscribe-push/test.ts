import { assertEquals } from "jsr:@std/assert";
import {
  validatePushEndpoint,
  getCorsHeaders,
  extractBearerToken,
  readBoundedBodyStream,
  MAX_BODY_BYTES,
} from "./index.ts";

Deno.test("extractBearerToken - valid Bearer token", () => {
  const res = extractBearerToken("Bearer sample-token-xyz-123");
  assertEquals(res.token, "sample-token-xyz-123");
});

Deno.test("extractBearerToken - missing header", () => {
  const res = extractBearerToken(null);
  assertEquals(res.token, null);
  assertEquals(res.error, "Missing Authorization header");
});

Deno.test("extractBearerToken - empty header", () => {
  const res = extractBearerToken("   ");
  assertEquals(res.token, null);
  assertEquals(res.error, "Empty Authorization header");
});

Deno.test("extractBearerToken - malformed non-Bearer scheme", () => {
  const res = extractBearerToken("Basic dXNlcjpwYXNz");
  assertEquals(res.token, null);
  assertEquals(res.error, "Invalid Authorization header format. Must be 'Bearer <token>'");
});

Deno.test("MAX_BODY_BYTES constant value", () => {
  assertEquals(MAX_BODY_BYTES, 16384);
});

Deno.test("readBoundedBodyStream - normal payload within limit", async () => {
  const payload = JSON.stringify({ subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/123" } });
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    body: payload,
  });

  const res = await readBoundedBodyStream(req, 1024);
  assertEquals(res.oversized, undefined);
  assertEquals(res.text, payload);
});

Deno.test("readBoundedBodyStream - oversized payload stream cancelled", async () => {
  const oversizedData = new Uint8Array(2000);
  oversizedData.fill(65); // 'A's

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(oversizedData);
      controller.close();
    },
  });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    body: stream,
    // @ts-ignore stream body requires duplex in node fetch
    duplex: "half",
  });

  const res = await readBoundedBodyStream(req, 1000);
  assertEquals(res.oversized, true);
  assertEquals(res.text, undefined);
});

Deno.test("validatePushEndpoint - valid FCM endpoint", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/test-token-123");
  assertEquals(res.valid, true);
  assertEquals(res.url?.hostname, "fcm.googleapis.com");
});

Deno.test("validatePushEndpoint - valid Mozilla push endpoint", () => {
  const res = validatePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/test");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - valid Apple push endpoint", () => {
  const res = validatePushEndpoint("https://p01-push.apple.com/send/token");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - valid Windows notify endpoint", () => {
  const res = validatePushEndpoint("https://db5p.notify.windows.com/w/?token=abc");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - reject HTTP protocol", () => {
  const res = validatePushEndpoint("http://fcm.googleapis.com/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use HTTPS");
});

Deno.test("validatePushEndpoint - reject embedded user credentials", () => {
  const res = validatePushEndpoint("https://user:pass@fcm.googleapis.com/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain user credentials");
});

Deno.test("validatePushEndpoint - reject URL fragments", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/test#fragment");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain URL fragments");
});

Deno.test("validatePushEndpoint - reject non-standard port", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com:8443/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use standard HTTPS port (443)");
});

Deno.test("validatePushEndpoint - reject localhost / IP addresses", () => {
  const res1 = validatePushEndpoint("https://localhost/fcm/send/test");
  assertEquals(res1.valid, false);

  const res2 = validatePushEndpoint("https://127.0.0.1/fcm/send/test");
  assertEquals(res2.valid, false);

  const res3 = validatePushEndpoint("https://192.168.1.1/fcm/send/test");
  assertEquals(res3.valid, false);
});

Deno.test("validatePushEndpoint - reject unapproved hostname", () => {
  const res = validatePushEndpoint("https://malicious-push-server.com/send");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("validatePushEndpoint - reject overly broad googleapis domain", () => {
  const res = validatePushEndpoint("https://storage.googleapis.com/bucket/file");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("getCorsHeaders - matches allowed origin", () => {
  const headers = getCorsHeaders("http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Origin"], "http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
});

Deno.test("getCorsHeaders - falls back for untrusted origin", () => {
  const headers = getCorsHeaders("https://untrusted-domain.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://unfollowaman.tech");
});
