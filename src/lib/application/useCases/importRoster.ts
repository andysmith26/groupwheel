import type { Pool, PoolType } from '$lib/domain';
import type {
	PoolRepository,
	StudentRepository,
	StaffRepository,
	IdGenerator
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, isErr, ok } from '$lib/types/result';
import { parseRosterFromPaste } from '$lib/services/rosterImport';
import type {
	CreatePoolFromRosterDataInput,
	CreatePoolFromRosterDataError
} from './createPoolFromRosterData';
import { createPoolFromRosterData } from './createPoolFromRosterData';

export interface ImportRosterInput extends Omit<
	CreatePoolFromRosterDataInput,
	'rosterData' | 'poolType' | 'poolName'
> {
	pastedText: string;
	poolName: string;
	poolType: PoolType;
}

export type ImportRosterError =
	| { type: 'PARSE_ERROR'; message: string }
	| CreatePoolFromRosterDataError;

export async function importRoster(
	deps: {
		poolRepo: PoolRepository;
		studentRepo: StudentRepository;
		staffRepo: StaffRepository;
		idGenerator: IdGenerator;
	},
	input: ImportRosterInput
): Promise<Result<Pool, ImportRosterError>> {
	const { pastedText, poolName, poolType, ownerStaffId, schoolId, source } = input;

	if (!pastedText.trim()) {
		return err({ type: 'PARSE_ERROR', message: 'Roster text is empty' });
	}

	let rosterData;
	try {
		rosterData = parseRosterFromPaste(pastedText);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unable to parse roster text';
		return err({ type: 'PARSE_ERROR', message });
	}

	const poolResult = await createPoolFromRosterData(
		{
			poolRepo: deps.poolRepo,
			studentRepo: deps.studentRepo,
			staffRepo: deps.staffRepo,
			idGenerator: deps.idGenerator
		},
		{
			rosterData,
			poolName,
			poolType,
			ownerStaffId,
			schoolId,
			source
		}
	);

	if (isErr(poolResult)) {
		return err(poolResult.error);
	}

	return ok(poolResult.value);
}
