import type { Pool, PoolType, Student } from '$lib/domain';
import { createPool } from '$lib/domain/pool';
import type {
	PoolRepository,
	StudentRepository,
	StaffRepository,
	IdGenerator
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';
import type { RosterData } from '$lib/services/rosterImport';

/**
 * Input needed to construct a Pool from an already parsed roster.
 */
export interface CreatePoolFromRosterDataInput {
	rosterData: RosterData;
	poolName: string;
	poolType: PoolType;
	ownerStaffId: string;
	schoolId?: string;
	source?: 'IMPORT' | 'MANUAL';
}

/**
 * Error modes for creating a Pool from RosterData.
 */
export type CreatePoolFromRosterDataError =
	| { type: 'OWNER_STAFF_NOT_FOUND'; staffId: string }
	| { type: 'NO_STUDENTS_IN_ROSTER'; message: string }
	| { type: 'DOMAIN_VALIDATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * Use case: given parsed roster data, create Students and a Pool in the repositories.
 *
 * This intentionally does not try to handle CSV/Sheets parsing itself — that responsibility
 * belongs to higher-level import flows, which can reuse your existing parsing utilities.
 */
export async function createPoolFromRosterData(
	deps: {
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
		staffRepo: StaffRepository;
		idGenerator: IdGenerator;
	},
	input: CreatePoolFromRosterDataInput
): Promise<Result<Pool, CreatePoolFromRosterDataError>> {
	const { rosterData, poolName, poolType, ownerStaffId, schoolId, source } = input;

	const trimmedName = poolName.trim();
	if (!trimmedName) {
		return err({
			type: 'DOMAIN_VALIDATION_FAILED',
			message: 'Pool name must not be empty'
		});
	}

	// Ensure there is at least one student in the roster.
	if (!rosterData.studentOrder.length) {
		return err({
			type: 'NO_STUDENTS_IN_ROSTER',
			message: 'Parsed roster contains no students'
		});
	}

	// Verify owner staff exists (or, for MVP, optionally allow a dummy owner).
	const owner = await deps.staffRepo.getById(ownerStaffId);
	if (!owner) {
		return err({
			type: 'OWNER_STAFF_NOT_FOUND',
			staffId: ownerStaffId
		});
	}

	// Convert rosterData.studentsById into domain Students.
	const students: Student[] = rosterData.studentOrder
		.map((id) => rosterData.studentsById[id])
		.filter((s): s is Student => !!s);

	try {
		// Persist students.
		await deps.studentRepo.saveMany(students);

		// Create Pool with memberIds = ordered list of student IDs.
		const poolId = deps.idGenerator.generateId();
		const pool = createPool({
			id: poolId,
			name: trimmedName,
			type: poolType,
			memberIds: rosterData.studentOrder,
			schoolId,
			primaryStaffOwnerId: ownerStaffId,
			status: 'ACTIVE',
			source: source ?? 'IMPORT'
		});

		await deps.poolRepo.save(pool);

		return ok(pool);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error creating Pool from roster';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}
}
