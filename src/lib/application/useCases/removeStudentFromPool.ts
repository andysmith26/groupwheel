/**
 * Remove a student from a pool (roster).
 *
 * Removes the student's ID from the pool's memberIds. The student record
 * itself is not deleted (may be used in other pools or for history).
 *
 * If the student is currently assigned to a group in an active scenario,
 * they will also be removed from that group.
 */

import type { Pool, Scenario } from '$lib/domain';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ScenarioRepository } from '$lib/application/ports/ScenarioRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface RemoveStudentFromPoolInput {
	poolId: string;
	studentId: string;
	/** Program ID to check for active scenarios */
	programId?: string;
}

export type RemoveStudentFromPoolError =
	| { type: 'POOL_NOT_FOUND'; poolId: string }
	| { type: 'STUDENT_NOT_IN_POOL'; studentId: string };

export interface RemoveStudentFromPoolResult {
	pool: Pool;
	/** The scenario that was updated (if student was in a group) */
	updatedScenario?: Scenario;
	/** True if the student was removed from a group */
	removedFromGroup: boolean;
}

export async function removeStudentFromPool(
	deps: {
		poolRepo: PoolRepository;
		scenarioRepo: ScenarioRepository;
	},
	input: RemoveStudentFromPoolInput
): Promise<Result<RemoveStudentFromPoolResult, RemoveStudentFromPoolError>> {
	// Load the pool
	const pool = await deps.poolRepo.getById(input.poolId);
	if (!pool) {
		return err({ type: 'POOL_NOT_FOUND', poolId: input.poolId });
	}

	// Check if student is in pool
	if (!pool.memberIds.includes(input.studentId)) {
		return err({ type: 'STUDENT_NOT_IN_POOL', studentId: input.studentId });
	}

	// Remove student from pool
	const updatedPool: Pool = {
		...pool,
		memberIds: pool.memberIds.filter((id) => id !== input.studentId)
	};
	await deps.poolRepo.update(updatedPool);

	// If program ID provided, also remove from any active scenario groups
	let updatedScenario: Scenario | undefined;
	let removedFromGroup = false;

	if (input.programId) {
		const scenario = await deps.scenarioRepo.getByProgramId(input.programId);
		if (scenario) {
			// Check if student is in any group
			const groupWithStudent = scenario.groups.find((g) =>
				g.memberIds.includes(input.studentId)
			);

			if (groupWithStudent) {
				// Remove student from the group
				updatedScenario = {
					...scenario,
					groups: scenario.groups.map((g) => {
						if (g.id === groupWithStudent.id) {
							return {
								...g,
								memberIds: g.memberIds.filter((id) => id !== input.studentId)
							};
						}
						return g;
					}),
					// Also update participant snapshot
					participantSnapshot: scenario.participantSnapshot.filter(
						(id) => id !== input.studentId
					)
				};
				await deps.scenarioRepo.update(updatedScenario);
				removedFromGroup = true;
			}
		}
	}

	return ok({
		pool: updatedPool,
		updatedScenario,
		removedFromGroup
	});
}
