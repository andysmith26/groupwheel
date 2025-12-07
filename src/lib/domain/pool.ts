export type PoolType = 'SCHOOL' | 'GRADE' | 'CLASS' | 'TRIP' | 'CUSTOM';

export type PoolStatus = 'ACTIVE' | 'ARCHIVED';

export type PoolSource = 'IMPORT' | 'MANUAL';

export interface PoolTimeSpan {
	start: Date;
	end?: Date;
}

/**
 * MVP Pool model — matches docs/domain_model.md.
 */
export interface Pool {
	id: string;
	schoolId?: string;
	name: string;
	type: PoolType;
	memberIds: string[];
	primaryStaffOwnerId?: string;
	ownerStaffIds?: string[];
	timeSpan?: PoolTimeSpan;
	status: PoolStatus;
	source?: PoolSource;
	parentPoolId?: string;
}

/**
 * Minimal factory to centralize defaults and basic invariants.
 * Throws on obviously invalid input (empty name), since domain is
 * used from higher-level use cases that will translate errors.
 */
export function createPool(params: {
	id: string;
	name: string;
	type: PoolType;
	memberIds: string[];
	schoolId?: string;
	primaryStaffOwnerId?: string;
	ownerStaffIds?: string[];
	timeSpan?: PoolTimeSpan;
	status?: PoolStatus;
	source?: PoolSource;
	parentPoolId?: string;
}): Pool {
	const name = params.name.trim();
	if (!name) {
		throw new Error('Pool name must not be empty');
	}

	const uniqueMemberIds = Array.from(new Set(params.memberIds));

	return {
		id: params.id,
		name,
		type: params.type,
		memberIds: uniqueMemberIds,
		schoolId: params.schoolId,
		primaryStaffOwnerId: params.primaryStaffOwnerId,
		ownerStaffIds: params.ownerStaffIds,
		timeSpan: params.timeSpan,
		status: params.status ?? 'ACTIVE',
		source: params.source,
		parentPoolId: params.parentPoolId
	};
}
