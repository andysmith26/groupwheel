import { describe, it, expect } from 'vitest';
import {
  normalizeGroupName,
  ensureUniqueGroupName,
  ensureUniqueGroupNames
} from './ensureUniqueGroupNames';

describe('normalizeGroupName', () => {
  it('should trim whitespace', () => {
    expect(normalizeGroupName('  Group A  ')).toBe('Group A');
  });

  it('should return "Group" for empty string', () => {
    expect(normalizeGroupName('')).toBe('Group');
  });

  it('should return "Group" for whitespace-only string', () => {
    expect(normalizeGroupName('   ')).toBe('Group');
  });

  it('should preserve valid names', () => {
    expect(normalizeGroupName('Team Alpha')).toBe('Team Alpha');
  });
});

describe('ensureUniqueGroupName', () => {
  it('should return name as-is when no duplicates exist', () => {
    const used = new Set<string>();
    expect(ensureUniqueGroupName('Group A', used)).toBe('Group A');
  });

  it('should add suffix when duplicate exists', () => {
    const used = new Set<string>(['group a']);
    const result = ensureUniqueGroupName('Group A', used);
    expect(result).not.toBe('Group A');
    expect(result.startsWith('Group A')).toBe(true);
  });

  it('should handle numbered names by incrementing', () => {
    const used = new Set<string>(['group 1']);
    const result = ensureUniqueGroupName('Group 1', used);
    expect(result).toBe('Group 2');
  });

  it('should track used names (case-insensitive)', () => {
    const used = new Set<string>();
    ensureUniqueGroupName('Group A', used);
    expect(used.has('group a')).toBe(true);
  });
});

describe('ensureUniqueGroupNames', () => {
  it('should return names unchanged when all unique', () => {
    expect(ensureUniqueGroupNames(['Group A', 'Group B', 'Group C'])).toEqual([
      'Group A',
      'Group B',
      'Group C'
    ]);
  });

  it('should make duplicate names unique', () => {
    const result = ensureUniqueGroupNames(['Group A', 'Group A', 'Group A']);
    const unique = new Set(result);
    expect(unique.size).toBe(3);
  });

  it('should handle empty array', () => {
    expect(ensureUniqueGroupNames([])).toEqual([]);
  });

  it('should handle single name', () => {
    expect(ensureUniqueGroupNames(['Group A'])).toEqual(['Group A']);
  });

  it('should handle numbered duplicates', () => {
    const result = ensureUniqueGroupNames(['Group 1', 'Group 1']);
    expect(result[0]).toBe('Group 1');
    expect(result[1]).toBe('Group 2');
  });
});
