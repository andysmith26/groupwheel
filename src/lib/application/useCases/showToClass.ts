import type { Session, Placement, StudentPreference } from '$lib/domain';
import { createPublishedSession } from '$lib/domain/session';
import { createPlacement } from '$lib/domain/placement';
import { extractStudentPreference } from '$lib/domain/preference';
import type {
	ProgramRepository,
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
 * Input for the showToClass use case.
 */
export interface ShowToClassInput {
	programId: string;
	scenarioId: string;
}

/**
 * Failure modes for showToClass.
 */
export type ShowToClassError =
	| { type: 'PROGRAM_NOT_FOUND'; programId: string }
	| { type: 'SCENARIO_NOT_FOUND'; scenarioId: string }
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
 * Show groups to class — a single atomic operation that:
 * 1. Archives any existing active sessions
 * 2. Creates a PUBLISHED session (no DRAFT step)
 * 3. Creates Placement records for all students
 *
 * Replaces the old createSession() + publishSession() two-step flow.
 */
export async function showToClass(
	deps: {
		programRepo: ProgramRepository;
		sessionRepo: SessionRepository;
		scenarioRepo: ScenarioRepository;
		preferenceRepo: PreferenceRepository;
		placementRepo: PlacementRepository;
		idGenerator: IdGenerator;
		clock: Clock;
	},
	input: ShowToClassInput
): Promise<Result<Session, ShowToClassError>> {
	// 1. Load program
	const program = await deps.programRepo.getById(input.programId);
	if (!program) {
		return err({ type: 'PROGRAM_NOT_FOUND', programId: input.programId });
	}

	// 2. Load scenario
	const scenario = await deps.scenarioRepo.getById(input.scenarioId);
	if (!scenario) {
		return err({ type: 'SCENARIO_NOT_FOUND', scenarioId: input.scenarioId });
	}

	// 3. Archive any existing PUBLISHED sessions
	const existingSessions = await deps.sessionRepo.listByProgramId(input.programId);
	const published = existingSessions.filter((s) => s.status === 'PUBLISHED');
	for (const session of published) {
		await deps.sessionRepo.update({ ...session, status: 'ARCHIVED' });
	}

	// 4. Create the session as PUBLISHED directly
	const now = deps.clock.now();
	const endDate = new Date(now);
	endDate.setMonth(endDate.getMonth() + 6);

	let session: Session;
	try {
		session = createPublishedSession({
			id: deps.idGenerator.generateId(),
			programId: input.programId,
			name: `${program.name} - ${now.toLocaleDateString()}`,
			academicYear: `${now.getFullYear()}-${now.getFullYear() + 1}`,
			startDate: now,
			endDate,
			createdAt: now,
			scenarioId: input.scenarioId,
			publishedAt: now
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown domain validation error';
		return err({ type: 'INTERNAL_ERROR', message });
	}

	// 5. Create Placement records
	const preferences = await deps.preferenceRepo.listByProgramId(input.programId);
	const preferenceMap = new Map<string, StudentPreference>();
	for (const pref of preferences) {
		const studentPref = extractStudentPreference(pref);
		if (studentPref) {
			preferenceMap.set(pref.studentId, studentPref);
		}
	}

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
					assignedAt: now
				});

				placements.push(placement);
			}
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown placement creation error';
		return err({ type: 'INTERNAL_ERROR', message });
	}

	// 6. Save placements in batch
	try {
		await deps.placementRepo.saveBatch(placements);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({ type: 'INTERNAL_ERROR', message });
	}

	// 7. Save session
	try {
		await deps.sessionRepo.save(session);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown persistence error';
		return err({ type: 'INTERNAL_ERROR', message });
	}

	return ok(session);
}
