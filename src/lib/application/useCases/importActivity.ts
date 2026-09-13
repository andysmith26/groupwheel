/**
 * importActivity use case.
 *
 * Imports an activity from a previously exported JSON file.
 * Creates all necessary entities: Students, Pool, Program, Preferences,
 * and optionally a Scenario with groups.
 *
 * @module application/useCases/importActivity
 */

import type {
  PoolRepository,
  StudentRepository,
  ProgramRepository,
  PreferenceRepository,
  PeerRequestRepository,
  ScenarioRepository,
  SessionRepository,
  PlacementRepository,
  ObservationRepository,
  TagRepository,
  IdGenerator,
  Clock
} from '$lib/application/ports';
import type {
  Pool,
  PeerRequestEntry,
  Program,
  Student,
  Scenario,
  Session,
  Placement,
  Observation,
  Tag
} from '$lib/domain';
import type { Preference, StudentPreference } from '$lib/domain/preference';
import type { Group } from '$lib/domain/group';
import { createTag } from '$lib/domain/tag';
import { createPeerRequestEntry } from '$lib/domain/peerRequest';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import type { ActivityExportData } from '$lib/utils/activityFile';
import { ensureUniqueGroupName } from '$lib/utils/ensureUniqueGroupNames';

// =============================================================================
// Input/Output Types
// =============================================================================

export interface ImportActivityInput {
  /** The validated export data to import */
  exportData: ActivityExportData;

  /** Owner staff ID for the imported activity */
  ownerStaffId: string;

  /** ID of the authenticated user (for multi-tenant data isolation) */
  userId?: string;

  /** Whether to import the scenario (groups). Default: true if scenario exists */
  importScenario?: boolean;
}

export interface ImportActivityResult {
  program: Program;
  pool: Pool;
  scenario: Scenario | null;
  studentsImported: number;
  preferencesImported: number;
  groupsImported: number;
  sessionsImported: number;
  placementsImported: number;
  observationsImported: number;
  peerRequestsImported: number;
}

export type ImportActivityError =
  | { type: 'NO_STUDENTS'; message: string }
  | { type: 'SAVE_FAILED'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface ImportActivityDeps {
  poolRepo: PoolRepository;
  studentRepo: StudentRepository;
  programRepo: ProgramRepository;
  preferenceRepo: PreferenceRepository;
  peerRequestRepo?: PeerRequestRepository;
  scenarioRepo: ScenarioRepository;
  sessionRepo?: SessionRepository;
  placementRepo?: PlacementRepository;
  observationRepo?: ObservationRepository;
  tagRepo?: TagRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function importActivity(
  deps: ImportActivityDeps,
  input: ImportActivityInput
): Promise<Result<ImportActivityResult, ImportActivityError>> {
  const { ownerStaffId, userId, importScenario = true } = input;

  // Deep clone exportData to strip any Svelte proxies that IndexedDB can't serialize
  const exportData: ActivityExportData = JSON.parse(JSON.stringify(input.exportData));

  try {
    // -------------------------------------------------------------------------
    // Step 1: Validate we have students
    // -------------------------------------------------------------------------

    if (exportData.roster.students.length === 0) {
      return err({
        type: 'NO_STUDENTS',
        message: 'The imported file contains no students.'
      });
    }

    // -------------------------------------------------------------------------
    // Step 2: Create ID mappings for students and groups
    // -------------------------------------------------------------------------

    // Map old student IDs to new IDs (to avoid conflicts with existing data)
    const studentIdMap = new Map<string, string>();
    const groupIdMap = new Map<string, string>();
    const tagIdMap = new Map<string, string>();

    for (const exportedStudent of exportData.roster.students) {
      const newId = deps.idGenerator.generateId();
      studentIdMap.set(exportedStudent.id, newId);
    }

    if (exportData.scenario?.groups) {
      for (const exportedGroup of exportData.scenario.groups) {
        if (!groupIdMap.has(exportedGroup.id)) {
          const newId = deps.idGenerator.generateId();
          groupIdMap.set(exportedGroup.id, newId);
        }
      }
    }
    const importedTagsByName = new Map<string, { id: string; name: string; colorIndex?: number }>();
    if (exportData.tags) {
      for (const exportedTag of exportData.tags) {
        const rawName = String(exportedTag.name ?? '').trim();
        if (!rawName) continue;
        const nameKey = rawName.toLocaleLowerCase();

        let importedTag = importedTagsByName.get(nameKey);
        if (!importedTag) {
          const validatedTag = createTag({
            id: deps.idGenerator.generateId(),
            programId: 'import-placeholder-program',
            name: rawName,
            colorIndex: exportedTag.colorIndex
          });
          importedTag = {
            id: validatedTag.id,
            name: validatedTag.name,
            colorIndex: validatedTag.colorIndex
          };
          importedTagsByName.set(nameKey, importedTag);
        }

        tagIdMap.set(exportedTag.id, importedTag.id);
      }
    }

    // -------------------------------------------------------------------------
    // Step 3: Create Students
    // Note: We explicitly copy properties to avoid Svelte proxy issues with IndexedDB
    // -------------------------------------------------------------------------

    const students: Student[] = exportData.roster.students.map((s) => ({
      id: studentIdMap.get(s.id)!,
      firstName: String(s.firstName),
      preferredName: s.preferredName ? String(s.preferredName) : undefined,
      lastName: s.lastName ? String(s.lastName) : undefined,
      gradeLevel: s.gradeLevel ? String(s.gradeLevel) : undefined,
      gender: s.gender ? String(s.gender) : undefined,
      tagIds: Array.isArray(s.tagIds)
        ? s.tagIds.map((oldTagId) => tagIdMap.get(oldTagId)).filter((tagId): tagId is string => !!tagId)
        : [],
      meta: s.meta ? JSON.parse(JSON.stringify(s.meta)) : undefined
    }));

    await deps.studentRepo.saveMany(students);

    // -------------------------------------------------------------------------
    // Step 4: Create Pool
    // -------------------------------------------------------------------------

    const poolId = deps.idGenerator.generateId();
    const pool: Pool = {
      id: poolId,
      name: exportData.pool?.name || `${exportData.activity.name} Roster`,
      type: (exportData.pool?.type as Pool['type']) || ('CLASS' as const),
      memberIds: students.map((s) => s.id),
      status: 'ACTIVE' as const,
      primaryStaffOwnerId: ownerStaffId,
      source: 'IMPORT' as const,
      userId
    };

    await deps.poolRepo.save(pool);

    // -------------------------------------------------------------------------
    // Step 5: Create Program
    // -------------------------------------------------------------------------

    const programId = deps.idGenerator.generateId();
    const program: Program = {
      id: programId,
      name: exportData.activity.name,
      type: exportData.activity.type,
      timeSpan: { termLabel: new Date().toISOString() },
      poolIds: [pool.id],
      primaryPoolId: pool.id,
      ownerStaffIds: [ownerStaffId],
      userId
    };

    await deps.programRepo.save(program);

    if (deps.tagRepo && importedTagsByName.size > 0) {
      const tagsToSave: Tag[] = Array.from(importedTagsByName.values()).map((tag) => ({
        ...tag,
        programId: program.id
      }));
      for (const tag of tagsToSave) {
        await deps.tagRepo.save(tag);
      }
    }

    // -------------------------------------------------------------------------
    // Step 6: Create Preferences (with remapped student IDs)
    // -------------------------------------------------------------------------

    let preferencesImported = 0;

    if (exportData.preferences.length > 0) {
      const preferencesToSave: Preference[] = [];

      for (const exportedPref of exportData.preferences) {
        const newStudentId = studentIdMap.get(exportedPref.studentId);
        if (!newStudentId) {
          // Skip preferences for students not in roster
          continue;
        }

        // Keep group references only when the corresponding groups will be imported.
        // Leaving old IDs here creates preferences that point to no group.
        const remapGroupIds = (oldIds: string[]): string[] =>
          importScenario
            ? oldIds.flatMap((oldId) => {
                const newId = groupIdMap.get(oldId);
                return newId ? [newId] : [];
              })
            : [];

        // Remap all IDs to their new equivalents (students and groups get new IDs on import)
        const preference: Preference = {
          id: deps.idGenerator.generateId(),
          programId: program.id,
          studentId: newStudentId,
          payload: {
            studentId: newStudentId,
            likeGroupIds: remapGroupIds(exportedPref.likeGroupIds),
            avoidStudentIds: [...exportedPref.avoidStudentIds]
              .map((oldId) => studentIdMap.get(oldId))
              .filter((id): id is string => id !== undefined),
            avoidGroupIds: remapGroupIds(exportedPref.avoidGroupIds)
          } satisfies StudentPreference
        };

        preferencesToSave.push(preference);
        preferencesImported++;
      }

      if (preferencesToSave.length > 0) {
        if (typeof deps.preferenceRepo.setForProgram === 'function') {
          await deps.preferenceRepo.setForProgram(program.id, preferencesToSave);
        } else {
          for (const pref of preferencesToSave) {
            await deps.preferenceRepo.save(pref);
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // Step 7: Create Scenario with Groups (if present and requested)
    // -------------------------------------------------------------------------

    let scenario: Scenario | null = null;
    let groupsImported = 0;

    if (importScenario && exportData.scenario?.groups && exportData.scenario.groups.length > 0) {
      const now = deps.clock.now();
      const usedGroupNames = new Set<string>();

      // Remap group member IDs to new student IDs
      // Copy to plain arrays to avoid proxy issues with IndexedDB
      const seenGroupIds = new Set<string>();
      const groups: Group[] = exportData.scenario.groups.map((g) => {
        const isDuplicate = seenGroupIds.has(g.id);
        if (!isDuplicate) {
          seenGroupIds.add(g.id);
        }

        return {
          id: isDuplicate
            ? deps.idGenerator.generateId()
            : (groupIdMap.get(g.id) ?? deps.idGenerator.generateId()),
          name: ensureUniqueGroupName(String(g.name ?? ''), usedGroupNames),
          capacity: g.capacity,
          memberIds: [...g.memberIds]
            .map((oldId) => studentIdMap.get(oldId))
            .filter((id): id is string => id !== undefined),
          colorIndex: g.colorIndex
        };
      });

      groupsImported = groups.length;

      // Deep copy algorithmConfig to avoid proxy issues
      const algorithmConfig = exportData.scenario.algorithmConfig
        ? JSON.parse(JSON.stringify(exportData.scenario.algorithmConfig))
        : undefined;

      scenario = {
        id: deps.idGenerator.generateId(),
        programId: program.id,
        status: 'DRAFT' as const,
        groups,
        participantSnapshot: [...students.map((s) => s.id)],
        createdAt: now,
        lastModifiedAt: now,
        algorithmConfig
      };

      await deps.scenarioRepo.save(scenario);
    }

    // -------------------------------------------------------------------------
    // Step 8: Import Sessions (v2+)
    // -------------------------------------------------------------------------

    const sessionIdMap = new Map<string, string>();
    let sessionsImported = 0;

    if (deps.sessionRepo && exportData.sessions && exportData.sessions.length > 0) {
      for (const exportedSession of exportData.sessions) {
        const newSessionId = deps.idGenerator.generateId();
        sessionIdMap.set(exportedSession.id, newSessionId);

        // Remap scenarioId if it matches the scenario we just created
        const newScenarioId = scenario ? scenario.id : undefined;

        const session: Session = {
          id: newSessionId,
          programId: program.id,
          name: String(exportedSession.name),
          academicYear: String(exportedSession.academicYear),
          startDate: new Date(exportedSession.startDate),
          endDate: new Date(exportedSession.endDate),
          status: exportedSession.status as Session['status'],
          scenarioId: exportedSession.scenarioId ? newScenarioId : undefined,
          publishedAt: exportedSession.publishedAt
            ? new Date(exportedSession.publishedAt)
            : undefined,
          createdAt: new Date(exportedSession.createdAt),
          userId
        };

        await deps.sessionRepo.save(session);
        sessionsImported++;
      }
    }

    // -------------------------------------------------------------------------
    // Step 9: Import Placements (v2+)
    // -------------------------------------------------------------------------

    let placementsImported = 0;

    if (deps.placementRepo && exportData.placements && exportData.placements.length > 0) {
      const placementsToSave: Placement[] = [];

      for (const exportedPlacement of exportData.placements) {
        const newSessionId = sessionIdMap.get(exportedPlacement.sessionId);
        const newStudentId = studentIdMap.get(exportedPlacement.studentId);
        const newGroupId = groupIdMap.get(exportedPlacement.groupId);

        // Placements must reference entities created by this import. Retaining
        // source IDs would produce records that cannot be resolved locally.
        if (!newSessionId || !newStudentId || !newGroupId) continue;

        const placement: Placement = {
          id: deps.idGenerator.generateId(),
          sessionId: newSessionId,
          studentId: newStudentId,
          groupId: newGroupId,
          groupName: String(exportedPlacement.groupName),
          preferenceRank: exportedPlacement.preferenceRank,
          preferenceSnapshot: exportedPlacement.preferenceSnapshot?.map(
            (gId) => groupIdMap.get(gId) ?? gId
          ),
          assignedAt: new Date(exportedPlacement.assignedAt),
          startDate: new Date(exportedPlacement.startDate),
          endDate: exportedPlacement.endDate ? new Date(exportedPlacement.endDate) : undefined,
          type: exportedPlacement.type as Placement['type'],
          correctsPlacementId: exportedPlacement.correctsPlacementId,
          reason: exportedPlacement.reason
        };

        placementsToSave.push(placement);
      }

      if (placementsToSave.length > 0) {
        await deps.placementRepo.saveBatch(placementsToSave);
        placementsImported = placementsToSave.length;
      }
    }

    // -------------------------------------------------------------------------
    // Step 10: Import Observations (v2+)
    // -------------------------------------------------------------------------

    let observationsImported = 0;

    if (deps.observationRepo && exportData.observations && exportData.observations.length > 0) {
      for (const exportedObs of exportData.observations) {
        const newSessionId = exportedObs.sessionId
          ? sessionIdMap.get(exportedObs.sessionId)
          : undefined;
        const newGroupId = groupIdMap.get(exportedObs.groupId);

        // Observations are only useful when their group exists in the imported scenario.
        if (!newGroupId) continue;

        const observation: Observation = {
          id: deps.idGenerator.generateId(),
          programId: program.id,
          sessionId: newSessionId,
          groupId: newGroupId,
          groupName: String(exportedObs.groupName),
          content: String(exportedObs.content),
          sentiment: exportedObs.sentiment as Observation['sentiment'],
          tags: exportedObs.tags,
          createdAt: new Date(exportedObs.createdAt),
          userId
        };

        await deps.observationRepo.save(observation);
        observationsImported++;
      }
    }

    // -------------------------------------------------------------------------
    // Step 11: Import Peer Requests (v3+)
    // -------------------------------------------------------------------------

    let peerRequestsImported = 0;

    if (deps.peerRequestRepo && exportData.peerRequests && exportData.peerRequests.length > 0) {
      const peerRequestsToSave: PeerRequestEntry[] = [];

      for (const exportedRequest of exportData.peerRequests) {
        const newRequesterStudentId = studentIdMap.get(exportedRequest.requesterStudentId);
        if (!newRequesterStudentId) {
          continue;
        }

        const remappedResolvedStudentId = exportedRequest.resolvedStudentId
          ? studentIdMap.get(exportedRequest.resolvedStudentId)
          : undefined;
        const remappedInitialResolvedStudentId = exportedRequest.initialResolvedStudentId
          ? studentIdMap.get(exportedRequest.initialResolvedStudentId)
          : undefined;

        peerRequestsToSave.push(
          createPeerRequestEntry({
            id: deps.idGenerator.generateId(),
            programId: program.id,
            requesterStudentId: newRequesterStudentId,
            rank: exportedRequest.rank,
            rawText: exportedRequest.rawText,
            normalizedText: exportedRequest.normalizedText,
            status: remappedResolvedStudentId ? exportedRequest.status : 'UNRESOLVED',
            resolvedStudentId: remappedResolvedStudentId,
            resolutionSource: remappedResolvedStudentId ? exportedRequest.resolutionSource : 'NONE',
            initialResolvedStudentId: remappedInitialResolvedStudentId,
            initialResolutionSource: remappedInitialResolvedStudentId
              ? exportedRequest.initialResolutionSource
              : undefined,
            resolutionHistory: exportedRequest.resolutionHistory.map((entry) => ({
              action: entry.action,
              resolvedStudentId: entry.resolvedStudentId
                ? studentIdMap.get(entry.resolvedStudentId)
                : undefined,
              resolutionSource: entry.resolutionSource,
              occurredAt: entry.occurredAt
            })),
            candidates: exportedRequest.candidates
              .map((candidate) => {
                const studentId = studentIdMap.get(candidate.studentId);
                if (!studentId) return null;
                return {
                  studentId,
                  score: candidate.score,
                  confidence: candidate.confidence,
                  baseScore: candidate.baseScore,
                  reasons: [...candidate.reasons]
                };
              })
              .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
          })
        );
      }

      if (peerRequestsToSave.length > 0) {
        if (typeof deps.peerRequestRepo.saveMany === 'function') {
          await deps.peerRequestRepo.saveMany(peerRequestsToSave);
        } else {
          for (const request of peerRequestsToSave) {
            await deps.peerRequestRepo.save(request);
          }
        }
        peerRequestsImported = peerRequestsToSave.length;
      }
    }

    // -------------------------------------------------------------------------
    // Return Result
    // -------------------------------------------------------------------------

    return ok({
      program,
      pool,
      scenario,
      studentsImported: students.length,
      preferencesImported,
      groupsImported,
      sessionsImported,
      placementsImported,
      observationsImported,
      peerRequestsImported
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error during import';
    return err({ type: 'INTERNAL_ERROR', message });
  }
}
