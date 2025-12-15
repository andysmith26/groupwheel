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
	createGroupTemplate as createGroupTemplateFactory,
	updateGroupTemplate as updateGroupTemplateFactory,
	type GroupTemplate,
	type CreateGroupTemplateInput
} from '$lib/domain/groupTemplate';
import { ok, err } from '$lib/types/result';

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

export type CreateGroupTemplateError = { type: 'VALIDATION_ERROR'; message: string };

/**
 * Create a new group template.
 */
export async function createGroupTemplate(
	env: InMemoryEnvironment,
	input: {
		name: string;
		description?: string;
		groups: Array<{ name: string; capacity?: number | null }>;
		ownerStaffId?: string;
	}
): Promise<Result<GroupTemplate, CreateGroupTemplateError>> {
	try {
		const templateInput: CreateGroupTemplateInput = {
			id: env.idGenerator.generateId(),
			ownerStaffId: input.ownerStaffId ?? 'owner-1',
			name: input.name,
			description: input.description,
			groups: input.groups.map((g) => ({
				id: env.idGenerator.generateId(),
				name: g.name,
				capacity: g.capacity ?? null
			}))
		};

		const template = createGroupTemplateFactory(templateInput);
		await env.groupTemplateRepo.save(template);
		return ok(template);
	} catch (e) {
		return err({
			type: 'VALIDATION_ERROR',
			message: e instanceof Error ? e.message : 'Unknown error'
		});
	}
}

/**
 * List all group templates for the current user.
 */
export async function listGroupTemplates(
	env: InMemoryEnvironment,
	ownerStaffId?: string
): Promise<GroupTemplate[]> {
	if (ownerStaffId) {
		return env.groupTemplateRepo.listByOwnerId(ownerStaffId);
	}
	return env.groupTemplateRepo.listAll();
}

/**
 * Get a group template by ID.
 */
export async function getGroupTemplate(
	env: InMemoryEnvironment,
	templateId: string
): Promise<GroupTemplate | null> {
	return env.groupTemplateRepo.getById(templateId);
}

export type UpdateGroupTemplateError =
	| { type: 'NOT_FOUND' }
	| { type: 'VALIDATION_ERROR'; message: string };

/**
 * Update an existing group template.
 */
export async function updateGroupTemplate(
	env: InMemoryEnvironment,
	templateId: string,
	updates: {
		name?: string;
		description?: string;
		groups?: Array<{ id?: string; name: string; capacity?: number | null }>;
	}
): Promise<Result<GroupTemplate, UpdateGroupTemplateError>> {
	const existing = await env.groupTemplateRepo.getById(templateId);
	if (!existing) {
		return err({ type: 'NOT_FOUND' });
	}

	try {
		// If groups are being updated, ensure each has an ID
		const updatedGroups = updates.groups?.map((g) => ({
			id: g.id ?? env.idGenerator.generateId(),
			name: g.name,
			capacity: g.capacity ?? null
		}));

		const updated = updateGroupTemplateFactory(existing, {
			name: updates.name,
			description: updates.description,
			groups: updatedGroups
		});

		await env.groupTemplateRepo.update(updated);
		return ok(updated);
	} catch (e) {
		return err({
			type: 'VALIDATION_ERROR',
			message: e instanceof Error ? e.message : 'Unknown error'
		});
	}
}

/**
 * Delete a group template.
 */
export async function deleteGroupTemplate(
	env: InMemoryEnvironment,
	templateId: string
): Promise<void> {
	await env.groupTemplateRepo.delete(templateId);
}
