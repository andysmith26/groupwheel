import { describe, it, expect } from 'vitest';

/**
 * Pure coverage computation — extracted here for testing.
 * Mirrors the logic used in RotationCoverageCard.svelte.
 */
function computeCoverage(pairCount: number, studentCount: number): number {
  const totalPossible = (studentCount * (studentCount - 1)) / 2;
  if (totalPossible === 0) return 0;
  return Math.round((pairCount / totalPossible) * 100);
}

describe('computeCoverage', () => {
  it('returns 0 when no pairs', () => {
    expect(computeCoverage(0, 24)).toBe(0);
  });

  it('returns 100 when all pairs covered', () => {
    // C(24,2) = 276
    expect(computeCoverage(276, 24)).toBe(100);
  });

  it('rounds correctly', () => {
    // 130/276 = 0.4710... → 47%
    expect(computeCoverage(130, 24)).toBe(47);
  });

  it('handles edge case of 1 student', () => {
    // C(1,2) = 0, avoid division by zero
    expect(computeCoverage(0, 1)).toBe(0);
  });

  it('handles edge case of 0 students', () => {
    expect(computeCoverage(0, 0)).toBe(0);
  });
});
