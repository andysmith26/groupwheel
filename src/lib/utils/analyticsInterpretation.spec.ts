import { describe, it, expect } from 'vitest';
import { interpretAnalytics, ordinal } from './analyticsInterpretation';

describe('interpretAnalytics', () => {
  it('classifies excellent when top-choice >= threshold', () => {
    // 4 groups, 30 students → ratio 0.13, offset -10, excellent threshold = 70
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 85, averagePreferenceRankAssigned: 1.2 },
      baseline: null,
      studentCount: 30,
      groupCount: 4
    });
    expect(result.topChoiceQuality).toBe('excellent');
    expect(result.topChoiceLabel).toBe('Excellent result');
  });

  it('adjusts thresholds for high group-to-student ratio', () => {
    // 12 groups, 30 students → ratio 0.4, offset +10, excellent = 90, strong = 70
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 75, averagePreferenceRankAssigned: 1.3 },
      baseline: null,
      studentCount: 30,
      groupCount: 12
    });
    expect(result.topChoiceQuality).toBe('strong');
    expect(result.topChoiceLabel).toBe('Strong result');
  });

  it('adjusts thresholds for low group-to-student ratio', () => {
    // 3 groups, 30 students → ratio 0.1, offset -10, strong threshold = 50
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 55, averagePreferenceRankAssigned: 1.8 },
      baseline: null,
      studentCount: 30,
      groupCount: 3
    });
    expect(result.topChoiceQuality).toBe('strong');
  });

  it('suggests swapping when few students unassigned', () => {
    const result = interpretAnalytics({
      current: {
        percentAssignedTopChoice: 70,
        averagePreferenceRankAssigned: 1.5,
        studentsUnassignedToRequest: 3
      },
      baseline: null,
      studentCount: 30,
      groupCount: 6
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("3 students didn't get any of their choices")
      ])
    );
  });

  it('suggests adding group when many students unassigned', () => {
    const result = interpretAnalytics({
      current: {
        percentAssignedTopChoice: 40,
        averagePreferenceRankAssigned: 2.5,
        studentsUnassignedToRequest: 8
      },
      baseline: null,
      studentCount: 30,
      groupCount: 4
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.stringContaining('adding another group')])
    );
  });

  it('suggests collecting preferences when many are missing', () => {
    const result = interpretAnalytics({
      current: {
        percentAssignedTopChoice: 70,
        averagePreferenceRankAssigned: 1.5,
        studentsWithNoPreferences: 10
      },
      baseline: null,
      studentCount: 30,
      groupCount: 6
    });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([expect.stringContaining('10 students have no preferences')])
    );
  });

  it('no suggestions when metrics are good', () => {
    const result = interpretAnalytics({
      current: {
        percentAssignedTopChoice: 85,
        averagePreferenceRankAssigned: 1.1,
        studentsUnassignedToRequest: 0,
        studentsWithNoPreferences: 0
      },
      baseline: null,
      studentCount: 30,
      groupCount: 6
    });
    expect(result.suggestions).toEqual([]);
  });

  it('comparison note shows improvement', () => {
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 73, averagePreferenceRankAssigned: 1.4 },
      baseline: { percentAssignedTopChoice: 65 },
      studentCount: 30,
      groupCount: 6
    });
    expect(result.comparisonNote).toBe('↑ 8% improvement over last generation');
  });

  it('comparison note shows decrease', () => {
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 65, averagePreferenceRankAssigned: 1.6 },
      baseline: { percentAssignedTopChoice: 73 },
      studentCount: 30,
      groupCount: 6
    });
    expect(result.comparisonNote).toBe('↓ 8% decrease from last generation');
  });

  it('no comparison note when no baseline', () => {
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 70, averagePreferenceRankAssigned: 1.5 },
      baseline: null,
      studentCount: 30,
      groupCount: 6
    });
    expect(result.comparisonNote).toBeNull();
  });

  it('handles zero students gracefully', () => {
    const result = interpretAnalytics({
      current: { percentAssignedTopChoice: 0, averagePreferenceRankAssigned: 0 },
      baseline: null,
      studentCount: 0,
      groupCount: 0
    });
    expect(result.topChoiceQuality).toBe('could_improve');
    expect(result.topChoiceExplainer).toContain('0% of students got their first choice');
  });
});

describe('ordinal', () => {
  it('formats ordinals correctly', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
  });
});
