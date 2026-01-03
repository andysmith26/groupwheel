import type { Session, Placement, StudentPreference } from '$lib/domain';
import { createPlacement } from '$lib/domain/placement';
import { extractStudentPreference } from '$lib/domain/preference';
import type {
	SessionRepository,
	ScenarioRepository,
	PreferenceRepository,
	PlacementRepository,
	IdGenerator,
	Clock
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { err, ok } from '$lib/types/result';

/**
 * Input for publishing a Session.
 */
export interface PublishSessionInput {
	sessionId: string;
	scenarioId: string;
	publishedByStaffId?: string;
}

/**
 * Specific failure modes for Session publication.
 */
export type PublishSessionError =
	| { type: 'SESSION_NOT_FOUND'; sessionId: string }
	| { type: 'SCENARIO_NOT_FOUND'; scenarioId: string }
	| { type: 'SESSION_ALREADY_PUBLISHED'; sessionId: string }
	| { type: 'SESSION_NOT_IN_DRAFT'; sessionId: string; currentStatus: string }
	| { type: 'PLACEMENT_CREATION_FAILED'; message: string }
	| { type: 'INTERNAL_ERROR'; message: string };

/**
 * Calculate the preference rank for a student's group assignment.
 * Returns the 1-indexed position in their preference list, or null if unranked.
 */
function calculatePreferenceRank(
	studentId: string,
	groupId: string,
	groupName: string,
	preferenceMap: Map<string, StudentPreference>
): { rank: number | null; snapshot: string[] | undefined } {
	const pref = preferenceMap.get(studentId);
	if (!pref) {
		return { rank: null, snapshot: undefined };
	}

	const likeGroupIds = pref.likeGroupIds;
	if (!likeGroupIds || likeGroupIds.length === 0) {
		return { rank: null, snapshot: undefined };
	}

	// Match by ID first
	let index = likeGroupIds.indexOf(groupId);

	// If not found by ID, try matching by name (case-insensitive)
	if (index === -1) {
		const lowerGroupName = groupName.toLowerCase();
		index = likeGroupIds.findIndex((id) => id.toLowerCase() === lowerGroupName);
	}

	return {
		rank: index >= 0 ? index + 1 : null,
		snapshot: [...likeGroupIds]
	};
}

/**
 * Publish a Session, creating immutable Placement records for all group assignments.
 *
 * This transitions the session from DRAFT to PUBLISHED status and captures
 * the preference rank for each student at the time of publication.
 */
export async function publishSession(
	deps: {
		sessionRepo: SessionRepository;
		scenarioRepo: ScenarioRepository;
		preferenceRepo: PreferenceRepository;
		placementRepo: PlacementRepository;
		idGenerator: IdGenerator;
		clock: Clock;
	},
	input: PublishSessionInput
): Promise<Result<Session, PublishSessionError>> {
	// Load session and verify it's in DRAFT status
	const session = await deps.sessionRepo.getById(input.sessionId);
	if (!session) {
		return err({
			type: 'SESSION_NOT_FOUND',
			sessionId: input.sessionId
		});
	}

	if (session.status === 'PUBLISHED') {
		return err({
			type: 'SESSION_ALREADY_PUBLISHED',
			sessionId: input.sessionId
		});
	}

	if (session.status !== 'DRAFT') {
		return err({
			type: 'SESSION_NOT_IN_DRAFT',
			sessionId: input.sessionId,
			currentStatus: session.status
		});
	}

	// Load scenario with groups
	const scenario = await deps.scenarioRepo.getById(input.scenarioId);
	if (!scenario) {
		return err({
			type: 'SCENARIO_NOT_FOUND',
			scenarioId: input.scenarioId
		});
	}

	// Load preferences for the program and build a lookup map
	const preferences = await deps.preferenceRepo.listByProgramId(session.programId);
	const preferenceMap = new Map<string, StudentPreference>();
	for (const pref of preferences) {
		const studentPref = extractStudentPreference(pref);
		if (studentPref) {
			preferenceMap.set(pref.studentId, studentPref);
		}
	}

	// Create placement records for each group member
	const now = deps.clock.now();
	const placements: Placement[] = [];

	try {
		for (const group of scenario.groups) {
			for (const studentId of group.memberIds) {
				const { rank, snapshot } = calculatePreferenceRank(
					studentId,
					group.id,
					group.name,
					preferenceMap
				);

				const placement = createPlacement({
					id: deps.idGenerator.generateId(),
					sessionId: session.id,
					studentId,
					groupId: group.id,
					groupName: group.name,
					preferenceRank: rank,
					preferenceSnapshot: snapshot,
					assignedAt: now,
					assignedByStaffId: input.publishedByStaffId
				});

				placements.push(placement);
			}
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown placement creation error';
		return err({
			type: 'PLACEMENT_CREATION_FAILED',
			message
		});
	}

	// Save all placements in batch
	try {
		await deps.placementRepo.saveBatch(placements);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	// Update session status
	const updatedSession: Session = {
		...session,
		status: 'PUBLISHED',
		scenarioId: input.scenarioId,
		publishedAt: now,
		publishedByStaffId: input.publishedByStaffId
	};

	try {
		await deps.sessionRepo.update(updatedSession);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({
			type: 'INTERNAL_ERROR',
			message
		});
	}

	return ok(updatedSession);
}
