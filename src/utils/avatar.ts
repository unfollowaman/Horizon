/**
 * Generates a non-negative 32-bit unsigned integer hash from a string ID.
 */
export function stableHash(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash) ^ id.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Deterministically returns one of six default avatar SVG asset paths
 * based on the provided user ID.
 */
export function getDefaultAvatar(userId?: string | null): string {
  if (!userId) {
    return '/assets/Avatars/avatar-1.svg';
  }
  const index = (stableHash(userId) % 6) + 1;
  return `/assets/Avatars/avatar-${index}.svg`;
}
