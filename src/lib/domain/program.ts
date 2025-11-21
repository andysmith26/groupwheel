export type ProgramType = 'CLUBS' | 'ADVISORY' | 'CABINS' | 'CLASS_ACTIVITY' | 'OTHER';

export type ProgramTimeSpan =
	| {
			start: Date;
			end: Date;
	  }
	| {
			termLabel: string;
	  };

/**
 * MVP Program model — matches docs/domain_model.md.
 */
export interface Program {
	id: string;
	schoolId?: string;
	name: string;
	type: ProgramType;
	timeSpan: ProgramTimeSpan;
	poolIds: string[];
	primaryPoolId?: string;
	ownerStaffIds?: string[];
}

/**
 * Factory to centralize minimal invariants.
 * Throws on invalid inputs; use cases will capture and map to Result error variants.
 */
export function createProgram(params: {
	id: string;
	name: string;
	type: ProgramType;
	timeSpan: ProgramTimeSpan;
	poolIds: string[];
	schoolId?: string;
	primaryPoolId?: string;
	ownerStaffIds?: string[];
}): Program {
	const name = params.name.trim();
	if (!name) {
		throw new Error('Program name must not be empty');
	}

	if (!params.poolIds.length) {
		throw new Error('Program must reference at least one pool (poolIds non-empty)');
	}

	if (params.primaryPoolId && !params.poolIds.includes(params.primaryPoolId)) {
		throw new Error('primaryPoolId must be included in poolIds');
	}

	return {
		id: params.id,
		name,
		type: params.type,
		timeSpan: params.timeSpan,
		poolIds: [...params.poolIds],
		primaryPoolId: params.primaryPoolId,
		schoolId: params.schoolId,
		ownerStaffIds: params.ownerStaffIds
	};
}