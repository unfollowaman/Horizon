import { assertEquals, assertRejects, assertMatch } from "jsr:@std/assert@1";
import {
  base64UrlEncode,
  base64UrlDecode,
  importVapidPrivateKey,
  importVapidPublicKey,
  validateVapidKeys,
  extractVapidAudience,
  createVapidJwt,
  verifyVapidJwt,
  createVapidHeaders,
  encryptWebPushPayload,
  decryptWebPushPayload,
  MAX_PAYLOAD_BYTES,
} from "./vapid.ts";

/**
 * Helper to generate a valid VAPID P-256 key pair in Base64URL format for offline tests.
 */
async function generateTestVapidKeyPair(): Promise<{
  publicKeyBase64Url: string;
  privateKeyBase64Url: string;
  privateCryptoKey: CryptoKey;
  publicCryptoKey: CryptoKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  if (!jwk.d || !jwk.x || !jwk.y) {
    throw new Error("Exported JWK missing d, x, or y coordinates");
  }

  const dBytes = base64UrlDecode(jwk.d);
  const xBytes = base64UrlDecode(jwk.x);
  const yBytes = base64UrlDecode(jwk.y);

  const pubBytes = new Uint8Array(65);
  pubBytes[0] = 0x04;
  pubBytes.set(xBytes, 1);
  pubBytes.set(yBytes, 33);

  return {
    privateKeyBase64Url: base64UrlEncode(dBytes),
    publicKeyBase64Url: base64UrlEncode(pubBytes),
    privateCryptoKey: keyPair.privateKey,
    publicCryptoKey: keyPair.publicKey,
  };
}

/**
 * Helper to generate a simulated client subscription (p256dh public key & auth secret)
 * for encryption/decryption tests.
 */
async function generateTestSubscriberKeys(): Promise<{
  p256dhBase64Url: string;
  authBase64Url: string;
  clientPrivateKey: CryptoKey;
  clientAuthBytes: Uint8Array;
}> {
  const clientKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const clientPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", clientKeyPair.publicKey));
  const clientAuthBytes = crypto.getRandomValues(new Uint8Array(16));

  return {
    p256dhBase64Url: base64UrlEncode(clientPubRaw),
    authBase64Url: base64UrlEncode(clientAuthBytes),
    clientPrivateKey: clientKeyPair.privateKey,
    clientAuthBytes,
  };
}

// --- Base64URL Tests ---

Deno.test("Base64URL - roundtrip encode and decode", () => {
  const original = new Uint8Array([0, 1, 2, 255, 128, 64, 32, 16]);
  const encoded = base64UrlEncode(original);
  assertEquals(typeof encoded, "string");
  assertEquals(encoded.includes("+"), false);
  assertEquals(encoded.includes("/"), false);
  assertEquals(encoded.includes("="), false);

  const decoded = base64UrlDecode(encoded);
  assertEquals(decoded, original);
});

Deno.test("Base64URL - reject empty or malformed inputs", () => {
  assertRejects(
    async () => {
      base64UrlDecode("");
    },
    Error,
    "Invalid Base64URL string"
  );

  assertRejects(
    async () => {
      base64UrlDecode("!!!invalid-base64!!!");
    },
    Error,
    "Invalid Base64URL string"
  );
});

// --- Key Import & Validation Tests ---

Deno.test("Key Validation - import and validate matching VAPID keypair", async () => {
  const keyPair = await generateTestVapidKeyPair();

  const validation = await validateVapidKeys(
    keyPair.publicKeyBase64Url,
    keyPair.privateKeyBase64Url
  );

  assertEquals(validation.valid, true);
  assertEquals(validation.error, undefined);
});

Deno.test("Key Validation - detect mismatched public and private keys", async () => {
  const keyPair1 = await generateTestVapidKeyPair();
  const keyPair2 = await generateTestVapidKeyPair();

  const validation = await validateVapidKeys(
    keyPair1.publicKeyBase64Url,
    keyPair2.privateKeyBase64Url
  );

  assertEquals(validation.valid, false);
  assertMatch(validation.error || "", /VAPID keypair mismatch/);
});

Deno.test("Key Validation - reject invalid private key length", async () => {
  const shortPrivKey = base64UrlEncode(new Uint8Array(31)); // 31 bytes instead of 32
  const keyPair = await generateTestVapidKeyPair();

  await assertRejects(
    async () => {
      await importVapidPrivateKey(shortPrivKey);
    },
    Error,
    "Expected 32 bytes, got 31"
  );

  const validation = await validateVapidKeys(keyPair.publicKeyBase64Url, shortPrivKey);
  assertEquals(validation.valid, false);
});

Deno.test("Key Validation - reject invalid public key length or format", async () => {
  const shortPubKey = base64UrlEncode(new Uint8Array(64)); // 64 bytes instead of 65
  await assertRejects(
    async () => {
      await importVapidPublicKey(shortPubKey);
    },
    Error,
    "Expected 65 bytes, got 64"
  );

  const badHeaderPubKey = new Uint8Array(65);
  badHeaderPubKey[0] = 0x02; // Compressed point format instead of 0x04
  await assertRejects(
    async () => {
      await importVapidPublicKey(base64UrlEncode(badHeaderPubKey));
    },
    Error,
    "Must begin with uncompressed point format byte 0x04"
  );
});

// --- Endpoint Validation Tests ---

Deno.test("Endpoint - extract valid HTTPS origin for VAPID audience", () => {
  const fcmResult = extractVapidAudience("https://fcm.googleapis.com/fcm/send/sub-id-123");
  assertEquals(fcmResult.valid, true);
  assertEquals(fcmResult.audience, "https://fcm.googleapis.com");

  const mozillaResult = extractVapidAudience("https://updates.push.services.mozilla.com/wpush/v2/sub-id-456");
  assertEquals(mozillaResult.valid, true);
  assertEquals(mozillaResult.audience, "https://updates.push.services.mozilla.com");

  const appleResult = extractVapidAudience("https://p01-push.apple.com/sub-id-789");
  assertEquals(appleResult.valid, true);
  assertEquals(appleResult.audience, "https://p01-push.apple.com");
});

Deno.test("Endpoint - reject non-HTTPS or invalid URLs", () => {
  const httpResult = extractVapidAudience("http://fcm.googleapis.com/fcm/send/sub-id-123");
  assertEquals(httpResult.valid, false);
  assertMatch(httpResult.error || "", /protocol must be HTTPS/);

  const malformedResult = extractVapidAudience("not-a-valid-url");
  assertEquals(malformedResult.valid, false);
  assertMatch(malformedResult.error || "", /Malformed endpoint URL/);
});

// --- VAPID JWT Generation & Verification Tests ---

Deno.test("VAPID JWT - structure, claims, and signature verification", async () => {
  const keyPair = await generateTestVapidKeyPair();
  const endpoint = "https://fcm.googleapis.com/fcm/send/sub-123";
  const subscriber = "mailto:admin@horizon.edu";

  const jwt = await createVapidJwt({
    endpoint,
    subscriber,
    privateKeyBase64Url: keyPair.privateKeyBase64Url,
    expirationSeconds: 3600,
  });

  const parts = jwt.split(".");
  assertEquals(parts.length, 3);

  const verification = await verifyVapidJwt(
    jwt,
    keyPair.publicKeyBase64Url,
    "https://fcm.googleapis.com"
  );

  assertEquals(verification.valid, true);
  assertEquals(verification.claims?.aud, "https://fcm.googleapis.com");
  assertEquals(verification.claims?.sub, "mailto:admin@horizon.edu");
  assertEquals(typeof verification.claims?.exp, "number");
});

Deno.test("VAPID JWT - detect signature mismatch or wrong public key", async () => {
  const keyPair1 = await generateTestVapidKeyPair();
  const keyPair2 = await generateTestVapidKeyPair();

  const jwt = await createVapidJwt({
    endpoint: "https://updates.push.services.mozilla.com/wpush/v2/sub-123",
    subscriber: "mailto:admin@horizon.edu",
    privateKeyBase64Url: keyPair1.privateKeyBase64Url,
  });

  const verification = await verifyVapidJwt(
    jwt,
    keyPair2.publicKeyBase64Url,
    "https://updates.push.services.mozilla.com"
  );

  assertEquals(verification.valid, false);
  assertMatch(verification.error || "", /Invalid JWT signature/);
});

Deno.test("VAPID JWT - reject expired JWT tokens", async () => {
  const keyPair = await generateTestVapidKeyPair();

  // Construct an expired JWT manually with exp in the past
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: "https://fcm.googleapis.com",
    sub: "mailto:admin@horizon.edu",
    exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importVapidPrivateKey(keyPair.privateKeyBase64Url, "sign");
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken) as unknown as BufferSource
  );
  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signatureBuffer))}`;

  const verification = await verifyVapidJwt(
    jwt,
    keyPair.publicKeyBase64Url,
    "https://fcm.googleapis.com"
  );

  assertEquals(verification.valid, false);
  assertMatch(verification.error || "", /VAPID JWT has expired/);
});

Deno.test("VAPID Authorization Header - correct RFC 8292 formatting", async () => {
  const keyPair = await generateTestVapidKeyPair();

  const headers = await createVapidHeaders({
    endpoint: "https://fcm.googleapis.com/fcm/send/sub-123",
    subscriber: "mailto:admin@horizon.edu",
    privateKeyBase64Url: keyPair.privateKeyBase64Url,
    publicKeyBase64Url: keyPair.publicKeyBase64Url,
  });

  assertEquals(typeof headers.Authorization, "string");
  assertMatch(headers.Authorization, /^vapid t=.+, k=.+$/);
});

// --- RFC 8291 & RFC 8188 Web Push Payload Encryption Tests ---

Deno.test("Payload Encryption - full RFC 8291 / RFC 8188 roundtrip encryption and decryption", async () => {
  const subscriber = await generateTestSubscriberKeys();
  const notificationPayload = JSON.stringify({
    title: "New Note Uploaded",
    body: "Class 10 Mathematics Chapter 4 notes are now available.",
    url: "/notes/math-ch4",
  });

  const encrypted = await encryptWebPushPayload({
    payload: notificationPayload,
    p256dhBase64Url: subscriber.p256dhBase64Url,
    authBase64Url: subscriber.authBase64Url,
  });

  assertEquals(encrypted.contentEncoding, "aes128gcm");
  assertEquals(encrypted.body instanceof Uint8Array, true);

  // Decrypt using subscriber keys to verify protocol correctness
  const decryptedBytes = await decryptWebPushPayload({
    encryptedBody: encrypted.body,
    clientPrivateKey: subscriber.clientPrivateKey,
    clientAuth: subscriber.clientAuthBytes,
  });

  const decryptedText = new TextDecoder().decode(decryptedBytes);
  assertEquals(decryptedText, notificationPayload);
});

Deno.test("Payload Encryption - handle Uint8Array binary payloads", async () => {
  const subscriber = await generateTestSubscriberKeys();
  const rawBytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

  const encrypted = await encryptWebPushPayload({
    payload: rawBytes,
    p256dhBase64Url: subscriber.p256dhBase64Url,
    authBase64Url: subscriber.authBase64Url,
  });

  const decryptedBytes = await decryptWebPushPayload({
    encryptedBody: encrypted.body,
    clientPrivateKey: subscriber.clientPrivateKey,
    clientAuth: subscriber.clientAuthBytes,
  });

  assertEquals(decryptedBytes, rawBytes);
});

Deno.test("Payload Encryption - enforce MAX_PAYLOAD_BYTES limit boundary", async () => {
  const subscriber = await generateTestSubscriberKeys();

  const maxPayload = new Uint8Array(MAX_PAYLOAD_BYTES); // Exactly 4096 bytes
  const encryptedMax = await encryptWebPushPayload({
    payload: maxPayload,
    p256dhBase64Url: subscriber.p256dhBase64Url,
    authBase64Url: subscriber.authBase64Url,
  });
  assertEquals(encryptedMax.contentEncoding, "aes128gcm");

  const oversizedPayload = new Uint8Array(MAX_PAYLOAD_BYTES + 1); // 4097 bytes
  await assertRejects(
    async () => {
      await encryptWebPushPayload({
        payload: oversizedPayload,
        p256dhBase64Url: subscriber.p256dhBase64Url,
        authBase64Url: subscriber.authBase64Url,
      });
    },
    Error,
    "Payload exceeds maximum permitted size"
  );
});

Deno.test("Payload Encryption - reject malformed subscription materials", async () => {
  const badP256dh = base64UrlEncode(new Uint8Array(64)); // Invalid key length
  const validAuth = base64UrlEncode(new Uint8Array(16));

  await assertRejects(
    async () => {
      await encryptWebPushPayload({
        payload: "Test message",
        p256dhBase64Url: badP256dh,
        authBase64Url: validAuth,
      });
    },
    Error,
    "Must be 65 uncompressed bytes starting with 0x04"
  );

  const validP256dh = (await generateTestSubscriberKeys()).p256dhBase64Url;
  const shortAuth = base64UrlEncode(new Uint8Array(15)); // Short auth secret

  await assertRejects(
    async () => {
      await encryptWebPushPayload({
        payload: "Test message",
        p256dhBase64Url: validP256dh,
        authBase64Url: shortAuth,
      });
    },
    Error,
    "Must be at least 16 bytes"
  );
});

// --- Security & Error Sanitization Tests ---

Deno.test("Security - errors do not leak secret key material", async () => {
  const secretKeyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const secretKeyBase64Url = base64UrlEncode(secretKeyBytes);

  try {
    await importVapidPrivateKey(secretKeyBase64Url);
  } catch (e) {
    if (e instanceof Error) {
      assertEquals(e.message.includes(secretKeyBase64Url), false);
    }
  }
});
