import type { Program, ProgramTimeSpan, ProgramType } from '$lib/domain';
import type { PoolRepository, ProgramRepository, IdGenerator } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';
import { createProgram as createProgramDomain } from '$lib/domain/program';

export interface CreateProgramInput {
	name: string;
	type: ProgramType;
	timeSpan: ProgramTimeSpan;
	primaryPoolId: string;
	ownerStaffIds?: string[];
	schoolId?: string;
	/** ID of the authenticated user (for multi-tenant data isolation) */
	userId?: string;
}

/**
 * Specific failure modes for Program creation.
 */
export type CreateProgramError =
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'INVALID_TIME_SPAN'; message: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * MVP use case: create a Program referencing an existing Pool.
 */
export async function createProgram(
	deps: {
		poolRepo: PoolRepository;
		programRepo: ProgramRepository;
		idGenerator: IdGenerator;
	},
	input: CreateProgramInput
): Promise<Result<Program, CreateProgramError>> {
	// Basic guardrails first.
	if (!input.name.trim()) {
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message: 'Program name must not be empty'
		});
	}

	// Validate primary pool exists.
	const pool = await deps.poolRepo.getById(input.primaryPoolId);
	if (!pool) {
		return err({
			type: 'POOL_NOT_FOUND',
			poolId: input.primaryPoolId
		});
	}

	// Validate/construct Program via domain factory.
	let program: Program;
	try {
		program = createProgramDomain({
			id: deps.idGenerator.generateId(),
			name: input.name,
			type: input.type,
			timeSpan: input.timeSpan,
			poolIds: [input.primaryPoolId],
			primaryPoolId: input.primaryPoolId,
			schoolId: input.schoolId,
			ownerStaffIds: input.ownerStaffIds,
			userId: input.userId
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown domain validation error';
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message
		});
	}

	try {
		await deps.programRepo.save(program);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	return ok(program);
}
