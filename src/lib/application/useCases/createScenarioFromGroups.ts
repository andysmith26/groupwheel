import type { Scenario, Group } from '$lib/domain';
import { createScenario } from '$lib/domain/scenario';
import type {
	ProgramRepository,
	PoolRepository,
	ScenarioRepository,
	IdGenerator,
	Clock
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

/**
 * Input for creating a Scenario from precomputed groups.
 */
export interface CreateScenarioFromGroupsInput {
	programId: string;
	groups: Group[];
	createdByStaffId?: string;
	algorithmConfig?: unknown;
	replaceExisting?: boolean;
}

/**
 * Specific failure modes for Scenario creation.
 */
export type CreateScenarioFromGroupsError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'POOL_HAS_NO_MEMBERS'; poolId: string }
	| { type: 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM'; programId: string; scenarioId: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

function sanitizeAlgorithmConfig(config?: unknown): unknown {
	return config ? JSON.parse(JSON.stringify(config)) : undefined;
}

/**
 * Persist a Scenario from provided groups.
 */
export async function createScenarioFromGroups(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		scenarioRepo: ScenarioRepository;
		idGenerator: IdGenerator;
		clock: Clock;
	},
	input: CreateScenarioFromGroupsInput
): Promise<Result<Scenario, CreateScenarioFromGroupsError>> {
	const program = await deps.programRepo.getById(input.programId);
	if (!program) {
		return err({
			type: 'PROGRAM_NOT_FOUND',
			programId: input.programId
		});
	}

	const primaryPoolId = program.primaryPoolId ?? program.poolIds[0];
	if (!primaryPoolId) {
		return err({
			type: 'POOL_NOT_FOUND',
			poolId: '(none configured on Program)'
		});
	}

	const existingScenario = await deps.scenarioRepo.getByProgramId(program.id);
	if (existingScenario && !input.replaceExisting) {
		return err({
			type: 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM',
			programId: program.id,
			scenarioId: existingScenario.id
		});
	}

	const pool = await deps.poolRepo.getById(primaryPoolId);
	if (!pool) {
		return err({
			type: 'POOL_NOT_FOUND',
			poolId: primaryPoolId
		});
	}
	if (!pool.memberIds.length) {
		return err({
			type: 'POOL_HAS_NO_MEMBERS',
			poolId: primaryPoolId
		});
	}

	const sanitizedConfig = sanitizeAlgorithmConfig(input.algorithmConfig);

	let scenario: Scenario;
	try {
		scenario = createScenario({
			id: existingScenario?.id ?? deps.idGenerator.generateId(),
			programId: program.id,
			groups: input.groups.map((group) => ({
				id: group.id,
				name: group.name,
				capacity: group.capacity,
				memberIds: group.memberIds
			})),
			participantIds: pool.memberIds,
			createdAt: deps.clock.now(),
			createdByStaffId: input.createdByStaffId,
			algorithmConfig: sanitizedConfig
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown domain validation error';
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message
		});
	}

	try {
		if (existingScenario) {
			await deps.scenarioRepo.update(scenario);
		} else {
			await deps.scenarioRepo.save(scenario);
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	return ok(scenario);
}
