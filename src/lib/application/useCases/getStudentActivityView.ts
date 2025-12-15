/**
 * Get activity data for student view.
 *
 * This use case loads the data needed for the read-only student view:
 * - Program details
 * - Current scenario with groups
 * - Students for display names
 */

import type { Program, Scenario, Student } from '$lib/domain';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface GetStudentActivityViewInput {
	programId: string;
}

export interface StudentActivityViewData {
	program: Program;
	scenario: Scenario;
	students: Student[];
}

export type GetStudentActivityViewError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'SCENARIO_NOT_FOUND'; programId: string }
	| { type: 'LOAD_FAILED'; message: string };

export async function getStudentActivityView(
	deps: {
		programRepo: ProgramRepository;
		poolRepo: PoolRepository;
		scenarioRepo: ScenarioRepository;
		studentRepo: StudentRepository;
	},
	input: GetStudentActivityViewInput
): Promise<Result<StudentActivityViewData, GetStudentActivityViewError>> {
	try {
		// Load program
		const program = await deps.programRepo.getById(input.programId);
		if (!program) {
			return err({ type: 'PROGRAM_NOT_FOUND', programId: input.programId });
		}

		// Load scenario
		const scenario = await deps.scenarioRepo.getByProgramId(input.programId);
		if (!scenario) {
			return err({ type: 'SCENARIO_NOT_FOUND', programId: input.programId });
		}

		// Load students from pool
		const poolId = program.primaryPoolId ?? program.poolIds?.[0];
		let students: Student[] = [];

		if (poolId) {
			const pool = await deps.poolRepo.getById(poolId);
			if (pool) {
				students = await deps.studentRepo.getByIds(pool.memberIds);
			}
		}

		return ok({
			program,
			scenario,
			students
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error loading student view';
		return err({ type: 'LOAD_FAILED', message });
	}
}
