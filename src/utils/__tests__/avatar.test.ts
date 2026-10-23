import { describe, it, expect } from 'vitest';
import { stableHash, getDefaultAvatar } from '../avatar';

describe('avatar utility', () => {
  it('produces non-negative 32-bit integers from stableHash', () => {
    const ids = ['usr-1', 'usr-2', '00000000-0000-0000-0000-000000000000', 'a', 'xyz-999-abc'];
    ids.forEach((id) => {
      const hash = stableHash(id);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash)).toBe(true);
    });
  });

  it('returns deterministic avatar paths for given user IDs', () => {
    const id1 = 'user-abc-123';
    const id2 = 'user-xyz-789';

    expect(getDefaultAvatar(id1)).toBe(getDefaultAvatar(id1));
    expect(getDefaultAvatar(id2)).toBe(getDefaultAvatar(id2));
  });

  it('falls back to avatar-1.svg when no user ID is provided', () => {
    expect(getDefaultAvatar()).toBe('/assets/Avatars/avatar-1.svg');
    expect(getDefaultAvatar(null)).toBe('/assets/Avatars/avatar-1.svg');
    expect(getDefaultAvatar('')).toBe('/assets/Avatars/avatar-1.svg');
  });

  it('distributes user IDs across all six avatar indices', () => {
    const counts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const path = getDefaultAvatar(`user-id-sample-${i}`);
      counts.add(path);
    }
    // Verify all 6 avatar variants (1-6) are reachable across a sample of 100 IDs
    expect(counts.size).toBe(6);
    for (let i = 1; i <= 6; i++) {
      expect(counts.has(`/assets/Avatars/avatar-${i}.svg`)).toBe(true);
    }
  });
});
