import { describe, expect, it } from 'vitest';
import { createStudent } from '$lib/domain';
import {
  classifyNameMatch,
  isHighConfidence,
  normalizeName,
  rankStudentCandidates
} from './nameMatching';

describe('normalizeName', () => {
  it('strips diacritics, punctuation, and repeated whitespace', () => {
    expect(normalizeName('  López,   Cára!!!  ')).toBe('lopez cara');
  });
});

describe('rankStudentCandidates', () => {
  const students = [
    createStudent({ id: 'alice', firstName: 'Alice', lastName: 'Smith' }),
    createStudent({ id: 'bob-1', firstName: 'Bob', lastName: 'Jones' }),
    createStudent({ id: 'bob-2', firstName: 'Bob', lastName: 'Ray' })
  ];

  it('returns an empty array for blank input', () => {
    expect(rankStudentCandidates('', students)).toEqual([]);
  });

  it('excludes the requested student from ranking', () => {
    const candidates = rankStudentCandidates(normalizeName('Alice Smith'), students, 'alice');

    expect(candidates.some((candidate) => candidate.studentId === 'alice')).toBe(false);
  });

  it('returns an empty array when nothing clears the plausibility floor', () => {
    expect(rankStudentCandidates(normalizeName('Zyxw Qvut'), students)).toEqual([]);
  });

  it('gives an exact full-name match a base score of 1', () => {
    expect(rankStudentCandidates(normalizeName('Alice Smith'), students)[0]).toMatchObject({
      studentId: 'alice',
      baseScore: 1
    });
  });

  it('matches a standalone preferred name exactly', () => {
    const candidates = rankStudentCandidates(normalizeName('Danny'), [
      createStudent({ id: 'daniel', firstName: 'Daniel', preferredName: 'Danny', lastName: 'Cruz' }),
      createStudent({ id: 'maria', firstName: 'Maria', lastName: 'Lopez' })
    ]);

    expect(candidates[0]).toMatchObject({
      studentId: 'daniel',
      baseScore: 1
    });
  });
});

describe('isHighConfidence', () => {
  it('is false with no candidates', () => {
    expect(isHighConfidence([])).toBe(false);
  });

  it('is true when the top candidate clears the floor with a wide margin', () => {
    expect(
      isHighConfidence([
        { studentId: 'alice', baseScore: 0.9 },
        { studentId: 'bob', baseScore: 0.5 }
      ])
    ).toBe(true);
  });

  it('is false when the top candidate is below the floor even with a wide margin', () => {
    expect(
      isHighConfidence([
        { studentId: 'alice', baseScore: 0.74 },
        { studentId: 'bob', baseScore: 0.2 }
      ])
    ).toBe(false);
  });

  it('is false when the runner-up is too close', () => {
    expect(
      isHighConfidence([
        { studentId: 'alice', baseScore: 0.95 },
        { studentId: 'bob', baseScore: 0.76 }
      ])
    ).toBe(false);
  });

  it('is true with only one candidate above the floor', () => {
    expect(isHighConfidence([{ studentId: 'alice', baseScore: 0.8 }])).toBe(true);
  });
});

describe('classifyNameMatch', () => {
  it('classifies representative candidate arrays', () => {
    expect(classifyNameMatch([])).toBe('NO_MATCH');
    expect(classifyNameMatch([{ studentId: 'alice', baseScore: 0.82 }])).toBe('HIGH_CONFIDENCE');
    expect(
      classifyNameMatch([
        { studentId: 'alice', baseScore: 0.82 },
        { studentId: 'bob', baseScore: 0.7 }
      ])
    ).toBe('NEEDS_REVIEW');
  });
});
