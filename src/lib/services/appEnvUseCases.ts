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
import type { Pool } from '$lib/domain';
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
	ListProgramsError,
	ProgramWithPrimaryPool
} from '$lib/application/useCases/listPrograms';
import { listPrograms as listProgramsUseCase } from '$lib/application/useCases/listPrograms';
import {
	createGroupingActivity as createGroupingActivityUseCase,
	type CreateGroupingActivityInput,
	type CreateGroupingActivityResult,
	type CreateGroupingActivityError
} from '$lib/application/useCases/createGroupingActivity';
import type { RosterData } from '$lib/services/rosterImport';
import type { Result } from '$lib/types/result';
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

export async function createGroupingActivity(
	env: InMemoryEnvironment,
	input: CreateGroupingActivityInput
): Promise<Result<CreateGroupingActivityResult, CreateGroupingActivityError>> {
	return createGroupingActivityUseCase(
		{
			poolRepo: env.poolRepo,
			studentRepo: env.studentRepo,
			programRepo: env.programRepo,
			preferenceRepo: env.preferenceRepo,
			idGenerator: env.idGenerator,
			clock: env.clock
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
	ParsedStudent,
	ParsedPreference
} from '$lib/application/useCases/createGroupingActivity';

export async function listPrograms(
	env: InMemoryEnvironment
): Promise<Result<ProgramWithPrimaryPool[], ListProgramsError>> {
	return listProgramsUseCase({
		programRepo: env.programRepo,
		poolRepo: env.poolRepo
	});
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
 */
export async function listActivities(
	env: InMemoryEnvironment
): Promise<
	Result<ActivityDisplay[], import('$lib/application/useCases/listActivities').ListActivitiesError>
> {
	return listActivitiesUseCase({
		programRepo: env.programRepo,
		poolRepo: env.poolRepo,
		scenarioRepo: env.scenarioRepo
	});
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
			scenarioRepo: env.scenarioRepo
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
