/**
 * Cryptographic helper module for Web Push (RFC 8291, RFC 8188, RFC 8292 VAPID).
 * Implements VAPID JWT generation/ES256 signing and AES-128-GCM payload encryption
 * using native Web Crypto APIs in Deno.
 */

// Exact Protocol and HTTP Body Framing Constants
export const HEADER_SIZE = 86; // RFC 8188 header: 16B salt + 4B rs + 1B idlen + 65B sender pubkey
export const GCM_TAG_SIZE = 16; // AES-GCM 128-bit authentication tag
export const DELIMITER_SIZE = 1; // RFC 8188 end-of-record delimiter (0x02)
export const DEFAULT_RECORD_SIZE = 4096; // RFC 8188 default record size
export const MAX_PAYLOAD_BODY_BYTES = 4096; // Maximum encrypted HTTP body size

// Maximum plaintext payload size for a single record fitting within MAX_PAYLOAD_BODY_BYTES (3,993 bytes)
export const MAX_PLAINTEXT_BYTES =
  MAX_PAYLOAD_BODY_BYTES - HEADER_SIZE - GCM_TAG_SIZE - DELIMITER_SIZE;

/**
 * Encodes a Uint8Array into a Base64URL string (RFC 4648 §5).
 */
export function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decodes a Base64URL string into a Uint8Array.
 */
export function base64UrlDecode(input: string): Uint8Array {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Invalid Base64URL string: Input must be a non-empty string");
  }

  let base64 = input.trim().replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  let binary: string;
  try {
    binary = atob(base64);
  } catch (_e) {
    throw new Error("Invalid Base64URL string: Failed to decode base64 string");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * PKCS#8 ASN.1 prefix header for 32-byte P-256 private keys without optional public key tag.
 */
const P256_PKCS8_PREFIX = new Uint8Array([
  0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
  0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
  0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
]);

/**
 * Subject Public Key Info (SPKI) ASN.1 prefix header for 65-byte uncompressed P-256 public keys.
 */
const P256_SPKI_PREFIX = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
  0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
  0x42, 0x00,
]);

/**
 * Imports a Base64URL VAPID private key into a CryptoKey for signing or derivation.
 * Supports both 32-byte raw uncompressed private scalars and full PKCS#8 DER bytes.
 */
export async function importVapidPrivateKey(
  privateKeyBase64Url: string,
  keyUsage: KeyUsage = "sign",
  algorithmName: "ECDSA" | "ECDH" = "ECDSA"
): Promise<CryptoKey> {
  let privateKeyBytes: Uint8Array;
  try {
    privateKeyBytes = base64UrlDecode(privateKeyBase64Url);
  } catch (_e) {
    throw new Error("Invalid VAPID private key: Malformed Base64URL string");
  }

  let pkcs8Der: Uint8Array;

  if (privateKeyBytes.length === 32) {
    // 32-byte raw scalar: wrap with standard P-256 PKCS#8 header
    pkcs8Der = new Uint8Array(P256_PKCS8_PREFIX.length + 32);
    pkcs8Der.set(P256_PKCS8_PREFIX, 0);
    pkcs8Der.set(privateKeyBytes, P256_PKCS8_PREFIX.length);
  } else if (privateKeyBytes.length >= 64 && privateKeyBytes.length <= 256) {
    // Full PKCS#8 DER structure
    pkcs8Der = privateKeyBytes;
  } else {
    throw new Error(
      `Invalid VAPID private key length: Expected 32 raw bytes or PKCS#8 DER bytes, got ${privateKeyBytes.length}`
    );
  }

  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Der as unknown as BufferSource,
      { name: algorithmName, namedCurve: "P-256" },
      false,
      [keyUsage]
    );
  } catch (_e) {
    throw new Error("Invalid VAPID private key: CryptoKey import failed");
  }
}

/**
 * Imports a 65-byte uncompressed Base64URL VAPID public key into a CryptoKey for verification.
 */
export async function importVapidPublicKey(
  publicKeyBase64Url: string,
  algorithmName: "ECDSA" | "ECDH" = "ECDSA",
  keyUsages: KeyUsage[] = ["verify"]
): Promise<CryptoKey> {
  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = base64UrlDecode(publicKeyBase64Url);
  } catch (_e) {
    throw new Error("Invalid VAPID public key: Malformed Base64URL string");
  }

  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid VAPID public key length: Expected 65 bytes, got ${publicKeyBytes.length}`);
  }

  if (publicKeyBytes[0] !== 0x04) {
    throw new Error("Invalid VAPID public key: Must begin with uncompressed point format byte 0x04");
  }

  if (algorithmName === "ECDH") {
    try {
      return await crypto.subtle.importKey(
        "raw",
        publicKeyBytes as unknown as BufferSource,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        keyUsages
      );
    } catch (_e) {
      throw new Error("Invalid VAPID public key: ECDH CryptoKey import failed");
    }
  }

  const spkiDer = new Uint8Array(P256_SPKI_PREFIX.length + 65);
  spkiDer.set(P256_SPKI_PREFIX, 0);
  spkiDer.set(publicKeyBytes, P256_SPKI_PREFIX.length);

  try {
    return await crypto.subtle.importKey(
      "spki",
      spkiDer as unknown as BufferSource,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      keyUsages
    );
  } catch (_e) {
    throw new Error("Invalid VAPID public key: ECDSA CryptoKey import failed");
  }
}

/**
 * Validates that a pair of Base64URL VAPID public and private keys are valid P-256 keys
 * and form a matching key pair.
 */
export async function validateVapidKeys(
  publicKeyBase64Url: string,
  privateKeyBase64Url: string
): Promise<{ valid: boolean; error?: string }> {
  let privateKey: CryptoKey;
  let publicKey: CryptoKey;

  try {
    privateKey = await importVapidPrivateKey(privateKeyBase64Url, "sign", "ECDSA");
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Invalid VAPID private key" };
  }

  try {
    publicKey = await importVapidPublicKey(publicKeyBase64Url, "ECDSA", ["verify"]);
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Invalid VAPID public key" };
  }

  // Test signature and verification to ensure public and private key match
  try {
    const testData = new TextEncoder().encode("vapid-keypair-pair-verification");
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      testData as unknown as BufferSource
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      testData as unknown as BufferSource
    );

    if (!valid) {
      return { valid: false, error: "VAPID keypair mismatch: Public key does not correspond to private key" };
    }
    return { valid: true };
  } catch (_e) {
    return { valid: false, error: "VAPID keypair verification failed" };
  }
}

/**
 * Validates a Web Push endpoint URL against Horizon's push provider allowlist
 * and extracts its HTTPS origin as the VAPID audience.
 */
export function extractVapidAudience(endpoint: string): { valid: boolean; audience?: string; error?: string } {
  if (typeof endpoint !== "string" || !endpoint.trim()) {
    return { valid: false, error: "Endpoint must be a non-empty string" };
  }

  if (endpoint.length > 2048) {
    return { valid: false, error: "Push endpoint URL exceeds maximum length" };
  }

  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch (_e) {
    return { valid: false, error: "Malformed endpoint URL" };
  }

  if (url.protocol !== "https:") {
    return { valid: false, error: "Endpoint URL protocol must be HTTPS" };
  }

  if (url.username || url.password) {
    return { valid: false, error: "Push endpoint must not contain user credentials" };
  }

  if (url.hash) {
    return { valid: false, error: "Push endpoint must not contain URL fragments" };
  }

  if (url.port && url.port !== "443") {
    return { valid: false, error: "Push endpoint must use standard HTTPS port (443)" };
  }

  const hostname = url.hostname.toLowerCase();

  // Reject IP addresses and localhost
  const isIpOrLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    /^\[?[a-fA-F0-9:]+\]?$/.test(hostname);

  if (isIpOrLocal) {
    return { valid: false, error: "Push endpoint host is not allowed" };
  }

  // Approved hostnames and domain suffix rules
  const isExactMatch =
    hostname === "fcm.googleapis.com" ||
    hostname === "updates.push.services.mozilla.com";

  const isApplePush =
    hostname === "push.apple.com" ||
    hostname.endsWith(".push.apple.com") ||
    /^([a-z0-9-]+-)?push\.apple\.com$/.test(hostname);

  const isAllowedSuffix =
    isApplePush ||
    hostname === "notify.windows.com" || hostname.endsWith(".notify.windows.com") ||
    hostname === "push.opera.com" || hostname.endsWith(".push.opera.com");

  if (!isExactMatch && !isAllowedSuffix) {
    return { valid: false, error: "Push endpoint host is not in the approved allowlist" };
  }

  return { valid: true, audience: url.origin };
}

export interface CreateVapidJwtOptions {
  endpoint: string;
  subscriber: string; // 'mailto:...' or HTTPS URL
  privateKeyBase64Url: string;
  expirationSeconds?: number; // Defaults to 12 hours (43200 seconds), max 24h per RFC 8292
}

/**
 * Generates an RFC 8292 VAPID JWT signed with ES256.
 */
export async function createVapidJwt(options: CreateVapidJwtOptions): Promise<string> {
  const audResult = extractVapidAudience(options.endpoint);
  if (!audResult.valid || !audResult.audience) {
    throw new Error(audResult.error || "Invalid endpoint URL for VAPID audience derivation");
  }

  if (typeof options.subscriber !== "string" || !options.subscriber.trim()) {
    throw new Error("VAPID subscriber claim (sub) must be a non-empty string");
  }

  const sub = options.subscriber.trim();
  if (!sub.startsWith("mailto:") && !sub.startsWith("https://")) {
    throw new Error("VAPID subscriber claim (sub) must begin with 'mailto:' or 'https://'");
  }

  const privateKey = await importVapidPrivateKey(options.privateKeyBase64Url, "sign", "ECDSA");

  const expSec = options.expirationSeconds ?? 43200; // 12 hours default
  if (!Number.isFinite(expSec) || expSec <= 0 || expSec > 86400) {
    throw new Error("VAPID JWT expirationSeconds must be a finite number between 1 and 86400 seconds (max 24 hours)");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(expSec);

  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const payload = {
    aud: audResult.audience,
    sub,
    exp,
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken) as unknown as BufferSource
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Verifies an ES256 VAPID JWT against a VAPID public key.
 */
export async function verifyVapidJwt(
  jwt: string,
  publicKeyBase64Url: string,
  expectedAudience?: string
): Promise<{ valid: boolean; claims?: Record<string, unknown>; error?: string }> {
  if (typeof jwt !== "string" || !jwt.trim()) {
    return { valid: false, error: "JWT must be a non-empty string" };
  }

  const parts = jwt.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT: Must contain 3 parts separated by dots" };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let headerObj: Record<string, unknown>;
  let payloadObj: Record<string, unknown>;
  let signatureBytes: Uint8Array;

  try {
    headerObj = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader)));
    payloadObj = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
    signatureBytes = base64UrlDecode(encodedSignature);
  } catch (_e) {
    return { valid: false, error: "Malformed JWT header, payload, or signature encoding" };
  }

  if (headerObj.alg !== "ES256") {
    return { valid: false, error: `Unsupported JWT algorithm: Expected 'ES256', got '${headerObj.alg}'` };
  }

  // Validate presence and types of required VAPID JWT claims
  if (typeof payloadObj.aud !== "string" || !payloadObj.aud.trim()) {
    return { valid: false, error: "Missing or invalid 'aud' claim in VAPID JWT" };
  }

  if (typeof payloadObj.sub !== "string" || !payloadObj.sub.trim()) {
    return { valid: false, error: "Missing or invalid 'sub' claim in VAPID JWT" };
  }

  if (typeof payloadObj.exp !== "number" || !Number.isFinite(payloadObj.exp)) {
    return { valid: false, error: "Missing or invalid 'exp' claim in VAPID JWT" };
  }

  let publicKey: CryptoKey;
  try {
    publicKey = await importVapidPublicKey(publicKeyBase64Url, "ECDSA", ["verify"]);
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Invalid VAPID public key" };
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signatureBytes as unknown as BufferSource,
    new TextEncoder().encode(unsignedToken) as unknown as BufferSource
  );

  if (!verified) {
    return { valid: false, error: "Invalid JWT signature" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payloadObj.exp < now) {
    return { valid: false, error: "VAPID JWT has expired" };
  }

  if (expectedAudience && payloadObj.aud !== expectedAudience) {
    return {
      valid: false,
      error: `VAPID JWT audience mismatch: Expected '${expectedAudience}', got '${payloadObj.aud}'`,
    };
  }

  return { valid: true, claims: payloadObj };
}

/**
 * Creates the RFC 8292 standard Authorization header for VAPID.
 * Format: `vapid t=<JWT>, k=<PublicKeyBase64Url>`
 */
export async function createVapidHeaders(options: {
  endpoint: string;
  subscriber: string;
  privateKeyBase64Url: string;
  publicKeyBase64Url: string;
  expirationSeconds?: number;
}): Promise<{ Authorization: string }> {
  const jwt = await createVapidJwt({
    endpoint: options.endpoint,
    subscriber: options.subscriber,
    privateKeyBase64Url: options.privateKeyBase64Url,
    expirationSeconds: options.expirationSeconds,
  });

  return {
    Authorization: `vapid t=${jwt}, k=${options.publicKeyBase64Url}`,
  };
}

export interface EncryptWebPushOptions {
  payload: string | Uint8Array;
  p256dhBase64Url: string; // Subscriber public key (65 bytes uncompressed)
  authBase64Url: string;   // Subscriber auth secret (16 bytes)
  recordSize?: number;     // Record size in bytes, default 4096
}

export interface EncryptedWebPushResult {
  body: Uint8Array;
  contentEncoding: "aes128gcm";
}

/**
 * Encrypts a payload for Web Push delivery following RFC 8291 and RFC 8188 (aes128gcm).
 */
export async function encryptWebPushPayload(
  options: EncryptWebPushOptions
): Promise<EncryptedWebPushResult> {
  let plaintextBytes: Uint8Array;
  if (typeof options.payload === "string") {
    plaintextBytes = new TextEncoder().encode(options.payload);
  } else if (options.payload instanceof Uint8Array) {
    plaintextBytes = options.payload;
  } else {
    throw new Error("Invalid payload: Must be a string or Uint8Array");
  }

  const rs = options.recordSize ?? DEFAULT_RECORD_SIZE;
  if (!Number.isFinite(rs) || rs < 18 || rs > 65536) {
    throw new Error("Invalid recordSize: Must be an integer between 18 and 65536 bytes");
  }

  // Calculate maximum plaintext size for a single record given record size rs
  // Record overhead per record = 1 byte delimiter (0x02) + 16 bytes GCM auth tag
  const maxPlaintextForRecord = rs - GCM_TAG_SIZE - DELIMITER_SIZE;

  // Enforce both record size boundary and global HTTP body size limit
  if (plaintextBytes.length > maxPlaintextForRecord || plaintextBytes.length > MAX_PLAINTEXT_BYTES) {
    throw new Error(
      `Payload plaintext length (${plaintextBytes.length} bytes) exceeds maximum permitted size of ${Math.min(
        maxPlaintextForRecord,
        MAX_PLAINTEXT_BYTES
      )} bytes`
    );
  }

  // 1. Decode client subscription encryption keys
  let clientPubRaw: Uint8Array;
  let clientAuth: Uint8Array;

  try {
    clientPubRaw = base64UrlDecode(options.p256dhBase64Url);
  } catch (_e) {
    throw new Error("Invalid subscription key (p256dh): Malformed Base64URL string");
  }

  if (clientPubRaw.length !== 65 || clientPubRaw[0] !== 0x04) {
    throw new Error("Invalid subscription key (p256dh): Must be 65 uncompressed bytes starting with 0x04");
  }

  try {
    clientAuth = base64UrlDecode(options.authBase64Url);
  } catch (_e) {
    throw new Error("Invalid subscription key (auth): Malformed Base64URL string");
  }

  if (clientAuth.length < 16) {
    throw new Error("Invalid subscription key (auth): Must be at least 16 bytes");
  }

  // 2. Import client public key for ECDH
  let clientCryptoKey: CryptoKey;
  try {
    clientCryptoKey = await crypto.subtle.importKey(
      "raw",
      clientPubRaw as unknown as BufferSource,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
  } catch (_e) {
    throw new Error("Invalid subscription key (p256dh): ECDH public key import failed");
  }

  // 3. Sender generates ephemeral ECDH keypair and random 16-byte salt
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", senderKeyPair.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 4. Derive ECDH shared secret
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientCryptoKey },
      senderKeyPair.privateKey,
      256
    )
  );

  // 5. RFC 8291 §3.2 Derive Input Keying Material (IKM) using HKDF-Extract
  // info = "WebPush: info\0" + clientPubRaw + senderPubRaw
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikmInfo = new Uint8Array(infoPrefix.length + clientPubRaw.length + senderPubRaw.length);
  ikmInfo.set(infoPrefix, 0);
  ikmInfo.set(clientPubRaw, infoPrefix.length);
  ikmInfo.set(senderPubRaw, infoPrefix.length + clientPubRaw.length);

  const ecdhHkdfKey = await crypto.subtle.importKey(
    "raw",
    ecdhSecret as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: clientAuth as unknown as BufferSource, info: ikmInfo as unknown as BufferSource },
      ecdhHkdfKey,
      256
    )
  );

  // 6. RFC 8188 §2 Derive CEK (Content-Encryption Key) and Nonce
  const prkKey = await crypto.subtle.importKey(
    "raw",
    ikm as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as unknown as BufferSource, info: cekInfo as unknown as BufferSource },
    prkKey,
    128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as unknown as BufferSource, info: nonceInfo as unknown as BufferSource },
    prkKey,
    96
  );

  const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);
  const nonce = new Uint8Array(nonceBits);

  // 7. Record framing and encryption (RFC 8188 §2)
  // Record layout for single record: [plaintext] [delimiter 0x02] [padding]
  const record = new Uint8Array(plaintextBytes.length + 1);
  record.set(plaintextBytes, 0);
  record[plaintextBytes.length] = 0x02; // End of record delimiter for last record

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce as unknown as BufferSource },
    cek,
    record as unknown as BufferSource
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  // 8. Construct RFC 8188 Header
  // [16B salt] [4B rs] [1B idlen] [65B sender public key] [ciphertext]
  const keyidLen = senderPubRaw.length; // 65
  const header = new Uint8Array(HEADER_SIZE);

  header.set(salt, 0);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  view.setUint32(16, rs, false); // Big-endian record size
  header[20] = keyidLen;
  header.set(senderPubRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);

  return {
    body,
    contentEncoding: "aes128gcm",
  };
}

/**
 * Decrypts an RFC 8188 / RFC 8291 Web Push payload (used for test verification).
 */
export async function decryptWebPushPayload(options: {
  encryptedBody: Uint8Array;
  clientPrivateKey: CryptoKey;
  clientAuth: Uint8Array;
}): Promise<Uint8Array> {
  const body = options.encryptedBody;
  if (body.length < HEADER_SIZE) {
    throw new Error("Invalid encrypted message length: Header too short");
  }

  const salt = body.subarray(0, 16);
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const _rs = view.getUint32(16, false);
  const idlen = body[20];

  if (idlen !== 65) {
    throw new Error(`Invalid keyid length in RFC 8188 header: Expected 65, got ${idlen}`);
  }

  const senderPubRaw = body.subarray(21, 21 + 65);
  const ciphertext = body.subarray(HEADER_SIZE);

  // Client public key
  const clientKeyPairJwk = await crypto.subtle.exportKey("jwk", options.clientPrivateKey);
  // Re-import sender public key for ECDH
  const senderCryptoKey = await crypto.subtle.importKey(
    "raw",
    senderPubRaw as unknown as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Client derives shared secret
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: senderCryptoKey },
      options.clientPrivateKey,
      256
    )
  );

  // Derive client public key bytes from exported JWK
  if (!clientKeyPairJwk.x || !clientKeyPairJwk.y) {
    throw new Error("Client private key JWK missing x or y coordinates");
  }
  const xBytes = base64UrlDecode(clientKeyPairJwk.x);
  const yBytes = base64UrlDecode(clientKeyPairJwk.y);
  const clientPubRaw = new Uint8Array(65);
  clientPubRaw[0] = 0x04;
  clientPubRaw.set(xBytes, 1);
  clientPubRaw.set(yBytes, 33);

  // HKDF IKM
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikmInfo = new Uint8Array(infoPrefix.length + clientPubRaw.length + senderPubRaw.length);
  ikmInfo.set(infoPrefix, 0);
  ikmInfo.set(clientPubRaw, infoPrefix.length);
  ikmInfo.set(senderPubRaw, infoPrefix.length + clientPubRaw.length);

  const ecdhHkdfKey = await crypto.subtle.importKey(
    "raw",
    ecdhSecret as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: options.clientAuth as unknown as BufferSource, info: ikmInfo as unknown as BufferSource },
      ecdhHkdfKey,
      256
    )
  );

  // Derive CEK and Nonce
  const prkKey = await crypto.subtle.importKey(
    "raw",
    ikm as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as unknown as BufferSource, info: cekInfo as unknown as BufferSource },
    prkKey,
    128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as unknown as BufferSource, info: nonceInfo as unknown as BufferSource },
    prkKey,
    96
  );

  const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["decrypt"]);
  const nonce = new Uint8Array(nonceBits);

  const decryptedRecord = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce as unknown as BufferSource },
      cek,
      ciphertext as unknown as BufferSource
    )
  );

  // Strip RFC 8188 record padding and delimiter 0x02
  const delimiterPos = decryptedRecord.length - 1;
  if (decryptedRecord[delimiterPos] !== 0x02) {
    throw new Error("Invalid record delimiter: Expected 0x02");
  }

  return decryptedRecord.subarray(0, delimiterPos);
}
