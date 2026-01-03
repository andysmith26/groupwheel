import type { Placement, Session } from '$lib/domain';
import type { PlacementRepository, SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * A placement record enriched with session information.
 */
export interface PlacementWithSession {
	placement: Placement;
	session: Session | null;
}

/**
 * Summary statistics for a student's placement history.
 */
export interface PlacementHistorySummary {
	totalPlacements: number;
	firstChoiceCount: number;
	secondChoiceCount: number;
	thirdChoiceCount: number;
	unrankedCount: number;
	firstChoicePercentage: number;
	averagePreferenceRank: number | null;
}

/**
 * Input for getting student placement history.
 */
export interface GetStudentPlacementHistoryInput {
	studentId: string;
}

/**
 * Result of getting student placement history.
 */
export interface StudentPlacementHistoryResult {
	studentId: string;
	placements: PlacementWithSession[];
	summary: PlacementHistorySummary;
}

/**
 * Get the complete placement history for a student across all sessions.
 */
export async function getStudentPlacementHistory(
	deps: {
		placementRepo: PlacementRepository;
		sessionRepo: SessionRepository;
	},
	input: GetStudentPlacementHistoryInput
): Promise<Result<StudentPlacementHistoryResult, never>> {
	// Get all placements for this student
	const placements = await deps.placementRepo.listByStudentId(input.studentId);

	// Get unique session IDs
	const sessionIds = [...new Set(placements.map((p) => p.sessionId))];

	// Load all sessions
	const sessionMap = new Map<string, Session>();
	for (const sessionId of sessionIds) {
		const session = await deps.sessionRepo.getById(sessionId);
		if (session) {
			sessionMap.set(sessionId, session);
		}
	}

	// Enrich placements with session info
	const placementsWithSession: PlacementWithSession[] = placements.map((placement) => ({
		placement,
		session: sessionMap.get(placement.sessionId) ?? null
	}));

	// Sort by session start date (most recent first)
	placementsWithSession.sort((a, b) => {
		const dateA = a.session?.startDate?.getTime() ?? 0;
		const dateB = b.session?.startDate?.getTime() ?? 0;
		return dateB - dateA;
	});

	// Calculate summary statistics
	const summary = calculateSummary(placements);

	return ok({
		studentId: input.studentId,
		placements: placementsWithSession,
		summary
	});
}

function calculateSummary(placements: Placement[]): PlacementHistorySummary {
	const totalPlacements = placements.length;
	let firstChoiceCount = 0;
	let secondChoiceCount = 0;
	let thirdChoiceCount = 0;
	let unrankedCount = 0;
	let totalRank = 0;
	let rankedCount = 0;

	for (const placement of placements) {
		if (placement.preferenceRank === null) {
			unrankedCount++;
		} else {
			rankedCount++;
			totalRank += placement.preferenceRank;

			if (placement.preferenceRank === 1) {
				firstChoiceCount++;
			} else if (placement.preferenceRank === 2) {
				secondChoiceCount++;
			} else if (placement.preferenceRank === 3) {
				thirdChoiceCount++;
			}
		}
	}

	return {
		totalPlacements,
		firstChoiceCount,
		secondChoiceCount,
		thirdChoiceCount,
		unrankedCount,
		firstChoicePercentage:
			totalPlacements > 0 ? Math.round((firstChoiceCount / totalPlacements) * 100) : 0,
		averagePreferenceRank: rankedCount > 0 ? totalRank / rankedCount : null
	};
}
