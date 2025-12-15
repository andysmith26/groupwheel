/**
 * Get complete activity data for the workspace view.
 *
 * This use case loads all data needed to display and edit a grouping activity:
 * - Program details
 * - Associated pool and students
 * - Student preferences
 * - Current scenario (if exists)
 */

import type { Program, Pool, Student, Preference, Scenario } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { PreferenceRepository } from '$lib/application/ports/PreferenceRepository';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface GetActivityDataInput {
	programId: string;
}

export interface ActivityData {
	program: Program;
	pool: Pool | null;
	students: Student[];
	preferences: Preference[];
	scenario: Scenario | null;
}

export type GetActivityDataError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'LOAD_FAILED'; message: string };

export async function getActivityData(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
		preferenceRepo: PreferenceRepository;
		scenarioRepo: ScenarioRepository;
	},
	input: GetActivityDataInput
): Promise<Result<ActivityData, GetActivityDataError>> {
	try {
		// Load program
		const program = await deps.programRepo.getById(input.programId);
		if (!program) {
			return err({ type: 'PROGRAM_NOT_FOUND', programId: input.programId });
		}

		// Load pool
		const poolId = program.primaryPoolId ?? program.poolIds?.[0];
		let pool: Pool | null = null;
		let students: Student[] = [];

		if (poolId) {
			pool = await deps.poolRepo.getById(poolId);
			if (pool) {
				students = await deps.studentRepo.getByIds(pool.memberIds);
			}
		}

		// Load preferences
		const preferences = await deps.preferenceRepo.listByProgramId(input.programId);

		// Load scenario (may not exist)
		const scenario = await deps.scenarioRepo.getByProgramId(input.programId);

		return ok({
			program,
			pool,
			students,
			preferences,
			scenario
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error loading activity data';
		return err({ type: 'LOAD_FAILED', message });
	}
}
