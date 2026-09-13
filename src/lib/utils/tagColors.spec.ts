import { describe, expect, it, vi } from 'vitest';
import {
  TAG_COLOR_HEX,
  randomColorIndex,
  resolveTagBadgeClasses,
  resolveTagColorHex
} from './tagColors';

describe('tagColors', () => {
  it('returns explicit palette color when colorIndex exists', () => {
    expect(resolveTagColorHex({ name: 'Honors', colorIndex: 1 })).toBe(TAG_COLOR_HEX[1]);
  });

  it('falls back deterministically when colorIndex is missing', () => {
    const a = resolveTagColorHex({ name: 'Honors' });
    const b = resolveTagColorHex({ name: 'Honors' });
    expect(a).toBe(b);
  });

  it('returns a palette-constrained random index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(randomColorIndex()).toBeLessThan(TAG_COLOR_HEX.length);
    vi.restoreAllMocks();
  });

  it('resolves badge classes with fallback', () => {
    expect(resolveTagBadgeClasses({ name: 'Honors', colorIndex: 0 })).toContain('bg-');
    expect(resolveTagBadgeClasses({ name: 'Honors' })).toContain('bg-');
  });
});
