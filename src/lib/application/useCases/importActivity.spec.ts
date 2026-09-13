import { describe, expect, it } from 'vitest';
import { createInMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import { ACTIVITY_FILE_VERSION, type ActivityExportData } from '$lib/utils/activityFile';
import { importActivity } from './importActivity';

describe('importActivity', () => {
  it('preserves group colors and drops group preferences when groups are not imported', async () => {
    const env = createInMemoryEnvironment(undefined, { useIndexedDb: false });
    let counter = 0;
    const exportData: ActivityExportData = {
      version: ACTIVITY_FILE_VERSION,
      exportedAt: '2026-05-25T12:00:00.000Z',
      activity: { name: 'WIP Groups', type: 'CLASS_ACTIVITY' },
      roster: {
        students: [
          { id: 'old-alice', firstName: 'Alice' },
          { id: 'old-bob', firstName: 'Bob' }
        ]
      },
      preferences: [
        {
          studentId: 'old-alice',
          likeGroupIds: ['old-group'],
          avoidStudentIds: [],
          avoidGroupIds: ['old-group']
        }
      ],
      scenario: {
        groups: [
          {
            id: 'old-group',
            name: 'Blue Group',
            capacity: 4,
            memberIds: ['old-alice'],
            colorIndex: 5
          }
        ]
      }
    };

    const deps = {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      programRepo: env.programRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      sessionRepo: env.sessionRepo,
      placementRepo: env.placementRepo,
      observationRepo: env.observationRepo,
      tagRepo: env.tagRepo,
      idGenerator: { generateId: () => `new-id-${++counter}` },
      clock: { now: () => new Date('2026-05-25T12:00:00.000Z') }
    };

    const withGroups = await importActivity(deps, { exportData, ownerStaffId: 'owner-1' });
    expect(withGroups.status).toBe('ok');
    if (withGroups.status !== 'ok') return;
    expect(withGroups.value.scenario?.groups[0].colorIndex).toBe(5);

    const withoutGroups = await importActivity(deps, {
      exportData,
      ownerStaffId: 'owner-1',
      importScenario: false
    });
    expect(withoutGroups.status).toBe('ok');
    if (withoutGroups.status !== 'ok') return;
    const preferences = await env.preferenceRepo.listByProgramId(withoutGroups.value.program.id);
    expect(preferences[0].payload).toMatchObject({
      likeGroupIds: [],
      avoidGroupIds: []
    });
  });

  it('imports peer requests and remaps student references to imported IDs', async () => {
    const env = createInMemoryEnvironment(undefined, { useIndexedDb: false });
    let counter = 0;

    const exportData: ActivityExportData = {
      version: ACTIVITY_FILE_VERSION,
      exportedAt: '2026-05-25T12:00:00.000Z',
      activity: {
        name: 'Peer Request Import',
        type: 'CLASS_ACTIVITY'
      },
      roster: {
        students: [
          { id: 'old-alice', firstName: 'Alice', lastName: 'Able' },
          { id: 'old-bob', firstName: 'Bob', lastName: 'Baker' }
        ]
      },
      preferences: [],
      peerRequests: [
        {
          id: 'old-req-1',
          requesterStudentId: 'old-alice',
          rank: 1,
          rawText: 'Bob Baker',
          normalizedText: 'bob baker',
          status: 'CONFIRMED',
          resolvedStudentId: 'old-bob',
          resolutionSource: 'MANUAL',
          initialResolvedStudentId: 'old-bob',
          initialResolutionSource: 'MANUAL',
          resolutionHistory: [
            {
              action: 'MANUALLY_SET',
              resolvedStudentId: 'old-bob',
              resolutionSource: 'MANUAL',
              occurredAt: '2026-05-25T11:30:00.000Z'
            }
          ],
          candidates: [{ studentId: 'old-bob', score: 1, reasons: ['exact full name'] }]
        }
      ]
    };

    const result = await importActivity(
      {
        poolRepo: env.poolRepo,
        studentRepo: env.studentRepo,
        programRepo: env.programRepo,
        preferenceRepo: env.preferenceRepo,
        peerRequestRepo: env.peerRequestRepo,
        scenarioRepo: env.scenarioRepo,
        sessionRepo: env.sessionRepo,
        placementRepo: env.placementRepo,
        observationRepo: env.observationRepo,
        tagRepo: env.tagRepo,
        idGenerator: {
          generateId: () => `new-id-${++counter}`
        },
        clock: {
          now: () => new Date('2026-05-25T12:00:00.000Z')
        }
      },
      {
        exportData,
        ownerStaffId: 'owner-1'
      }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.value.peerRequestsImported).toBe(1);

    const importedStudents = await env.studentRepo.listAll();
    const importedAlice = importedStudents.find(
      (student) => student.firstName === 'Alice' && student.lastName === 'Able'
    );
    const importedBob = importedStudents.find(
      (student) => student.firstName === 'Bob' && student.lastName === 'Baker'
    );
    const importedPeerRequests = await env.peerRequestRepo.listByProgramId(result.value.program.id);

    expect(importedAlice).toBeTruthy();
    expect(importedBob).toBeTruthy();
    expect(importedPeerRequests).toHaveLength(1);
    expect(importedPeerRequests[0]).toMatchObject({
      requesterStudentId: importedAlice?.id,
      resolvedStudentId: importedBob?.id,
      initialResolvedStudentId: importedBob?.id,
      resolutionSource: 'MANUAL',
      initialResolutionSource: 'MANUAL',
      status: 'CONFIRMED'
    });
    expect(importedPeerRequests[0].candidates).toEqual([
      {
        studentId: importedBob?.id,
        score: 1,
        reasons: ['exact full name']
      }
    ]);
    expect(importedPeerRequests[0].resolutionHistory).toEqual([
      {
        action: 'MANUALLY_SET',
        resolvedStudentId: importedBob?.id,
        resolutionSource: 'MANUAL',
        occurredAt: '2026-05-25T11:30:00.000Z'
      }
    ]);
  });

  it('imports top-level tags and remaps student tagIds', async () => {
    const env = createInMemoryEnvironment(undefined, { useIndexedDb: false });
    let counter = 0;

    const exportData: ActivityExportData = {
      version: ACTIVITY_FILE_VERSION,
      exportedAt: '2026-05-25T12:00:00.000Z',
      activity: { name: 'Tag Import', type: 'CLASS_ACTIVITY' },
      roster: {
        students: [
          { id: 'old-alice', firstName: 'Alice', tagIds: ['tag-a'] },
          { id: 'old-bob', firstName: 'Bob', tagIds: ['tag-b'] }
        ]
      },
      tags: [
        { id: 'tag-a', programId: 'old-program', name: 'Honors', colorIndex: 2 },
        { id: 'tag-b', programId: 'old-program', name: 'ELL', colorIndex: 4 }
      ],
      preferences: []
    };

    const result = await importActivity(
      {
        poolRepo: env.poolRepo,
        studentRepo: env.studentRepo,
        programRepo: env.programRepo,
        preferenceRepo: env.preferenceRepo,
        scenarioRepo: env.scenarioRepo,
        sessionRepo: env.sessionRepo,
        placementRepo: env.placementRepo,
        observationRepo: env.observationRepo,
        tagRepo: env.tagRepo,
        idGenerator: {
          generateId: () => `new-id-${++counter}`
        },
        clock: {
          now: () => new Date('2026-05-25T12:00:00.000Z')
        }
      },
      { exportData, ownerStaffId: 'owner-1' }
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    const savedTags = await env.tagRepo.listByProgramId(result.value.program.id);
    expect(savedTags).toHaveLength(2);
    const savedTagIds = new Set(savedTags.map((tag) => tag.id));

    const students = await env.studentRepo.listAll();
    const importedAlice = students.find((student) => student.firstName === 'Alice');
    const importedBob = students.find((student) => student.firstName === 'Bob');
    expect(importedAlice?.tagIds).toHaveLength(1);
    expect(importedBob?.tagIds).toHaveLength(1);
    expect(savedTagIds.has(importedAlice?.tagIds?.[0] ?? '')).toBe(true);
    expect(savedTagIds.has(importedBob?.tagIds?.[0] ?? '')).toBe(true);
  });
});
