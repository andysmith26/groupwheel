/**
 * quickStartActivity use case.
 *
 * Creates a grouping activity from just two numbers: student count and group size.
 * Generates placeholder students ("Student 1", "Student 2", ...) and a program
 * with the appropriate number of groups. No scenario is generated — the teacher
 * uses "Generate & Show" from the activity detail page.
 *
 * This removes the biggest onboarding barrier for the math teacher persona:
 * no roster preparation required.
 *
 * @module application/useCases/quickStartActivity
 */

import type {
	PoolRepository,
	StudentRepository,
	ProgramRepository,
	IdGenerator
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input Types
// =============================================================================

export interface QuickStartActivityInput {
	/** Number of students (2–200) */
	studentCount: number;
	/** Target students per group (2–20) */
	groupSize: number;
	/** Optional activity name — default: "My Activity" */
	activityName?: string;
	/** Owner staff ID */
	staffId: string;
}

// =============================================================================
// Output Types
// =============================================================================

export interface QuickStartActivityResult {
	programId: string;
	poolId: string;
	studentCount: number;
	groupCount: number;
}

// =============================================================================
// Error Types
// =============================================================================

export type QuickStartActivityError =
	| { type: 'INVALID_STUDENT_COUNT'; message: string }
	| { type: 'INVALID_GROUP_SIZE'; message: string }
	| { type: 'PERSISTENCE_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface QuickStartActivityDeps {
	idGenerator: IdGenerator;
	studentRepository: StudentRepository;
	poolRepository: PoolRepository;
	programRepository: ProgramRepository;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function quickStartActivity(
	deps: QuickStartActivityDeps,
	input: QuickStartActivityInput
): Promise<Result<QuickStartActivityResult, QuickStartActivityError>> {
	// Validate inputs
	if (input.studentCount < 2 || input.studentCount > 200) {
		return err({
			type: 'INVALID_STUDENT_COUNT',
			message: 'Student count must be between 2 and 200'
		});
	}
	if (input.groupSize < 2 || input.groupSize > 20) {
		return err({
			type: 'INVALID_GROUP_SIZE',
			message: 'Group size must be between 2 and 20'
		});
	}
	if (input.groupSize > input.studentCount) {
		return err({
			type: 'INVALID_GROUP_SIZE',
			message: 'Group size cannot exceed student count'
		});
	}

	try {
		// 1. Create pool
		const poolId = deps.idGenerator.generateId();

		// 2. Generate placeholder students
		const students = Array.from({ length: input.studentCount }, (_, i) => {
			const id = deps.idGenerator.generateId();
			return {
				id,
				firstName: `Student`,
				lastName: `${i + 1}`
			};
		});

		// 3. Save students
		await deps.studentRepository.saveMany(students);

		// 4. Create and save pool
		const pool = {
			id: poolId,
			name: `${input.activityName ?? 'My Activity'} Roster`,
			type: 'CLASS' as const,
			memberIds: students.map((s) => s.id),
			status: 'ACTIVE' as const,
			primaryStaffOwnerId: input.staffId,
			source: 'MANUAL' as const
		};
		await deps.poolRepository.save(pool);

		// 5. Compute group count and create program
		const groupCount = Math.ceil(input.studentCount / input.groupSize);
		const programId = deps.idGenerator.generateId();
		const program = {
			id: programId,
			name: input.activityName ?? 'My Activity',
			type: 'CLASS_ACTIVITY' as const,
			timeSpan: { termLabel: new Date().toISOString() },
			poolIds: [poolId],
			primaryPoolId: poolId,
			ownerStaffIds: [input.staffId]
		};
		await deps.programRepository.save(program);

		return ok({
			programId,
			poolId,
			studentCount: input.studentCount,
			groupCount
		});
	} catch (e) {
		return err({
			type: 'PERSISTENCE_ERROR',
			message: e instanceof Error ? e.message : 'Failed to create quick start activity'
		});
	}
}
