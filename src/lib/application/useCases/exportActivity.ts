/**
 * exportActivity use case.
 *
 * Gathers all data for a single activity (program) and packages it
 * into an ActivityExportData structure for file download.
 * Includes: roster, preferences, scenario, sessions, placements, observations.
 *
 * @module application/useCases/exportActivity
 */

import type {
  ProgramRepository,
  PoolRepository,
  StudentRepository,
  PreferenceRepository,
  ScenarioRepository,
  SessionRepository,
  PlacementRepository,
  ObservationRepository
} from '$lib/application/ports';
import { extractStudentPreference } from '$lib/domain/preference';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import {
  ACTIVITY_FILE_VERSION,
  type ActivityExportData,
  type ExportedSession,
  type ExportedPlacement,
  type ExportedObservation
} from '$lib/utils/activityFile';

// =============================================================================
// Input/Output Types
// =============================================================================

export interface ExportActivityInput {
  programId: string;
}

export type ExportActivityError =
  | { type: 'NOT_FOUND'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ExportActivityDeps {
  programRepo: ProgramRepository;
  poolRepo: PoolRepository;
  studentRepo: StudentRepository;
  preferenceRepo: PreferenceRepository;
  scenarioRepo: ScenarioRepository;
  sessionRepo: SessionRepository;
  placementRepo: PlacementRepository;
  observationRepo: ObservationRepository;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function exportActivity(
  deps: ExportActivityDeps,
  input: ExportActivityInput
): Promise<Result<ActivityExportData, ExportActivityError>> {
  try {
    const program = await deps.programRepo.getById(input.programId);
    if (!program) {
      return err({ type: 'NOT_FOUND', message: 'Activity not found.' });
    }

    // Load pool and students
    let students: import('$lib/domain').Student[] = [];
    let poolName = `${program.name} Roster`;
    let poolType = 'CLASS';

    if (program.primaryPoolId) {
      const pool = await deps.poolRepo.getById(program.primaryPoolId);
      if (pool) {
        poolName = pool.name;
        poolType = pool.type;
        // Load students in this pool
        const allStudents = await Promise.all(
          pool.memberIds.map((id) => deps.studentRepo.getById(id))
        );
        students = allStudents.filter(
          (s): s is import('$lib/domain').Student => s !== null
        );
      }
    }

    // Load preferences
    const preferences = await deps.preferenceRepo.listByProgramId(input.programId);

    // Load scenario
    const scenario = await deps.scenarioRepo.getByProgramId(input.programId);

    // Load sessions
    const sessions = await deps.sessionRepo.listByProgramId(input.programId);

    // Load placements for all sessions
    const allPlacements: import('$lib/domain').Placement[] = [];
    for (const session of sessions) {
      const sessionPlacements = await deps.placementRepo.listBySessionId(session.id);
      allPlacements.push(...sessionPlacements);
    }

    // Load observations
    const observations = await deps.observationRepo.listByProgramId(input.programId);

    // Build export data
    const exportData: ActivityExportData = {
      version: ACTIVITY_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      activity: {
        name: program.name,
        type: program.type
      },
      pool: {
        name: poolName,
        type: poolType
      },
      roster: {
        students: students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          gradeLevel: s.gradeLevel,
          gender: s.gender,
          meta: s.meta
        }))
      },
      preferences: preferences.map((pref) => {
        const payload = extractStudentPreference(pref);
        return {
          studentId: pref.studentId,
          likeGroupIds: [...payload.likeGroupIds],
          avoidStudentIds: [...payload.avoidStudentIds],
          avoidGroupIds: [...payload.avoidGroupIds]
        };
      }),
      scenario: scenario
        ? {
            groups: scenario.groups.map((g) => ({
              id: g.id,
              name: g.name,
              capacity: g.capacity,
              memberIds: [...g.memberIds]
            })),
            algorithmConfig: scenario.algorithmConfig
          }
        : undefined,
      sessions: sessions.map(
        (s): ExportedSession => ({
          id: s.id,
          name: s.name,
          academicYear: s.academicYear,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          status: s.status,
          scenarioId: s.scenarioId,
          publishedAt: s.publishedAt?.toISOString(),
          createdAt: s.createdAt.toISOString()
        })
      ),
      placements: allPlacements.map(
        (p): ExportedPlacement => ({
          id: p.id,
          sessionId: p.sessionId,
          studentId: p.studentId,
          groupId: p.groupId,
          groupName: p.groupName,
          preferenceRank: p.preferenceRank,
          preferenceSnapshot: p.preferenceSnapshot,
          assignedAt: p.assignedAt.toISOString(),
          startDate: p.startDate.toISOString(),
          endDate: p.endDate?.toISOString(),
          type: p.type,
          correctsPlacementId: p.correctsPlacementId,
          reason: p.reason
        })
      ),
      observations: observations.map(
        (o): ExportedObservation => ({
          id: o.id,
          sessionId: o.sessionId,
          groupId: o.groupId,
          groupName: o.groupName,
          content: o.content,
          sentiment: o.sentiment,
          tags: o.tags,
          createdAt: o.createdAt.toISOString()
        })
      )
    };

    return ok(exportData);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error during export';
    return err({ type: 'INTERNAL_ERROR', message });
  }
}
