/**
 * Safely serializes an object to JSON for embedding inside HTML <script type="application/ld+json"> tags.
 * Replaces characters like <, >, &, \u2028, \u2029 with Unicode escape sequences to prevent script breakout XSS attacks.
 */
export function serializeJsonLd(data: unknown, space?: string | number): string {
  return JSON.stringify(data, null, space)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
