import { describe, expect, it } from 'vitest';
import { createStudent } from '$lib/domain';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { matchPeerRequests } from './matchPeerRequests';

describe('matchPeerRequests', () => {
  const students = [
    createStudent({ id: 'alice', firstName: 'Alice', lastName: 'Smith' }),
    createStudent({ id: 'bob-1', firstName: 'Bob', lastName: 'Jones' }),
    createStudent({ id: 'bob-2', firstName: 'Bob', lastName: 'Ray' }),
    createStudent({ id: 'cara', firstName: 'Cara', lastName: 'Lopez' }),
    createStudent({ id: 'bob-3', firstName: 'Bob', lastName: 'Stone' })
  ];

  it('puts unique exact full-name matches into ready-to-confirm without auto-confirming them', () => {
    const request = createPeerRequestEntry({
      id: 'request-1',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Bob Jones'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.readyToConfirm).toHaveLength(1);
    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({ studentId: 'bob-1' });
    expect(result.updatedRequests[0]).toMatchObject({
      status: 'AUTO_MATCHED_PENDING_CONFIRMATION',
      resolutionSource: 'NONE',
      resolvedStudentId: undefined
    });
  });

  it('sends ambiguous first-name matches to needs review and caps candidates at three', () => {
    const request = createPeerRequestEntry({
      id: 'request-2',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Bob'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].candidates).toHaveLength(3);
    expect(result.updatedRequests[0].status).toBe('UNRESOLVED');
  });

  it('puts unmatched requests into no-match', () => {
    const request = createPeerRequestEntry({
      id: 'request-3',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Zelda Moon'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.noMatch).toHaveLength(1);
    expect(result.updatedRequests[0].candidates).toEqual([]);
  });

  it('marks self-matches as invalid', () => {
    const request = createPeerRequestEntry({
      id: 'request-4',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Alice Smith'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].warning).toContain('requester');
    expect(result.updatedRequests[0].status).toBe('UNRESOLVED');
  });

  it('normalizes punctuation and ranks a typo against full-name and initial permutations', () => {
    const request = createPeerRequestEntry({
      id: 'request-5',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Jon S.'
    });
    const matchingStudents = [
      students[0],
      createStudent({ id: 'jonathan', firstName: 'Jonathan', lastName: 'Smith' }),
      createStudent({ id: 'jones', firstName: 'Jamie', lastName: 'Jones' })
    ];

    const result = matchPeerRequests({ requests: [request], students: matchingStudents });

    expect(result.readyToConfirm).toHaveLength(1);
    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({ studentId: 'jonathan' });
    expect(result.readyToConfirm[0].bestCandidate?.baseScore).toBeGreaterThan(0.8);
  });

  it('heavily penalizes tied initial matches and retains their base scores', () => {
    const request = createPeerRequestEntry({
      id: 'request-6',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Bob S'
    });

    const result = matchPeerRequests({
      requests: [request],
      students: [...students, createStudent({ id: 'bob-4', firstName: 'Bob', lastName: 'Sanders' })]
    });

    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].candidates.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 'bob-3',
          baseScore: 1,
          score: 0.5,
          confidence: 0.5
        }),
        expect.objectContaining({ studentId: 'bob-4', baseScore: 1 })
      ])
    );
  });

  it('matches a populated preferred name and ignores an absent or blank one', () => {
    const request = createPeerRequestEntry({
      id: 'request-7',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Danny Cruz'
    });
    const matchingStudents = [
      students[0],
      createStudent({
        id: 'daniel',
        firstName: 'Daniel',
        preferredName: 'Danny',
        lastName: 'Cruz'
      }),
      createStudent({ id: 'maria', firstName: 'Maria', preferredName: '   ', lastName: 'Cruz' })
    ];

    const result = matchPeerRequests({ requests: [request], students: matchingStudents });

    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({
      studentId: 'daniel',
      baseScore: 1,
      score: 1,
      confidence: 1
    });
  });

  it('matches reversed names and ignores diacritics', () => {
    const request = createPeerRequestEntry({
      id: 'request-reversed-name',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: 'Lopez, Cára'
    });

    const result = matchPeerRequests({ requests: [request], students });

    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({
      studentId: 'cara',
      baseScore: 1
    });
  });

  it('returns no candidates for empty normalized input and total misses', () => {
    const emptyRequest = createPeerRequestEntry({
      id: 'request-8',
      programId: 'program-1',
      requesterStudentId: 'alice',
      rank: 1,
      rawText: '---'
    });

    const result = matchPeerRequests({ requests: [emptyRequest], students });

    expect(result.noMatch).toHaveLength(1);
    expect(result.noMatch[0].candidates).toEqual([]);
  });

  it('puts decisive near-exact matches into ready-to-confirm even when they are not perfect strings', () => {
    const request = createPeerRequestEntry({
      id: 'request-9',
      programId: 'program-1',
      requesterStudentId: 'bob-1',
      rank: 1,
      rawText: 'Alise Smith'
    });

    const result = matchPeerRequests({
      requests: [request],
      students: [
        ...students,
        createStudent({ id: 'ally', firstName: 'Alyssa', lastName: 'Stone' }),
        createStudent({ id: 'alina', firstName: 'Alina', lastName: 'Smythe' })
      ]
    });

    expect(result.readyToConfirm).toHaveLength(1);
    expect(result.readyToConfirm[0].bestCandidate).toMatchObject({ studentId: 'alice' });
    expect(result.readyToConfirm[0].bestCandidate?.baseScore).toBeGreaterThanOrEqual(0.75);
  });
});
