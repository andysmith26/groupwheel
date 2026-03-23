/**
 * createGroupingActivity use case.
 *
 * Orchestrates the creation of a complete "grouping activity" from the
 * teacher's perspective. This is a composite use case that coordinates:
 * 1. Creating a Pool (roster) from parsed student data
 * 2. Creating a Program (activity) linked to that Pool
 * 3. Storing Preferences for students
 *
 * This use case exists because the UI presents a unified "grouping activity"
 * concept while the domain model correctly separates Pool (roster) from
 * Program (activity) from Preferences (student input).
 *
 * See decision record: docs/decisions/2025-12-01-create-groups-wizard.md
 *
 * @module application/useCases/createGroupingActivity
 */

import type {
  PoolRepository,
  StudentRepository,
  ProgramRepository,
  PreferenceRepository,
  ScenarioRepository,
  IdGenerator,
  Clock
} from '$lib/application/ports';
import type { Pool, Program, Student, Group } from '$lib/domain';
import type { Scenario } from '$lib/domain/scenario';
import { createScenario } from '$lib/domain/scenario';
import type { Preference, StudentPreference } from '$lib/domain/preference';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

/**
 * A parsed student from the roster paste step.
 */
export interface ParsedStudent {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  grade?: string;
  meta?: Record<string, string>;
}

/**
 * A parsed preference from the preferences paste step.
 * Now supports group requests (likeGroupIds) instead of friend preferences.
 */
export interface ParsedPreference {
  studentId: string;
  /** Ranked list of group IDs the student wants to join */
  likeGroupIds?: string[];
  /** List of student IDs to avoid (optional constraint) */
  avoidStudentIds?: string[];
}

/**
 * Strategy for initial group member assignment when groups are created.
 *
 * - 'none': Create empty groups with no members assigned.
 * - 'top-choice': Assign each student who has preferences to their 1st choice group.
 */
export type SeedingStrategy = 'none' | 'top-choice';

/**
 * Input for creating a grouping activity.
 */
export interface CreateGroupingActivityInput {
  /** Name for the activity (e.g., "Lab Partners - Week 1") */
  activityName: string;

  /** Parsed students from roster paste */
  students: ParsedStudent[];

  /** Parsed preferences from preferences paste (optional) */
  preferences?: ParsedPreference[];

  /** Group names extracted from the import file (e.g. unique choice values from CSV) */
  groupNames?: string[];

  /** How to seed initial group assignments. Defaults to 'none'. */
  seedingStrategy?: SeedingStrategy;

  /** If reusing an existing roster, the Pool ID */
  existingPoolId?: string;

  /** Owner staff ID */
  ownerStaffId: string;

  /** ID of the authenticated user (for multi-tenant data isolation) */
  userId?: string;
}

// =============================================================================
// Output Types
// =============================================================================

/**
 * Successful result of creating a grouping activity.
 */
export interface CreateGroupingActivityResult {
  pool: Pool;
  program: Program;
  scenario?: Scenario;
  preferencesImported: number;
  preferencesSkipped: number;
  warnings: string[];
}

/**
 * Error types for creating a grouping activity.
 */
export type CreateGroupingActivityError =
  | { type: 'NO_STUDENTS'; message: string }
  | { type: 'POOL_CREATION_FAILED'; message: string }
  | { type: 'PROGRAM_CREATION_FAILED'; message: string }
  | { type: 'POOL_NOT_FOUND'; poolId: string; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface CreateGroupingActivityDeps {
  poolRepo: PoolRepository;
  studentRepo: StudentRepository;
  programRepo: ProgramRepository;
  preferenceRepo: PreferenceRepository;
  scenarioRepo: ScenarioRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

/**
 * Create a grouping activity (Pool + Program + Preferences).
 *
 * This is a composite use case that orchestrates multiple domain operations
 * to support the unified "Create Groups" wizard UI.
 */
export async function createGroupingActivity(
  deps: CreateGroupingActivityDeps,
  input: CreateGroupingActivityInput
): Promise<Result<CreateGroupingActivityResult, CreateGroupingActivityError>> {
  const warnings: string[] = [];

  // -------------------------------------------------------------------------
  // Step 1: Resolve or create Pool
  // -------------------------------------------------------------------------

  let pool: Pool;
  let students: Student[];

  if (input.existingPoolId) {
    // Reusing existing roster
    const existingPool = await deps.poolRepo.getById(input.existingPoolId);
    if (!existingPool) {
      return err({
        type: 'POOL_NOT_FOUND',
        poolId: input.existingPoolId,
        message: `Pool not found: ${input.existingPoolId}`
      });
    }
    if (input.userId && !existingPool.userId) {
      pool = { ...existingPool, userId: input.userId };
      await deps.poolRepo.update(pool);
    } else {
      pool = existingPool;
    }
    students = await deps.studentRepo.getByIds(pool.memberIds);
  } else {
    // Creating new roster from parsed students
    if (input.students.length === 0) {
      return err({
        type: 'NO_STUDENTS',
        message: 'No students provided. Add at least one student to create an activity.'
      });
    }

    // Convert parsed students to domain Student objects
    // Note: We explicitly copy properties to ensure we don't pass Svelte proxies to IndexedDB
    students = input.students.map((ps) => ({
      id: ps.id,
      firstName: ps.firstName,
      lastName: ps.lastName || undefined,
      gradeLevel: ps.grade,
      meta: ps.meta ? { ...ps.meta } : undefined
    }));

    // Save students
    await deps.studentRepo.saveMany(students);

    // Create pool
    const poolId = deps.idGenerator.generateId();
    pool = {
      id: poolId,
      name: `${input.activityName} Roster`,
      type: 'CLASS' as const,
      memberIds: students.map((s) => s.id),
      status: 'ACTIVE' as const,
      primaryStaffOwnerId: input.ownerStaffId,
      source: 'IMPORT' as const,
      userId: input.userId
    };

    await deps.poolRepo.save(pool);
  }

  // -------------------------------------------------------------------------
  // Step 2: Create Program
  // -------------------------------------------------------------------------

  const programId = deps.idGenerator.generateId();
  const program: Program = {
    id: programId,
    name: input.activityName,
    type: 'CLASS_ACTIVITY' as const,
    timeSpan: { termLabel: new Date().toISOString() },
    poolIds: [pool.id],
    primaryPoolId: pool.id,
    ownerStaffIds: [input.ownerStaffId],
    userId: input.userId
  };

  await deps.programRepo.save(program);

  // -------------------------------------------------------------------------
  // Step 3: Import Preferences
  // -------------------------------------------------------------------------

  let preferencesImported = 0;
  let preferencesSkipped = 0;
  const preferencesToSave: Preference[] = [];

  if (input.preferences && input.preferences.length > 0) {
    const studentIdSet = new Set(students.map((s) => s.id.toLowerCase()));

    for (const parsedPref of input.preferences) {
      const studentId = parsedPref.studentId.toLowerCase();

      // Validate student exists in roster
      if (!studentIdSet.has(studentId)) {
        warnings.push(`Preference for unknown student: ${parsedPref.studentId}`);
        preferencesSkipped++;
        continue;
      }

      // Filter avoid IDs to only include valid roster members
      const validAvoidIds = (parsedPref.avoidStudentIds || [])
        .map((id) => id.toLowerCase())
        .filter((avoidId) => {
          if (!studentIdSet.has(avoidId)) {
            warnings.push(
              `Unknown student ID "${avoidId}" in avoid list for ${parsedPref.studentId}`
            );
            return false;
          }
          return true;
        });

      const preference: Preference = {
        id: deps.idGenerator.generateId(),
        programId: program.id,
        studentId: studentId,
        payload: {
          studentId: studentId,
          avoidStudentIds: validAvoidIds,
          likeGroupIds: parsedPref.likeGroupIds ? [...parsedPref.likeGroupIds] : [],
          avoidGroupIds: []
        } satisfies StudentPreference
      };

      preferencesToSave.push(preference);
      preferencesImported++;
    }

    // Save preferences using repository methods (bulk if available).
    if (typeof deps.preferenceRepo.setForProgram === 'function') {
      await deps.preferenceRepo.setForProgram(program.id, preferencesToSave);
    } else {
      for (const pref of preferencesToSave) {
        await deps.preferenceRepo.save(pref);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Create Scenario with groups (if group names provided)
  // -------------------------------------------------------------------------

  let scenario: Scenario | undefined;

  if (input.groupNames && input.groupNames.length > 0) {
    // Build a name→id map for the groups
    const groupNameToId = new Map<string, string>();
    const groups: Group[] = input.groupNames.map((name, index) => {
      const id = deps.idGenerator.generateId();
      groupNameToId.set(name, id);
      return {
        id,
        name,
        capacity: null,
        memberIds: [],
        colorIndex: index
      };
    });

    // Update saved preferences to use group IDs instead of group names
    if (preferencesImported > 0) {
      const updatedPreferences: Preference[] = [];
      for (const pref of preferencesToSave) {
        const payload = pref.payload as StudentPreference;
        const mappedIds = payload.likeGroupIds.map(
          (nameOrId) => groupNameToId.get(nameOrId) ?? nameOrId
        );
        updatedPreferences.push({
          ...pref,
          payload: { ...payload, likeGroupIds: mappedIds }
        });
      }
      preferencesToSave.length = 0;
      preferencesToSave.push(...updatedPreferences);

      // Re-save preferences with corrected group IDs
      if (typeof deps.preferenceRepo.setForProgram === 'function') {
        await deps.preferenceRepo.setForProgram(program.id, preferencesToSave);
      } else {
        for (const pref of preferencesToSave) {
          await deps.preferenceRepo.save(pref);
        }
      }
    }

    // Seed group members based on strategy
    if (input.seedingStrategy === 'top-choice' && input.preferences) {
      const groupIdToGroup = new Map(groups.map((g) => [g.id, g]));

      for (const pref of input.preferences) {
        const firstChoice = pref.likeGroupIds?.[0];
        if (!firstChoice) continue;

        // likeGroupIds contain group names (raw strings from CSV)
        const groupId = groupNameToId.get(firstChoice);
        if (!groupId) continue;

        const group = groupIdToGroup.get(groupId);
        if (group) {
          group.memberIds.push(pref.studentId);
        }
      }
    }

    scenario = createScenario({
      id: deps.idGenerator.generateId(),
      programId: program.id,
      groups,
      participantIds: pool.memberIds,
      createdAt: deps.clock.now(),
      createdByStaffId: input.ownerStaffId
    });

    await deps.scenarioRepo.save(scenario);
  }

  // -------------------------------------------------------------------------
  // Return Result
  // -------------------------------------------------------------------------

  return ok({
    pool,
    program,
    scenario,
    preferencesImported,
    preferencesSkipped,
    warnings
  });
}
