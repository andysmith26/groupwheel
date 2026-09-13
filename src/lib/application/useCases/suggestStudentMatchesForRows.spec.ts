import { describe, expect, it } from 'vitest';
import { createStudent } from '$lib/domain';
import { suggestStudentMatchesForRows } from './suggestStudentMatchesForRows';

describe('suggestStudentMatchesForRows', () => {
  const students = [
    createStudent({ id: 'alice', firstName: 'Alice', lastName: 'Smith' }),
    createStudent({ id: 'bob-jones', firstName: 'Bob', lastName: 'Jones' }),
    createStudent({ id: 'bob-ray', firstName: 'Bob', lastName: 'Ray' }),
    createStudent({ id: 'cara', firstName: 'Cara', lastName: 'Lopez' })
  ];

  it('returns a high-confidence suggestion for an exact name match', () => {
    expect(suggestStudentMatchesForRows({ rows: [{ rowIndex: 2, name: 'Alice Smith' }], students })).toEqual([
      expect.objectContaining({
        rowIndex: 2,
        bucket: 'HIGH_CONFIDENCE',
        bestCandidate: expect.objectContaining({ studentId: 'alice', baseScore: 1 })
      })
    ]);
  });

  it('returns needs-review suggestions for ambiguous first-name-only input', () => {
    const [suggestion] = suggestStudentMatchesForRows({ rows: [{ rowIndex: 3, name: 'Bob' }], students });

    expect(suggestion.bucket).toBe('NEEDS_REVIEW');
    expect(suggestion.candidates).toHaveLength(3);
    expect(suggestion.candidates.map((candidate) => candidate.studentId).slice(0, 2)).toEqual([
      'bob-jones',
      'bob-ray'
    ]);
  });

  it('returns no match for unrelated names', () => {
    expect(suggestStudentMatchesForRows({ rows: [{ rowIndex: 4, name: 'Zelda Moon' }], students })).toEqual([
      {
        rowIndex: 4,
        bucket: 'NO_MATCH',
        candidates: [],
        bestCandidate: undefined
      }
    ]);
  });

  it('returns no match for blank names', () => {
    expect(suggestStudentMatchesForRows({ rows: [{ rowIndex: 5, name: '   ' }], students })[0]).toEqual({
      rowIndex: 5,
      bucket: 'NO_MATCH',
      candidates: [],
      bestCandidate: undefined
    });
  });

  it('matches a first-and-last name already combined by the caller', () => {
    expect(
      suggestStudentMatchesForRows({ rows: [{ rowIndex: 6, name: 'Cara Lopez' }], students })[0]
    ).toMatchObject({
      bucket: 'HIGH_CONFIDENCE',
      bestCandidate: {
        studentId: 'cara',
        baseScore: 1
      }
    });
  });

  it('processes multiple rows independently', () => {
    const suggestions = suggestStudentMatchesForRows({
      rows: [
        { rowIndex: 7, name: 'Alice Smith' },
        { rowIndex: 8, name: 'Bob' },
        { rowIndex: 9, name: 'Unknown' }
      ],
      students
    });

    expect(suggestions.map((suggestion) => suggestion.bucket)).toEqual([
      'HIGH_CONFIDENCE',
      'NEEDS_REVIEW',
      'NO_MATCH'
    ]);
    expect(suggestions.map((suggestion) => suggestion.rowIndex)).toEqual([7, 8, 9]);
  });
});
