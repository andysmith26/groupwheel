import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type {
  CreateProgramInput,
  CreateProgramError
} from '$lib/application/useCases/createProgram';
import { createProgram as runCreateProgram } from '$lib/application/useCases/createProgram';
import type {
  GenerateScenarioInput,
  GenerateScenarioError
} from '$lib/application/useCases/generateScenario';
import { generateScenarioForProgram } from '$lib/application/useCases/generateScenario';
import type {
  GenerateCandidateInput,
  GenerateCandidateError,
  CandidateGrouping as CandidateGroupingSingle
} from '$lib/application/useCases/generateCandidate';
import { generateCandidate as generateCandidateUseCase } from '$lib/application/useCases/generateCandidate';
import type {
  GenerateMultipleCandidatesInput,
  GenerateMultipleCandidatesError,
  CandidateGrouping
} from '$lib/application/useCases/generateMultipleCandidates';
import { generateMultipleCandidates } from '$lib/application/useCases/generateMultipleCandidates';
import type {
  CreateScenarioFromGroupsInput,
  CreateScenarioFromGroupsError
} from '$lib/application/useCases/createScenarioFromGroups';
import { createScenarioFromGroups } from '$lib/application/useCases/createScenarioFromGroups';
import type {
  ComputeScenarioAnalyticsInput,
  ComputeScenarioAnalyticsError
} from '$lib/application/useCases/computeScenarioAnalytics';
import { computeScenarioAnalytics } from '$lib/application/useCases/computeScenarioAnalytics';
import type { GetProgramError, ProgramWithPools } from '$lib/application/useCases/getProgram';
import { getProgram } from '$lib/application/useCases/getProgram';
import type {
  GetStudentViewInput,
  GetStudentViewError,
  StudentViewData
} from '$lib/application/useCases/getStudentView';
import { getStudentView } from '$lib/application/useCases/getStudentView';
import type { Pool, Program } from '$lib/domain';
import type {
  ImportPoolFromCsvInput,
  ImportPoolFromCsvError
} from '$lib/application/useCases/importPoolFromCsv';
import { importPoolFromCsv } from '$lib/application/useCases/importPoolFromCsv';
import type {
  CreatePoolFromRosterDataInput,
  CreatePoolFromRosterDataError
} from '$lib/application/useCases/createPoolFromRosterData';
import { createPoolFromRosterData } from '$lib/application/useCases/createPoolFromRosterData';
import type { ImportRosterInput, ImportRosterError } from '$lib/application/useCases/importRoster';
import { importRoster as importRosterUseCase } from '$lib/application/useCases/importRoster';
import type {
  ImportRosterWithMappingInput,
  ImportRosterWithMappingResult,
  ImportRosterWithMappingError
} from '$lib/application/useCases/importRosterWithMapping';
import { importRosterWithMapping as importRosterWithMappingUseCase } from '$lib/application/useCases/importRosterWithMapping';
import type {
  ListProgramsError,
  ProgramWithPrimaryPool
} from '$lib/application/useCases/listPrograms';
import { listPrograms as listProgramsUseCase } from '$lib/application/useCases/listPrograms';
import {
  createGroupingActivity as createGroupingActivityUseCase,
  type CreateGroupingActivityInput,
  type CreateGroupingActivityResult,
  type CreateGroupingActivityError,
  type ParsedPreference,
  type SeedingStrategy
} from '$lib/application/useCases/createGroupingActivity';
import {
  importActivity as importActivityUseCase,
  type ImportActivityInput,
  type ImportActivityResult,
  type ImportActivityError
} from '$lib/application/useCases/importActivity';
import {
  exportActivity as exportActivityUseCase,
  type ExportActivityInput,
  type ExportActivityError
} from '$lib/application/useCases/exportActivity';
import type { RosterData } from '$lib/services/rosterImport';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';
import { listPools as listPoolsUseCase } from '$lib/application/useCases/listPools';
import {
  listActivities as listActivitiesUseCase,
  type ActivityDisplay
} from '$lib/application/useCases/listActivities';
import {
  getActivityData as getActivityDataUseCase,
  type GetActivityDataInput,
  type GetActivityDataError,
  type ActivityData
} from '$lib/application/useCases/getActivityData';
import {
  getStudentActivityView as getStudentActivityViewUseCase,
  type GetStudentActivityViewInput,
  type GetStudentActivityViewError,
  type StudentActivityViewData
} from '$lib/application/useCases/getStudentActivityView';
import {
  getPoolWithStudents as getPoolWithStudentsUseCase,
  type GetPoolWithStudentsInput,
  type GetPoolWithStudentsError,
  type PoolWithStudents
} from '$lib/application/useCases/getPoolWithStudents';
import type { GroupTemplate } from '$lib/domain/groupTemplate';
import {
  createGroupTemplate as createGroupTemplateUseCase,
  type CreateGroupTemplateInput as CreateGroupTemplateUseCaseInput,
  type CreateGroupTemplateError
} from '$lib/application/useCases/createGroupTemplate';
import {
  listGroupTemplates as listGroupTemplatesUseCase,
  type ListGroupTemplatesInput
} from '$lib/application/useCases/listGroupTemplates';
import {
  getGroupTemplate as getGroupTemplateUseCase,
  type GetGroupTemplateInput,
  type GetGroupTemplateError
} from '$lib/application/useCases/getGroupTemplate';
import {
  updateGroupTemplate as updateGroupTemplateUseCase,
  type UpdateGroupTemplateInput,
  type UpdateGroupTemplateError
} from '$lib/application/useCases/updateGroupTemplate';
import {
  deleteGroupTemplate as deleteGroupTemplateUseCase,
  type DeleteGroupTemplateInput
} from '$lib/application/useCases/deleteGroupTemplate';
import { login as loginUseCase, type LoginError } from '$lib/application/useCases/login';
import { logout as logoutUseCase, type LogoutError } from '$lib/application/useCases/logout';
import {
  getCurrentUser as getCurrentUserUseCase,
  isAuthenticated as isAuthenticatedUseCase,
  onAuthStateChange as onAuthStateChangeUseCase
} from '$lib/application/useCases/getCurrentUser';
import type { AuthUser } from '$lib/application/ports';

/**
 * Get the current authenticated user's ID, if any.
 * Returns undefined for anonymous users.
 */
function getCurrentUserId(env: InMemoryEnvironment): string | undefined {
  if (!env.authService) return undefined;
  const user = env.authService.isAuthenticated()
    ? (env.authService as unknown as { getUserSync(): AuthUser | null }).getUserSync?.()
    : null;
  return user?.id;
}

async function claimAnonymousActivities(env: InMemoryEnvironment, userId: string): Promise<void> {
  const [programs, pools] = await Promise.all([env.programRepo.listAll(), env.poolRepo.listAll()]);
  const programsToClaim = programs.filter((program) => program.userId === undefined);
  const poolsToClaim = pools.filter((pool) => pool.userId === undefined);
  if (programsToClaim.length === 0 && poolsToClaim.length === 0) return;

  await Promise.all([
    ...programsToClaim.map((program) => env.programRepo.update({ ...program, userId })),
    ...poolsToClaim.map((pool) => env.poolRepo.update({ ...pool, userId }))
  ]);
}

export async function importPool(
  env: InMemoryEnvironment,
  input: ImportPoolFromCsvInput
): Promise<Result<Pool, ImportPoolFromCsvError>> {
  return importPoolFromCsv(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      staffRepo: env.staffRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}
/**
 * List all Pools.
 */
export async function listPools(env: InMemoryEnvironment) {
  return listPoolsUseCase({ poolRepo: env.poolRepo });
}

export async function createProgram(
  env: InMemoryEnvironment,
  input: CreateProgramInput
): Promise<Result<import('$lib/domain').Program, CreateProgramError>> {
  return runCreateProgram(
    {
      poolRepo: env.poolRepo,
      programRepo: env.programRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

export async function generateScenario(
  env: InMemoryEnvironment,
  input: GenerateScenarioInput
): Promise<Result<import('$lib/domain').Scenario, GenerateScenarioError>> {
  return generateScenarioForProgram(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      scenarioRepo: env.scenarioRepo,
      idGenerator: env.idGenerator,
      clock: env.clock,
      groupingAlgorithm: env.groupingAlgorithm
    },
    input
  );
}

export async function generateCandidates(
  env: InMemoryEnvironment,
  input: GenerateMultipleCandidatesInput
): Promise<Result<CandidateGrouping[], GenerateMultipleCandidatesError>> {
  return generateMultipleCandidates(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      preferenceRepo: env.preferenceRepo,
      idGenerator: env.idGenerator,
      clock: env.clock,
      groupingAlgorithm: env.groupingAlgorithm
    },
    input
  );
}

export async function generateCandidate(
  env: InMemoryEnvironment,
  input: GenerateCandidateInput
): Promise<Result<CandidateGroupingSingle, GenerateCandidateError>> {
  return generateCandidateUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      preferenceRepo: env.preferenceRepo,
      idGenerator: env.idGenerator,
      clock: env.clock,
      groupingAlgorithm: env.groupingAlgorithm
    },
    input
  );
}

// =============================================================================
// Quick Grouping Operations
// =============================================================================

import {
  quickGenerateGroups as quickGenerateGroupsUseCase,
  type QuickGenerateGroupsInput,
  type QuickGenerateGroupsError
} from '$lib/application/useCases/quickGenerateGroups';

/**
 * Quick-generate groups from a target group size.
 * Composes candidate generation + scenario persistence for the Start Session flow.
 */
export async function quickGenerateGroups(
  env: InMemoryEnvironment,
  input: QuickGenerateGroupsInput
): Promise<Result<import('$lib/domain').Scenario, QuickGenerateGroupsError>> {
  return quickGenerateGroupsUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      idGenerator: env.idGenerator,
      clock: env.clock,
      groupingAlgorithm: env.groupingAlgorithm
    },
    input
  );
}

// Re-export quick grouping types
export type { QuickGenerateGroupsInput, QuickGenerateGroupsError };

import {
  generateComparisonScenario as generateComparisonScenarioUseCase,
  type GenerateComparisonInput,
  type GenerateComparisonError,
  type ComparisonCandidate
} from '$lib/application/useCases/generateComparisonScenario';

/**
 * Generate a comparison scenario without persisting it.
 * Returns groups + analytics in-memory for side-by-side comparison.
 */
export async function generateComparisonScenario(
  env: InMemoryEnvironment,
  input: GenerateComparisonInput
): Promise<Result<ComparisonCandidate, GenerateComparisonError>> {
  return generateComparisonScenarioUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      preferenceRepo: env.preferenceRepo,
      idGenerator: env.idGenerator,
      clock: env.clock,
      groupingAlgorithm: env.groupingAlgorithm
    },
    input
  );
}

export type { GenerateComparisonInput, GenerateComparisonError, ComparisonCandidate };

export async function createScenarioFromCandidate(
  env: InMemoryEnvironment,
  input: CreateScenarioFromGroupsInput
): Promise<Result<import('$lib/domain').Scenario, CreateScenarioFromGroupsError>> {
  return createScenarioFromGroups(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      scenarioRepo: env.scenarioRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}

export async function createGroupingActivity(
  env: InMemoryEnvironment,
  input: CreateGroupingActivityInput
): Promise<Result<CreateGroupingActivityResult, CreateGroupingActivityError>> {
  const userId = input.userId ?? getCurrentUserId(env);
  return createGroupingActivityUseCase(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      programRepo: env.programRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    { ...input, userId }
  );
}

/**
 * Import an activity from a previously exported JSON file.
 * Creates all necessary entities: Students, Pool, Program, Preferences,
 * and optionally a Scenario with groups.
 */
export async function importActivity(
  env: InMemoryEnvironment,
  input: Omit<ImportActivityInput, 'userId'>
): Promise<Result<ImportActivityResult, ImportActivityError>> {
  const userId = getCurrentUserId(env);
  return importActivityUseCase(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      programRepo: env.programRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      sessionRepo: env.sessionRepo,
      placementRepo: env.placementRepo,
      observationRepo: env.observationRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    { ...input, userId }
  );
}

export async function exportActivityData(
  env: InMemoryEnvironment,
  input: ExportActivityInput
): Promise<Result<import('$lib/utils/activityFile').ActivityExportData, ExportActivityError>> {
  return exportActivityUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      sessionRepo: env.sessionRepo,
      placementRepo: env.placementRepo,
      observationRepo: env.observationRepo
    },
    input
  );
}

export async function computeAnalytics(
  env: InMemoryEnvironment,
  input: ComputeScenarioAnalyticsInput
): Promise<Result<import('$lib/domain').ScenarioSatisfaction, ComputeScenarioAnalyticsError>> {
  return computeScenarioAnalytics(
    {
      scenarioRepo: env.scenarioRepo,
      preferenceRepo: env.preferenceRepo,
      studentRepo: env.studentRepo
    },
    input
  );
}

export async function getStudentViewForScenario(
  env: InMemoryEnvironment,
  input: GetStudentViewInput
): Promise<Result<StudentViewData, GetStudentViewError>> {
  return getStudentView(
    {
      scenarioRepo: env.scenarioRepo,
      studentRepo: env.studentRepo
    },
    input
  );
}

export async function createPoolFromRoster(
  env: InMemoryEnvironment,
  input: Omit<CreatePoolFromRosterDataInput, 'rosterData'> & { rosterData: RosterData }
): Promise<Result<Pool, CreatePoolFromRosterDataError>> {
  return createPoolFromRosterData(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      staffRepo: env.staffRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

export type {
  CreateGroupingActivityInput,
  CreateGroupingActivityResult,
  CreateGroupingActivityError,
  SeedingStrategy,
  ParsedStudent,
  ParsedPreference
} from '$lib/application/useCases/createGroupingActivity';

export type { ImportActivityInput, ImportActivityResult, ImportActivityError };

export async function listPrograms(
  env: InMemoryEnvironment
): Promise<Result<ProgramWithPrimaryPool[], ListProgramsError>> {
  const userId = getCurrentUserId(env);
  return listProgramsUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo
    },
    { userId }
  );
}

export async function getProgramWithPools(
  env: InMemoryEnvironment,
  programId: string
): Promise<Result<ProgramWithPools, GetProgramError>> {
  return getProgram(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo
    },
    { programId }
  );
}
export async function importRoster(
  env: InMemoryEnvironment,
  input: ImportRosterInput
): Promise<Result<Pool, ImportRosterError>> {
  return importRosterUseCase(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      staffRepo: env.staffRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

/**
 * Import a roster from raw sheet data with column mappings.
 * Used for Google Sheets import where columns need user-defined mapping.
 */
export async function importRosterWithMapping(
  env: InMemoryEnvironment,
  input: ImportRosterWithMappingInput
): Promise<Result<ImportRosterWithMappingResult, ImportRosterWithMappingError>> {
  return importRosterWithMappingUseCase(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      preferenceRepo: env.preferenceRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

// Re-export types for Google Sheets import
export type {
  ImportRosterWithMappingInput,
  ImportRosterWithMappingResult,
  ImportRosterWithMappingError
};

// =============================================================================
// Group Template Operations
// =============================================================================

/**
 * Create a new group template.
 */
export async function createGroupTemplate(
  env: InMemoryEnvironment,
  input: CreateGroupTemplateUseCaseInput
): Promise<Result<GroupTemplate, CreateGroupTemplateError>> {
  return createGroupTemplateUseCase(
    {
      groupTemplateRepo: env.groupTemplateRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

/**
 * List all group templates for the current user.
 */
export async function listGroupTemplates(
  env: InMemoryEnvironment,
  ownerStaffId?: string
): Promise<Result<GroupTemplate[], never>> {
  return listGroupTemplatesUseCase(
    {
      groupTemplateRepo: env.groupTemplateRepo
    },
    { ownerStaffId }
  );
}

/**
 * Get a group template by ID.
 */
export async function getGroupTemplate(
  env: InMemoryEnvironment,
  templateId: string
): Promise<Result<GroupTemplate, GetGroupTemplateError>> {
  return getGroupTemplateUseCase(
    {
      groupTemplateRepo: env.groupTemplateRepo
    },
    { templateId }
  );
}

/**
 * Update an existing group template.
 */
export async function updateGroupTemplate(
  env: InMemoryEnvironment,
  input: UpdateGroupTemplateInput
): Promise<Result<GroupTemplate, UpdateGroupTemplateError>> {
  return updateGroupTemplateUseCase(
    {
      groupTemplateRepo: env.groupTemplateRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

/**
 * Delete a group template.
 */
export async function deleteGroupTemplate(
  env: InMemoryEnvironment,
  templateId: string
): Promise<Result<void, never>> {
  return deleteGroupTemplateUseCase(
    {
      groupTemplateRepo: env.groupTemplateRepo
    },
    { templateId }
  );
}

// Re-export group template types for convenience
export type {
  CreateGroupTemplateUseCaseInput as CreateGroupTemplateInput,
  CreateGroupTemplateError,
  UpdateGroupTemplateInput,
  UpdateGroupTemplateError,
  GetGroupTemplateError
};

// =============================================================================
// Activity Data Operations
// =============================================================================

/**
 * List all grouping activities with display metadata.
 * Automatically filters by current user when authenticated.
 */
export async function listActivities(
  env: InMemoryEnvironment
): Promise<
  Result<ActivityDisplay[], import('$lib/application/useCases/listActivities').ListActivitiesError>
> {
  const userId = getCurrentUserId(env);
  if (userId) {
    try {
      await claimAnonymousActivities(env, userId);
    } catch {
      // Claiming legacy anonymous data is best-effort; listing can still proceed.
    }
  }
  return listActivitiesUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      scenarioRepo: env.scenarioRepo,
      sessionRepo: env.sessionRepo
    },
    { userId }
  );
}

/**
 * Get complete activity data for the workspace view.
 */
export async function getActivityData(
  env: InMemoryEnvironment,
  input: GetActivityDataInput
): Promise<Result<ActivityData, GetActivityDataError>> {
  return getActivityDataUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo,
      preferenceRepo: env.preferenceRepo,
      scenarioRepo: env.scenarioRepo,
      sessionRepo: env.sessionRepo
    },
    input
  );
}

/**
 * Get activity data for student view.
 */
export async function getStudentActivityView(
  env: InMemoryEnvironment,
  input: GetStudentActivityViewInput
): Promise<Result<StudentActivityViewData, GetStudentActivityViewError>> {
  return getStudentActivityViewUseCase(
    {
      programRepo: env.programRepo,
      poolRepo: env.poolRepo,
      scenarioRepo: env.scenarioRepo,
      studentRepo: env.studentRepo
    },
    input
  );
}

/**
 * Get a pool with its associated students.
 */
export async function getPoolWithStudents(
  env: InMemoryEnvironment,
  input: GetPoolWithStudentsInput
): Promise<Result<PoolWithStudents, GetPoolWithStudentsError>> {
  return getPoolWithStudentsUseCase(
    {
      poolRepo: env.poolRepo,
      studentRepo: env.studentRepo
    },
    input
  );
}

// Re-export types for convenience
export type { ActivityDisplay, ActivityData, StudentActivityViewData, PoolWithStudents };

// =============================================================================
// Quick Start Operations
// =============================================================================

import {
  quickStartActivity as quickStartActivityUseCase,
  type QuickStartActivityInput,
  type QuickStartActivityResult,
  type QuickStartActivityError
} from '$lib/application/useCases/quickStartActivity';

/**
 * Quick-start an activity from just a student count and group size.
 * Creates placeholder students and a program, ready for "Generate & Show".
 */
export async function quickStartActivity(
  env: InMemoryEnvironment,
  input: Omit<QuickStartActivityInput, 'staffId'>
): Promise<Result<QuickStartActivityResult, QuickStartActivityError>> {
  return quickStartActivityUseCase(
    {
      idGenerator: env.idGenerator,
      studentRepository: env.studentRepo,
      poolRepository: env.poolRepo,
      programRepository: env.programRepo
    },
    { ...input, staffId: 'owner-1' }
  );
}

// Re-export quick start types
export type { QuickStartActivityInput, QuickStartActivityResult, QuickStartActivityError };

// =============================================================================
// Quick Start Upgrade Operations (WP11)
// =============================================================================

import {
  upgradeQuickStartRoster as upgradeQuickStartRosterUseCase,
  type UpgradeQuickStartRosterInput,
  type UpgradeQuickStartRosterResult,
  type UpgradeQuickStartRosterError
} from '$lib/application/useCases/upgradeQuickStartRoster';

/**
 * Replace placeholder students in a quick-start activity with real names.
 * Preserves group structure when counts match (Decision 5, Banked Note #2).
 */
export async function upgradeQuickStartRoster(
  env: InMemoryEnvironment,
  input: UpgradeQuickStartRosterInput
): Promise<Result<UpgradeQuickStartRosterResult, UpgradeQuickStartRosterError>> {
  return upgradeQuickStartRosterUseCase(
    {
      idGenerator: env.idGenerator,
      studentRepository: env.studentRepo,
      poolRepository: env.poolRepo
    },
    input
  );
}

// Re-export upgrade types
export type {
  UpgradeQuickStartRosterInput,
  UpgradeQuickStartRosterResult,
  UpgradeQuickStartRosterError
};

// =============================================================================
// Demo Activity Operations
// =============================================================================

import {
  createDemoActivity as createDemoActivityUseCase,
  type CreateDemoActivityResult,
  type CreateDemoActivityError
} from '$lib/application/useCases/createDemoActivity';

/**
 * Create a demo activity with pre-generated groups for onboarding.
 * The teacher sees 24 students in 6 groups immediately on the live view.
 */
export async function createDemoActivity(
  env: InMemoryEnvironment
): Promise<Result<CreateDemoActivityResult, CreateDemoActivityError>> {
  return createDemoActivityUseCase(
    {
      idGenerator: env.idGenerator,
      studentRepository: env.studentRepo,
      poolRepository: env.poolRepo,
      programRepository: env.programRepo,
      scenarioRepository: env.scenarioRepo,
      sessionRepository: env.sessionRepo,
      placementRepository: env.placementRepo
    },
    { staffId: 'owner-1' }
  );
}

/**
 * Delete a demo activity and all associated data.
 * Removes program, scenario, sessions, and placements.
 * Students and pool are orphaned (ports don't support delete).
 */
export async function deleteDemoActivity(
  env: InMemoryEnvironment,
  programId: string
): Promise<void> {
  // Delete sessions and their placements
  const sessions = await env.sessionRepo.listByProgramId(programId);
  for (const session of sessions) {
    await env.placementRepo.deleteBySessionId(session.id);
    await env.sessionRepo.delete(session.id);
  }

  // Delete scenario
  const scenario = await env.scenarioRepo.getByProgramId(programId);
  if (scenario) {
    await env.scenarioRepo.delete(scenario.id);
  }

  // Delete program
  await env.programRepo.delete(programId);
}

// Re-export demo types
export type { CreateDemoActivityResult, CreateDemoActivityError };

// =============================================================================
// Activity Management Operations
// =============================================================================

export type RenameActivityError =
  | { type: 'PROGRAM_NOT_FOUND'; message: string }
  | { type: 'INVALID_NAME'; message: string }
  | { type: 'UPDATE_FAILED'; message: string };

/**
 * Rename an activity (program).
 */
export async function renameActivity(
  env: InMemoryEnvironment,
  input: { programId: string; newName: string }
): Promise<Result<void, RenameActivityError>> {
  const { programId, newName } = input;
  const trimmedName = newName.trim();

  if (!trimmedName) {
    return err({ type: 'INVALID_NAME', message: 'Activity name cannot be empty' });
  }

  try {
    const program = await env.programRepo.getById(programId);
    if (!program) {
      return err({ type: 'PROGRAM_NOT_FOUND', message: `Activity ${programId} not found` });
    }

    const updatedProgram = { ...program, name: trimmedName };
    await env.programRepo.update(updatedProgram);
    return ok(undefined);
  } catch (e) {
    return err({
      type: 'UPDATE_FAILED',
      message: e instanceof Error ? e.message : 'Failed to rename activity'
    });
  }
}

export type DeleteActivityError =
  | { type: 'PROGRAM_NOT_FOUND'; message: string }
  | { type: 'DELETE_FAILED'; message: string };

/**
 * Delete an activity and its associated scenario.
 * Note: Pool and students are preserved for potential reuse.
 */
export async function deleteActivity(
  env: InMemoryEnvironment,
  input: { programId: string }
): Promise<Result<void, DeleteActivityError>> {
  const { programId } = input;

  try {
    const program = await env.programRepo.getById(programId);
    if (!program) {
      return err({ type: 'PROGRAM_NOT_FOUND', message: `Activity ${programId} not found` });
    }

    // Delete associated scenario if exists
    const scenario = await env.scenarioRepo.getByProgramId(programId);
    if (scenario) {
      await env.scenarioRepo.delete(scenario.id);
    }

    // Delete the program
    await env.programRepo.delete(programId);

    return ok(undefined);
  } catch (e) {
    return err({
      type: 'DELETE_FAILED',
      message: e instanceof Error ? e.message : 'Failed to delete activity'
    });
  }
}

// =============================================================================
// Inline Activity Creation (Blizzard WP2)
// =============================================================================

export type CreateActivityInlineError =
  | { type: 'EMPTY_NAME'; message: string }
  | { type: 'CREATION_FAILED'; message: string };

export interface CreateActivityInlineResult {
  program: Program;
  pool: Pool;
}

/**
 * Create an activity with just a name — no students, no wizard.
 *
 * Creates a Program linked to an empty Pool. Roster import happens
 * later in Class View.
 *
 * See: project definition.md — WP2 (Inline Activity Creation),
 * Decision 2 (Two-Screen Architecture), Part 6 §6.5
 */
export async function createActivityInline(
  env: InMemoryEnvironment,
  input: { name: string }
): Promise<Result<CreateActivityInlineResult, CreateActivityInlineError>> {
  const name = input.name.trim();
  if (!name) {
    return err({ type: 'EMPTY_NAME', message: 'Activity name cannot be empty' });
  }

  const userId = getCurrentUserId(env);

  try {
    const poolId = env.idGenerator.generateId();
    const pool: Pool = {
      id: poolId,
      name: `${name} Roster`,
      type: 'CLASS' as const,
      memberIds: [],
      status: 'ACTIVE' as const,
      source: 'MANUAL' as const,
      userId
    };
    await env.poolRepo.save(pool);

    const programId = env.idGenerator.generateId();
    const program: Program = {
      id: programId,
      name,
      type: 'CLASS_ACTIVITY' as const,
      timeSpan: { termLabel: new Date().toISOString() },
      poolIds: [pool.id],
      primaryPoolId: pool.id,
      ownerStaffIds: ['owner-1'],
      userId
    };
    await env.programRepo.save(program);

    return ok({ program, pool });
  } catch (e) {
    return err({
      type: 'CREATION_FAILED',
      message: e instanceof Error ? e.message : 'Failed to create activity'
    });
  }
}

// =============================================================================
// Authentication Operations
// =============================================================================

/**
 * Initiate OAuth login flow.
 *
 * Returns error if authService is not configured.
 */
export async function login(env: InMemoryEnvironment): Promise<Result<void, LoginError>> {
  if (!env.authService) {
    return err({ type: 'AUTH_SERVICE_UNAVAILABLE' });
  }
  return loginUseCase({ authService: env.authService });
}

/**
 * Log out the current user.
 *
 * Returns error if authService is not configured.
 */
export async function logout(env: InMemoryEnvironment): Promise<Result<void, LogoutError>> {
  if (!env.authService) {
    return ok(undefined);
  }
  return logoutUseCase({ authService: env.authService });
}

/**
 * Get the currently authenticated user.
 *
 * Returns null if not authenticated or authService is not configured.
 */
export async function getCurrentUser(
  env: InMemoryEnvironment
): Promise<Result<AuthUser | null, never>> {
  if (!env.authService) {
    return ok(null);
  }
  return getCurrentUserUseCase({ authService: env.authService });
}

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated(env: InMemoryEnvironment): boolean {
  if (!env.authService) {
    return false;
  }
  return isAuthenticatedUseCase({ authService: env.authService });
}

/**
 * Subscribe to authentication state changes.
 *
 * @returns Unsubscribe function (no-op if authService is not configured)
 */
export function onAuthStateChange(
  env: InMemoryEnvironment,
  callback: (user: AuthUser | null) => void
): () => void {
  if (!env.authService) {
    callback(null);
    return () => {};
  }
  return onAuthStateChangeUseCase({ authService: env.authService }, callback);
}

// Re-export auth types
export type { LoginError, LogoutError, AuthUser };

// =============================================================================
// Google Sheets Operations
// =============================================================================

import {
  connectGoogleSheet as connectGoogleSheetUseCase,
  type ConnectGoogleSheetInput,
  type ConnectGoogleSheetError
} from '$lib/application/useCases/connectGoogleSheet';
import {
  importFromSheetTab as importFromSheetTabUseCase,
  type ImportFromSheetTabInput,
  type ImportFromSheetTabError
} from '$lib/application/useCases/importFromSheetTab';
import type { SheetConnection } from '$lib/domain/sheetConnection';
import type { RawSheetData } from '$lib/domain/import';

/**
 * Connect to a Google Sheet and fetch its metadata (title, tabs).
 *
 * Requires sheetsService to be configured in the environment.
 */
export async function connectGoogleSheet(
  env: InMemoryEnvironment,
  input: ConnectGoogleSheetInput
): Promise<Result<SheetConnection, ConnectGoogleSheetError>> {
  if (!env.sheetsService) {
    return err({
      type: 'NOT_AUTHENTICATED',
      message: 'Google Sheets is not configured. Please sign in first.'
    });
  }

  return connectGoogleSheetUseCase(
    {
      sheetsService: env.sheetsService,
      clock: env.clock
    },
    input
  );
}

/**
 * Fetch data from a specific tab of a connected Google Sheet.
 *
 * Returns raw sheet data ready for column mapping.
 */
export async function importFromSheetTab(
  env: InMemoryEnvironment,
  input: ImportFromSheetTabInput
): Promise<Result<RawSheetData, ImportFromSheetTabError>> {
  if (!env.sheetsService) {
    return err({
      type: 'NOT_AUTHENTICATED',
      message: 'Google Sheets is not configured. Please sign in first.'
    });
  }

  return importFromSheetTabUseCase(
    {
      sheetsService: env.sheetsService
    },
    input
  );
}

// Re-export Google Sheets types
export type {
  ConnectGoogleSheetInput,
  ConnectGoogleSheetError,
  ImportFromSheetTabInput,
  ImportFromSheetTabError,
  SheetConnection
};

import {
  extractGroupsFromPreferences as extractGroupsFromPreferencesUseCase,
  type ExtractGroupsFromPreferencesInput,
  type ExtractGroupsFromPreferencesResult,
  type ExtractGroupsFromPreferencesError
} from '$lib/application/useCases/extractGroupsFromPreferences';

/**
 * Extract unique group names from preference data.
 *
 * Works with either raw sheet data (with choice column mappings)
 * or with already-imported preferences in a program.
 */
export async function extractGroupsFromPreferences(
  env: InMemoryEnvironment,
  input: ExtractGroupsFromPreferencesInput
): Promise<Result<ExtractGroupsFromPreferencesResult, ExtractGroupsFromPreferencesError>> {
  return extractGroupsFromPreferencesUseCase(
    {
      preferenceRepo: env.preferenceRepo
    },
    input
  );
}

// Re-export extract groups types
export type {
  ExtractGroupsFromPreferencesInput,
  ExtractGroupsFromPreferencesResult,
  ExtractGroupsFromPreferencesError
};

// =============================================================================
// Session Operations
// =============================================================================

import {
  listSessions as listSessionsUseCase,
  type ListSessionsInput
} from '$lib/application/useCases/listSessions';
import {
  getStudentPlacementHistory as getStudentPlacementHistoryUseCase,
  type GetStudentPlacementHistoryInput,
  type StudentPlacementHistoryResult
} from '$lib/application/useCases/getStudentPlacementHistory';
import {
  getActiveSession as getActiveSessionUseCase,
  type GetActiveSessionInput
} from '$lib/application/useCases/getActiveSession';
import {
  endSession as endSessionUseCase,
  type EndSessionInput
} from '$lib/application/useCases/endSession';
import {
  showToClass as showToClassUseCase,
  type ShowToClassInput,
  type ShowToClassError
} from '$lib/application/useCases/showToClass';
import {
  deleteSession as deleteSessionUseCase,
  type DeleteSessionInput,
  type DeleteSessionError
} from '$lib/application/useCases/deleteSession';
import type { Session } from '$lib/domain';

/**
 * List sessions with optional filters.
 * Automatically filters by current user when authenticated.
 */
export async function listSessions(
  env: InMemoryEnvironment,
  input?: Omit<ListSessionsInput, 'userId'>
): Promise<Result<Session[], never>> {
  const userId = getCurrentUserId(env);
  return listSessionsUseCase(
    {
      sessionRepo: env.sessionRepo
    },
    { ...input, userId }
  );
}

/**
 * Get the complete placement history for a student.
 */
export async function getStudentPlacementHistory(
  env: InMemoryEnvironment,
  input: GetStudentPlacementHistoryInput
): Promise<Result<StudentPlacementHistoryResult, never>> {
  return getStudentPlacementHistoryUseCase(
    {
      placementRepo: env.placementRepo,
      sessionRepo: env.sessionRepo
    },
    input
  );
}

/**
 * Get the most recent PUBLISHED session for a program, or null.
 */
export async function getActiveSession(
  env: InMemoryEnvironment,
  input: GetActiveSessionInput
): Promise<Result<Session | null, never>> {
  return getActiveSessionUseCase(
    {
      sessionRepo: env.sessionRepo
    },
    input
  );
}

/**
 * Archive all PUBLISHED sessions for a program.
 * Returns the number of sessions archived.
 */
export async function endSession(
  env: InMemoryEnvironment,
  input: EndSessionInput
): Promise<Result<number, never>> {
  return endSessionUseCase(
    {
      sessionRepo: env.sessionRepo
    },
    input
  );
}

/**
 * Show groups to class — archives existing sessions, creates a PUBLISHED
 * session, and creates Placement records in a single atomic operation.
 */
export async function showToClass(
  env: InMemoryEnvironment,
  input: ShowToClassInput
): Promise<Result<Session, ShowToClassError>> {
  return showToClassUseCase(
    {
      programRepo: env.programRepo,
      sessionRepo: env.sessionRepo,
      scenarioRepo: env.scenarioRepo,
      preferenceRepo: env.preferenceRepo,
      placementRepo: env.placementRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}

/**
 * Delete a session and all its placement records (cascade).
 */
export async function deleteSession(
  env: InMemoryEnvironment,
  input: DeleteSessionInput
): Promise<Result<{ sessionId: string }, DeleteSessionError>> {
  return deleteSessionUseCase(
    {
      sessionRepo: env.sessionRepo,
      placementRepo: env.placementRepo
    },
    input
  );
}

// Re-export session types
export type {
  ListSessionsInput,
  ShowToClassInput,
  ShowToClassError,
  DeleteSessionInput,
  DeleteSessionError,
  StudentPlacementHistoryResult,
  GetActiveSessionInput,
  EndSessionInput
};

// =============================================================================
// Student Pool Management Operations
// =============================================================================

import {
  addStudentToPool as addStudentToPoolUseCase,
  type AddStudentToPoolInput,
  type AddStudentToPoolError,
  type AddStudentToPoolResult
} from '$lib/application/useCases/addStudentToPool';

import {
  removeStudentFromPool as removeStudentFromPoolUseCase,
  type RemoveStudentFromPoolInput,
  type RemoveStudentFromPoolError,
  type RemoveStudentFromPoolResult
} from '$lib/application/useCases/removeStudentFromPool';

import {
  updateStudent as updateStudentUseCase,
  type UpdateStudentInput,
  type UpdateStudentError,
  type UpdateStudentResult
} from '$lib/application/useCases/updateStudent';

/**
 * Add a new student to a pool (roster).
 */
export async function addStudentToPool(
  env: InMemoryEnvironment,
  input: AddStudentToPoolInput
): Promise<Result<AddStudentToPoolResult, AddStudentToPoolError>> {
  return addStudentToPoolUseCase(
    {
      studentRepo: env.studentRepo,
      poolRepo: env.poolRepo,
      idGenerator: env.idGenerator
    },
    input
  );
}

/**
 * Remove a student from a pool (roster).
 */
export async function removeStudentFromPool(
  env: InMemoryEnvironment,
  input: RemoveStudentFromPoolInput
): Promise<Result<RemoveStudentFromPoolResult, RemoveStudentFromPoolError>> {
  return removeStudentFromPoolUseCase(
    {
      poolRepo: env.poolRepo,
      scenarioRepo: env.scenarioRepo
    },
    input
  );
}

/**
 * Update a student's editable fields.
 */
export async function updateStudent(
  env: InMemoryEnvironment,
  input: UpdateStudentInput
): Promise<Result<UpdateStudentResult, UpdateStudentError>> {
  return updateStudentUseCase(
    {
      studentRepo: env.studentRepo
    },
    input
  );
}

// Re-export student pool types
export type {
  AddStudentToPoolInput,
  AddStudentToPoolError,
  AddStudentToPoolResult,
  RemoveStudentFromPoolInput,
  RemoveStudentFromPoolError,
  RemoveStudentFromPoolResult,
  UpdateStudentInput,
  UpdateStudentError,
  UpdateStudentResult
};

// =============================================================================
// Observation Use Cases
// =============================================================================

import {
  createObservation as createObservationUseCase,
  type CreateObservationInput,
  type CreateObservationError
} from '$lib/application/useCases/createObservation';
import {
  listObservationsByProgram as listObservationsByProgramUseCase,
  listObservationsBySession as listObservationsBySessionUseCase,
  listObservationsByGroup as listObservationsByGroupUseCase,
  type ListObservationsByProgramInput,
  type ListObservationsBySessionInput,
  type ListObservationsByGroupInput,
  type ObservationListResult
} from '$lib/application/useCases/listObservations';

/**
 * Create a new observation for a group.
 */
export async function createObservation(
  env: InMemoryEnvironment,
  input: CreateObservationInput
): Promise<Result<import('$lib/domain').Observation, CreateObservationError>> {
  return createObservationUseCase(
    {
      observationRepo: env.observationRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}

/**
 * List all observations for a program.
 */
export async function listObservationsByProgram(
  env: InMemoryEnvironment,
  input: ListObservationsByProgramInput
): Promise<Result<ObservationListResult, never>> {
  return listObservationsByProgramUseCase(
    {
      observationRepo: env.observationRepo
    },
    input
  );
}

/**
 * List all observations for a session.
 */
export async function listObservationsBySession(
  env: InMemoryEnvironment,
  input: ListObservationsBySessionInput
): Promise<Result<ObservationListResult, never>> {
  return listObservationsBySessionUseCase(
    {
      observationRepo: env.observationRepo
    },
    input
  );
}

/**
 * List all observations for a specific group.
 */
export async function listObservationsByGroup(
  env: InMemoryEnvironment,
  input: ListObservationsByGroupInput
): Promise<Result<ObservationListResult, never>> {
  return listObservationsByGroupUseCase(
    {
      observationRepo: env.observationRepo
    },
    input
  );
}

// Re-export observation types
export type {
  CreateObservationInput,
  CreateObservationError,
  ListObservationsByProgramInput,
  ListObservationsBySessionInput,
  ListObservationsByGroupInput,
  ObservationListResult
};

// =============================================================================
// Pairing History Use Cases
// =============================================================================

import {
  getPairingHistory as getPairingHistoryUseCase,
  type GetPairingHistoryInput,
  type PairingHistoryResult
} from '$lib/application/useCases/getPairingHistory';

/**
 * Get the history of how many times two students have been grouped together.
 */
export async function getPairingHistory(
  env: InMemoryEnvironment,
  input: GetPairingHistoryInput
): Promise<Result<PairingHistoryResult, never>> {
  return getPairingHistoryUseCase(
    {
      placementRepo: env.placementRepo,
      sessionRepo: env.sessionRepo
    },
    input
  );
}

// Re-export pairing history types
export type { GetPairingHistoryInput, PairingHistoryResult };

// =============================================================================
// Analytics Dashboard Use Cases
// =============================================================================

import {
  getProgramPairingStats as getProgramPairingStatsUseCase,
  type GetProgramPairingStatsInput,
  type ProgramPairingStatsResult,
  type PairingStat
} from '$lib/application/useCases/getProgramPairingStats';
import {
  getObservationSummary as getObservationSummaryUseCase,
  type GetObservationSummaryInput,
  type ObservationSummaryResult
} from '$lib/application/useCases/getObservationSummary';
import {
  getObservationTrends as getObservationTrendsUseCase,
  type GetObservationTrendsInput,
  type ObservationTrendsResult
} from '$lib/application/useCases/getObservationTrends';
import {
  listStudentStats as listStudentStatsUseCase,
  type ListStudentStatsInput,
  type ListStudentStatsResult
} from '$lib/application/useCases/listStudentStats';

/**
 * Get pairing frequency statistics for all student pairs in a program.
 */
export async function getProgramPairingStats(
  env: InMemoryEnvironment,
  input: GetProgramPairingStatsInput
): Promise<Result<ProgramPairingStatsResult, never>> {
  return getProgramPairingStatsUseCase(
    {
      placementRepo: env.placementRepo,
      sessionRepo: env.sessionRepo,
      studentRepo: env.studentRepo
    },
    input
  );
}

/**
 * Get an aggregated summary of observations for a program.
 */
export async function getObservationSummary(
  env: InMemoryEnvironment,
  input: GetObservationSummaryInput
): Promise<Result<ObservationSummaryResult, never>> {
  return getObservationSummaryUseCase(
    {
      observationRepo: env.observationRepo
    },
    input
  );
}

/**
 * Get per-session sentiment trends for a program's observations.
 */
export async function getObservationTrends(
  env: InMemoryEnvironment,
  input: GetObservationTrendsInput
): Promise<Result<ObservationTrendsResult, never>> {
  return getObservationTrendsUseCase(
    {
      observationRepo: env.observationRepo,
      sessionRepo: env.sessionRepo
    },
    input
  );
}

export type { GetObservationTrendsInput, ObservationTrendsResult };

/**
 * Get aggregated placement statistics for all students in a program.
 */
export async function listStudentStats(
  env: InMemoryEnvironment,
  input: ListStudentStatsInput
): Promise<Result<ListStudentStatsResult, never>> {
  return listStudentStatsUseCase(
    {
      placementRepo: env.placementRepo,
      sessionRepo: env.sessionRepo,
      studentRepo: env.studentRepo,
      poolRepo: env.poolRepo,
      programRepo: env.programRepo
    },
    input
  );
}

// =============================================================================
// Workspace View Business Rules (Pure Use Cases)
// =============================================================================

import {
  normalizeWorkspaceRowLayoutFromConfig as normalizeWorkspaceRowLayoutUseCase,
  type NormalizeWorkspaceRowLayoutInput,
  type NormalizeWorkspaceRowLayoutOutput,
  type WorkspaceRowLayout
} from '$lib/application/useCases/normalize-workspace-row-layout';
import {
  createWorkspaceHistoryEntry as createWorkspaceHistoryEntryUseCase,
  insertWorkspaceHistoryEntry as insertWorkspaceHistoryEntryUseCase,
  selectWorkspaceHistoryEntry as selectWorkspaceHistoryEntryUseCase,
  type CreateWorkspaceHistoryEntryInput,
  type InsertWorkspaceHistoryEntryInput,
  type SelectWorkspaceHistoryEntryInput,
  type SelectWorkspaceHistoryEntryOutput,
  type WorkspaceHistoryEntry,
  type WorkspaceHistoryState
} from '$lib/application/useCases/manage-workspace-history';
import {
  detectWorkspaceEditsSincePublish as detectWorkspaceEditsSincePublishUseCase,
  type DetectWorkspaceEditsSincePublishInput,
  type DetectWorkspaceEditsSincePublishOutput
} from '$lib/application/useCases/detect-workspace-edits-since-publish';
import {
  getWorkspaceGroupsDisplayOrder as getWorkspaceGroupsDisplayOrderUseCase,
  type GetWorkspaceGroupsDisplayOrderInput,
  type GetWorkspaceGroupsDisplayOrderOutput
} from '$lib/application/useCases/get-workspace-groups-display-order';
import {
  prepareWorkspaceExport as prepareWorkspaceExportUseCase,
  type PrepareWorkspaceExportInput,
  type PrepareWorkspaceExportSuccess,
  type PrepareWorkspaceExportError
} from '$lib/application/useCases/prepare-workspace-export';
import {
  importWorkspacePreferences as importWorkspacePreferencesUseCase,
  type ImportWorkspacePreferencesError,
  type ImportWorkspacePreferencesSuccess
} from '$lib/application/useCases/import-workspace-preferences';

/**
 * Normalize, repair, and persist-shape workspace row layout config.
 */
export function normalizeWorkspaceRowLayout(
  input: NormalizeWorkspaceRowLayoutInput
): Result<NormalizeWorkspaceRowLayoutOutput, never> {
  return normalizeWorkspaceRowLayoutUseCase(input);
}

/**
 * Create a workspace history entry snapshot.
 */
export function createWorkspaceHistoryEntry(
  input: CreateWorkspaceHistoryEntryInput
): Result<WorkspaceHistoryEntry, never> {
  return createWorkspaceHistoryEntryUseCase(input);
}

/**
 * Insert a history entry with bounded size.
 */
export function insertWorkspaceHistoryEntry(
  input: InsertWorkspaceHistoryEntryInput
): Result<WorkspaceHistoryState, never> {
  return insertWorkspaceHistoryEntryUseCase(input);
}

/**
 * Move the history cursor and resolve which groups to apply.
 */
export function selectWorkspaceHistoryEntry(
  input: SelectWorkspaceHistoryEntryInput
): Result<SelectWorkspaceHistoryEntryOutput, never> {
  return selectWorkspaceHistoryEntryUseCase(input);
}

/**
 * Detect whether workspace has edits after latest publish.
 */
export function detectWorkspaceEditsSincePublish(
  input: DetectWorkspaceEditsSincePublishInput
): Result<DetectWorkspaceEditsSincePublishOutput, never> {
  return detectWorkspaceEditsSincePublishUseCase(input);
}

/**
 * Return groups in workspace display order (top row, then bottom row).
 */
export function getWorkspaceGroupsDisplayOrder(
  input: GetWorkspaceGroupsDisplayOrderInput
): Result<GetWorkspaceGroupsDisplayOrderOutput, never> {
  return getWorkspaceGroupsDisplayOrderUseCase(input);
}

/**
 * Prepare workspace export payloads (columns TSV + activity schema JSON data).
 */
export function prepareWorkspaceExport(
  _env: InMemoryEnvironment,
  input: PrepareWorkspaceExportInput
): Result<PrepareWorkspaceExportSuccess, PrepareWorkspaceExportError> {
  return prepareWorkspaceExportUseCase(input);
}

export type ImportWorkspacePreferencesInput = {
  programId: string;
  parsedPreferences: ParsedPreference[];
  validStudentIds: string[];
};

export type ImportWorkspacePreferencesResult = {
  importedCount: number;
  skippedCount: number;
  preferences: ImportWorkspacePreferencesSuccess['preferences'];
};

export type ImportWorkspacePreferencesFacadeError =
  | ImportWorkspacePreferencesError
  | { type: 'internal_error'; message: string };

/**
 * Import parsed workspace preferences and persist normalized preference entities.
 */
export async function importWorkspacePreferences(
  env: InMemoryEnvironment,
  input: ImportWorkspacePreferencesInput
): Promise<Result<ImportWorkspacePreferencesResult, ImportWorkspacePreferencesFacadeError>> {
  try {
    const existingPreferences = await env.preferenceRepo.listByProgramId(input.programId);
    const normalized = importWorkspacePreferencesUseCase(
      {
        idGenerator: env.idGenerator
      },
      {
        programId: input.programId,
        parsedPreferences: input.parsedPreferences,
        existingPreferences,
        validStudentIds: input.validStudentIds
      }
    );

    if (normalized.status === 'err') {
      return normalized;
    }

    if (typeof env.preferenceRepo.setForProgram === 'function') {
      await env.preferenceRepo.setForProgram(input.programId, normalized.value.preferences);
    } else {
      for (const preference of normalized.value.preferences) {
        await env.preferenceRepo.save(preference);
      }
    }

    const persistedPreferences = await env.preferenceRepo.listByProgramId(input.programId);

    return ok({
      importedCount: normalized.value.importedCount,
      skippedCount: normalized.value.skippedCount,
      preferences: persistedPreferences
    });
  } catch {
    return err({
      type: 'internal_error',
      message: 'Failed to import workspace preferences.'
    });
  }
}

// Re-export analytics types
export type {
  GetProgramPairingStatsInput,
  ProgramPairingStatsResult,
  PairingStat,
  GetObservationSummaryInput,
  ObservationSummaryResult,
  ListStudentStatsInput,
  ListStudentStatsResult,
  WorkspaceRowLayout,
  NormalizeWorkspaceRowLayoutInput,
  NormalizeWorkspaceRowLayoutOutput,
  WorkspaceHistoryEntry,
  WorkspaceHistoryState,
  CreateWorkspaceHistoryEntryInput,
  InsertWorkspaceHistoryEntryInput,
  SelectWorkspaceHistoryEntryInput,
  SelectWorkspaceHistoryEntryOutput,
  DetectWorkspaceEditsSincePublishInput,
  DetectWorkspaceEditsSincePublishOutput,
  GetWorkspaceGroupsDisplayOrderInput,
  GetWorkspaceGroupsDisplayOrderOutput,
  PrepareWorkspaceExportInput,
  PrepareWorkspaceExportSuccess,
  PrepareWorkspaceExportError
};

// =============================================================================
// Student Identity Use Cases
// =============================================================================

import {
  findMatchingStudents as findMatchingStudentsUseCase,
  matchImportedStudents as matchImportedStudentsUseCase,
  type FindMatchingStudentsInput,
  type MatchCandidate,
  type MatchImportedStudentsInput,
  type MatchImportedStudentsResult
} from '$lib/application/useCases/findMatchingStudents';
import {
  createOrLinkStudent as createOrLinkStudentUseCase,
  batchCreateOrLinkStudents as batchCreateOrLinkStudentsUseCase,
  type CreateOrLinkStudentInput,
  type CreateOrLinkStudentResult,
  type CreateOrLinkStudentError,
  type BatchCreateOrLinkInput,
  type BatchCreateOrLinkResult
} from '$lib/application/useCases/createOrLinkStudent';
import {
  getStudentProfile as getStudentProfileUseCase,
  type GetStudentProfileInput,
  type StudentProfile,
  type GetStudentProfileError
} from '$lib/application/useCases/getStudentProfile';

/**
 * Find matching student identities for an imported student name.
 */
export async function findMatchingStudents(
  env: InMemoryEnvironment,
  input: FindMatchingStudentsInput
): Promise<Result<MatchCandidate[], never>> {
  return findMatchingStudentsUseCase(
    {
      studentIdentityRepo: env.studentIdentityRepo
    },
    input
  );
}

/**
 * Match a batch of imported students against existing identities.
 */
export async function matchImportedStudents(
  env: InMemoryEnvironment,
  input: MatchImportedStudentsInput
): Promise<Result<MatchImportedStudentsResult, never>> {
  return matchImportedStudentsUseCase(
    {
      studentIdentityRepo: env.studentIdentityRepo
    },
    input
  );
}

/**
 * Create a student and either link to existing identity or create new one.
 */
export async function createOrLinkStudent(
  env: InMemoryEnvironment,
  input: CreateOrLinkStudentInput
): Promise<Result<CreateOrLinkStudentResult, CreateOrLinkStudentError>> {
  return createOrLinkStudentUseCase(
    {
      studentRepo: env.studentRepo,
      studentIdentityRepo: env.studentIdentityRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}

/**
 * Process a batch of student link/create decisions.
 */
export async function batchCreateOrLinkStudents(
  env: InMemoryEnvironment,
  input: BatchCreateOrLinkInput
): Promise<Result<BatchCreateOrLinkResult, never>> {
  return batchCreateOrLinkStudentsUseCase(
    {
      studentRepo: env.studentRepo,
      studentIdentityRepo: env.studentIdentityRepo,
      idGenerator: env.idGenerator,
      clock: env.clock
    },
    input
  );
}

/**
 * Get a comprehensive profile for a student identity.
 */
export async function getStudentProfile(
  env: InMemoryEnvironment,
  input: GetStudentProfileInput
): Promise<Result<StudentProfile, GetStudentProfileError>> {
  return getStudentProfileUseCase(
    {
      studentRepo: env.studentRepo,
      studentIdentityRepo: env.studentIdentityRepo,
      placementRepo: env.placementRepo,
      sessionRepo: env.sessionRepo,
      preferenceRepo: env.preferenceRepo,
      observationRepo: env.observationRepo,
      poolRepo: env.poolRepo,
      programRepo: env.programRepo
    },
    input
  );
}

// Re-export student identity types
export type {
  FindMatchingStudentsInput,
  MatchCandidate,
  MatchImportedStudentsInput,
  MatchImportedStudentsResult,
  CreateOrLinkStudentInput,
  CreateOrLinkStudentResult,
  CreateOrLinkStudentError,
  BatchCreateOrLinkInput,
  BatchCreateOrLinkResult,
  GetStudentProfileInput,
  StudentProfile,
  GetStudentProfileError
};
