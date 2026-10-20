import { describe, expect, it, vi } from 'vitest';
import {
  TAG_COLOR_HEX,
  randomColorIndex,
  resolveTagBadgeStyle,
  resolveTagColorHex,
  resolveTagTintHex
} from './tagColors';

describe('tagColors', () => {
  it('returns explicit palette color when colorIndex exists', () => {
    expect(resolveTagColorHex({ name: 'Honors', colorIndex: 1 })).toBe(TAG_COLOR_HEX[1]);
  });

  it('wraps out-of-range and negative color indexes safely', () => {
    expect(resolveTagColorHex({ name: 'Honors', colorIndex: -1 })).toBe(
      TAG_COLOR_HEX[TAG_COLOR_HEX.length - 1]
    );
    expect(resolveTagColorHex({ name: 'Honors', colorIndex: TAG_COLOR_HEX.length + 1 })).toBe(
      TAG_COLOR_HEX[1]
    );
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

  it('has an expanded palette', () => {
    expect(TAG_COLOR_HEX.length).toBeGreaterThanOrEqual(16);
  });

  it('resolves badge styles with fallback', () => {
    expect(resolveTagBadgeStyle({ name: 'Honors', colorIndex: 0 })).toContain('background-color');
    expect(resolveTagBadgeStyle({ name: 'Honors' })).toBe(resolveTagBadgeStyle({ name: 'Honors' }));
    expect(resolveTagBadgeStyle({ name: 'Honors', colorIndex: -1 })).toContain('color:');
  });

  it('uses a very light tint', () => {
    const tint = resolveTagTintHex({ name: 'Honors', colorIndex: 3 });
    const channels = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16));
    expect(Math.min(...channels)).toBeGreaterThanOrEqual(255 * 0.9);
  });

  it('returns a light background tint distinct from the saturated tag color', () => {
    expect(resolveTagTintHex({ name: 'Honors', colorIndex: 0 })).not.toBe(TAG_COLOR_HEX[0]);
    expect(resolveTagTintHex({ name: 'Honors', colorIndex: 0 })).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
