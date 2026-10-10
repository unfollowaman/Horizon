import { assertEquals } from "jsr:@std/assert";
import { validatePushEndpoint, getCorsHeaders } from "./index.ts";

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
