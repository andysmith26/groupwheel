import { describe, expect, it } from 'vitest';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { testPool, testProgram, testStudents } from '$lib/test-utils/fixtures';
import { isOk } from '$lib/types/result';
import { exportActivity } from './exportActivity';

describe('exportActivity', () => {
  it('includes peer requests in the activity export payload', async () => {
    const env = createInMemoryEnvironment(
      {
        students: testStudents,
        pools: [testPool],
        programs: [testProgram],
        peerRequests: [
          createPeerRequestEntry({
            id: 'req-1',
            programId: testProgram.id,
            requesterStudentId: 'stu-1',
            rank: 1,
            rawText: 'Brandon Baker',
            status: 'CONFIRMED',
            resolvedStudentId: 'stu-2',
            resolutionSource: 'MANUAL',
            initialResolvedStudentId: 'stu-2',
            initialResolutionSource: 'MANUAL',
            resolutionHistory: [
              {
                action: 'MANUALLY_SET',
                resolvedStudentId: 'stu-2',
                resolutionSource: 'MANUAL',
                occurredAt: '2026-05-25T12:00:00.000Z'
              }
            ],
            candidates: [{ studentId: 'stu-2', score: 0.91, reasons: ['exact full name'] }]
          })
        ]
      },
      { useIndexedDb: false }
    );

    const result = await exportActivity(
      {
        programRepo: env.programRepo,
        poolRepo: env.poolRepo,
        studentRepo: env.studentRepo,
        preferenceRepo: env.preferenceRepo,
        peerRequestRepo: env.peerRequestRepo,
        scenarioRepo: env.scenarioRepo,
        sessionRepo: env.sessionRepo,
        placementRepo: env.placementRepo,
        observationRepo: env.observationRepo,
        tagRepo: env.tagRepo
      },
      { programId: testProgram.id }
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.peerRequests).toEqual([
      {
        id: 'req-1',
        requesterStudentId: 'stu-1',
        rank: 1,
        rawText: 'Brandon Baker',
        normalizedText: 'brandon baker',
        status: 'CONFIRMED',
        resolvedStudentId: 'stu-2',
        resolutionSource: 'MANUAL',
        initialResolvedStudentId: 'stu-2',
        initialResolutionSource: 'MANUAL',
        resolutionHistory: [
          {
            action: 'MANUALLY_SET',
            resolvedStudentId: 'stu-2',
            resolutionSource: 'MANUAL',
            occurredAt: '2026-05-25T12:00:00.000Z'
          }
        ],
        candidates: [{ studentId: 'stu-2', score: 0.91, reasons: ['exact full name'] }]
      }
    ]);
  });
});
