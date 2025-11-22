import type { InMemoryEnvironment } from '$lib/infrastructure/inMemoryEnvironment';
import type {
	CreateProgramInput,
	CreateProgramError
} from '$lib/application/useCases/createProgram';
import { createProgramUseCase } from '$lib/application/useCases/createProgram';
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
import type {
        GetProgramError,
        ProgramWithPools
} from '$lib/application/useCases/getProgram';
import { getProgram } from '$lib/application/useCases/getProgram';
import type {
        GetStudentViewInput,
        GetStudentViewError,
        StudentViewData
} from '$lib/application/useCases/getStudentView';
import { getStudentView } from '$lib/application/useCases/getStudentView';
import type { Pool } from '$lib/domain';
import type { ImportPoolFromCsvInput, ImportPoolFromCsvError } from '$lib/application/useCases/importPoolFromCsv';
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
import type { RosterData } from '$lib/services/rosterImport';
import type { Result } from '$lib/types/result';

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

export async function createProgram(
	env: InMemoryEnvironment,
	input: CreateProgramInput
): Promise<Result<import('$lib/domain').Program, CreateProgramError>> {
	return createProgramUseCase(
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

export async function computeAnalytics(
	env: InMemoryEnvironment,
	input: ComputeScenarioAnalyticsInput
): Promise<
	Result<import('$lib/domain').ScenarioSatisfaction, ComputeScenarioAnalyticsError>
> {
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

export async function listPrograms(
        env: InMemoryEnvironment
): Promise<Result<ProgramWithPrimaryPool[], ListProgramsError>> {
        return listProgramsUseCase(
                {
                        programRepo: env.programRepo,
                        poolRepo: env.poolRepo
                }
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
