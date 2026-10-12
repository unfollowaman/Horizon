import { assertEquals } from "jsr:@std/assert";
import {
  extractBearerToken,
  validateContentType,
  isUserAdmin,
  validateJsonObject,
  validateSendNotificationRequest,
  getCorsHeaders,
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

Deno.test("validateContentType - accept application/json", () => {
  const res = validateContentType("application/json");
  assertEquals(res.valid, true);
});

Deno.test("validateContentType - accept application/json with parameters and uppercase", () => {
  const res = validateContentType("APPLICATION/JSON; charset=utf-8");
  assertEquals(res.valid, true);
});

Deno.test("validateContentType - reject missing Content-Type header", () => {
  const res = validateContentType(null);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing Content-Type header. Must be 'application/json'");
});

Deno.test("validateContentType - reject unsupported Content-Type (text/plain)", () => {
  const res = validateContentType("text/plain");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unsupported Content-Type. Must be 'application/json'");
});

Deno.test("validateContentType - reject tricky substring match (text/html; application/json)", () => {
  const res = validateContentType("text/html; application/json");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unsupported Content-Type. Must be 'application/json'");
});

Deno.test("isUserAdmin - true for user with admin role in app_metadata", () => {
  const user = { app_metadata: { role: "admin" } };
  assertEquals(isUserAdmin(user), true);
});

Deno.test("isUserAdmin - false for user with student role in app_metadata", () => {
  const user = { app_metadata: { role: "student" } };
  assertEquals(isUserAdmin(user), false);
});

Deno.test("isUserAdmin - false for user without app_metadata", () => {
  const user = {};
  assertEquals(isUserAdmin(user), false);
});

Deno.test("isUserAdmin - false for null user", () => {
  assertEquals(isUserAdmin(null), false);
});

Deno.test("validateJsonObject - accept valid plain object", () => {
  const res = validateJsonObject({ title: "Test", message: "Msg" });
  assertEquals(res.valid, true);
});

Deno.test("validateJsonObject - reject null", () => {
  const res = validateJsonObject(null);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject array", () => {
  const res = validateJsonObject(["title", "message"]);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject primitives (number, string, boolean)", () => {
  assertEquals(validateJsonObject(123).valid, false);
  assertEquals(validateJsonObject("a string").valid, false);
  assertEquals(validateJsonObject(true).valid, false);
});

Deno.test("MAX_BODY_BYTES constant value", () => {
  assertEquals(MAX_BODY_BYTES, 16384);
});

Deno.test("validateSendNotificationRequest - valid general announcement", () => {
  const body = {
    title: "General Announcement",
    message: "This is a general announcement for all students.",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.title, "General Announcement");
  assertEquals(res.payload?.target_class, "all");
  assertEquals(res.payload?.target_medium, "all");
});

Deno.test("validateSendNotificationRequest - valid restricted announcement", () => {
  const body = {
    title: "Class 10 English Notes Added",
    message: "New science notes have been uploaded.",
    target_class: "10",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.target_class, "10");
  assertEquals(res.payload?.target_medium, "english");
});

Deno.test("validateSendNotificationRequest - support 'body' as alias for 'message'", () => {
  const body = {
    title: "Notice",
    body: "Notice body message.",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.message, "Notice body message.");
});

Deno.test("validateSendNotificationRequest - reject missing title", () => {
  const body = {
    message: "Some message",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing or invalid 'title' field (must be a non-empty string)");
});

Deno.test("validateSendNotificationRequest - reject title exceeding 120 characters", () => {
  const body = {
    title: "A".repeat(121),
    message: "Some message",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "'title' field exceeds maximum length of 120 characters");
});

Deno.test("validateSendNotificationRequest - reject missing message", () => {
  const body = {
    title: "Title",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing or invalid 'message' or 'body' field (must be a non-empty string)");
});

Deno.test("validateSendNotificationRequest - reject message exceeding 500 characters", () => {
  const body = {
    title: "Title",
    message: "M".repeat(501),
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "'message' field exceeds maximum length of 500 characters");
});

Deno.test("validateSendNotificationRequest - reject invalid class", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "13",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Invalid 'target_class'. Must be 'all', '8', '9', '10', '11', or '12'");
});

Deno.test("validateSendNotificationRequest - reject invalid medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "10",
    target_medium: "spanish",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Invalid 'target_medium'. Must be 'all', 'english', or 'hindi'");
});

Deno.test("validateSendNotificationRequest - reject mismatched general class and restricted medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "all",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(
    res.error,
    "Invalid targeting pair: 'target_class' and 'target_medium' must both be 'all' for general announcements, or both specific values for restricted announcements"
  );
});

Deno.test("validateSendNotificationRequest - reject mismatched restricted class and general medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "9",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(
    res.error,
    "Invalid targeting pair: 'target_class' and 'target_medium' must both be 'all' for general announcements, or both specific values for restricted announcements"
  );
});

Deno.test("validateSendNotificationRequest - reject unexpected payload fields", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "all",
    target_medium: "all",
    unauthorized_field: "malicious_data",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unexpected field in request body: unauthorized_field");
});

Deno.test("readBoundedBodyStream - normal payload within limit", async () => {
  const payload = JSON.stringify({ title: "Test", message: "Msg", target_class: "all", target_medium: "all" });
  const req = new Request("https://unfollowaman.tech/send-push-notification", {
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

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    body: stream,
    // @ts-ignore stream body requires duplex in node fetch
    duplex: "half",
  });

  const res = await readBoundedBodyStream(req, 1000);
  assertEquals(res.oversized, true);
  assertEquals(res.text, undefined);
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
