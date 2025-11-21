/**
 * MVP Group model — matches docs/domain_model.md.
 */
export interface Group {
	id: string;
	name: string;
	capacity: number | null;
	memberIds: string[];
	leaderStaffId?: string;
}

/**
 * Simple factory to normalize inputs and enforce basics.
 */
export function createGroup(params: {
	id: string;
	name: string;
	capacity?: number | null;
	memberIds?: string[];
	leaderStaffId?: string;
}): Group {
	const name = params.name.trim();
	if (!name) {
		throw new Error('Group name must not be empty');
	}

	const capacity =
		typeof params.capacity === 'number' && Number.isFinite(params.capacity)
			? params.capacity
			: null;

	const memberIds = params.memberIds ? Array.from(new Set(params.memberIds)) : [];

	return {
		id: params.id,
		name,
		capacity,
		memberIds,
		leaderStaffId: params.leaderStaffId
	};
}