import type { PoolType, Pool } from '$lib/domain';
import type { PoolRepository, StudentRepository, StaffRepository, IdGenerator } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

export interface ImportPoolFromCsvInput {
	csvText: string;
	poolName: string;
	poolType: PoolType;
	ownerStaffId: string;
	schoolId?: string;
	source?: 'IMPORT' | 'MANUAL';
}

/**
 * Fine-grained error modes for the import flow.
 */
export type ImportPoolFromCsvError =
	| { type: 'INVALID_CSV_FORMAT'; message: string }
	| { type: 'MISSING_REQUIRED_FIELDS'; missingFields: string[] }
	| { type: 'STAFF_NOT_FOUND'; staffId: string }
	| { type: 'NO_STUDENTS_PARSED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * MVP use case: Import a Pool from CSV.
 *
 * Responsibilities (from docs/use_cases.md):
 * - Validate & parse CSV.
 * - Resolve/construct Students.
 * - Create a Pool with memberIds set to the resulting Student IDs.
 * - Set Pool status to ACTIVE and primaryStaffOwnerId to uploader.
 *
 * Implementation is intentionally deferred; this stub lets us wire UI and tests first.
 */
export async function importPoolFromCsv(
	deps: {
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
		staffRepo: StaffRepository;
		idGenerator: IdGenerator;
	},
	input: ImportPoolFromCsvInput
): Promise<Result<Pool, ImportPoolFromCsvError>> {
	if (!input.csvText.trim()) {
		return err({
			type: 'INVALID_CSV_FORMAT',
			message: 'CSV text is empty'
		});
	}

	// TODO: implement parsing + Pool/Student creation.
	// For now, return a clear "not implemented" error so callers can handle it.
	return err({
		type: 'INTERNAL_ERROR',
		message: 'importPoolFromCsv is not implemented yet'
	});
}