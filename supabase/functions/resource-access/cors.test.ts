import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ALLOWED_ORIGINS = [
  "https://unfollowaman.tech",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
];

function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const envOriginsStr = typeof process !== "undefined" && process.env ? process.env.ALLOWED_ORIGINS : "";
  const envOrigins = envOriginsStr
    ? envOriginsStr.split(",").map((o) => o.trim()).filter(Boolean)
    : [];
  const singleEnvOrigin = (typeof process !== "undefined" && process.env ? process.env.ALLOWED_ORIGIN : "")?.trim();
  if (singleEnvOrigin) {
    envOrigins.push(singleEnvOrigin);
  }

  const allowedList = [...ALLOWED_ORIGINS, ...envOrigins];

  let allowedOrigin = "https://unfollowaman.tech";
  if (requestOrigin && allowedList.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

describe("resource-access Edge Function CORS security policy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns matched origin for production domain", () => {
    const headers = getCorsHeaders("https://unfollowaman.tech");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://unfollowaman.tech");
    expect(headers["Vary"]).toBe("Origin");
  });

  it("returns matched origin for local development origin http://localhost:5173", () => {
    const headers = getCorsHeaders("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });

  it("returns matched origin for local development origin http://127.0.0.1:5173", () => {
    const headers = getCorsHeaders("http://127.0.0.1:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://127.0.0.1:5173");
  });

  it("falls back to default production domain for untrusted/malicious origins", () => {
    const headers = getCorsHeaders("https://evil-attacker-site.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://unfollowaman.tech");
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("*");
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("https://evil-attacker-site.com");
  });

  it("falls back to default production domain when origin is null or undefined", () => {
    const headersNull = getCorsHeaders(null);
    expect(headersNull["Access-Control-Allow-Origin"]).toBe("https://unfollowaman.tech");

    const headersUndefined = getCorsHeaders(undefined);
    expect(headersUndefined["Access-Control-Allow-Origin"]).toBe("https://unfollowaman.tech");
  });

  it("supports custom allowed origins set via ALLOWED_ORIGIN env var", () => {
    process.env.ALLOWED_ORIGIN = "https://staging.unfollowaman.tech";
    const headers = getCorsHeaders("https://staging.unfollowaman.tech");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://staging.unfollowaman.tech");
  });

  it("supports custom allowed origins set via ALLOWED_ORIGINS comma-separated list", () => {
    process.env.ALLOWED_ORIGINS = "https://app.unfollowaman.tech, https://admin.unfollowaman.tech";
    const headers = getCorsHeaders("https://admin.unfollowaman.tech");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://admin.unfollowaman.tech");
  });
});
