import type { PlacementRepository, SessionRepository, StudentRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Statistics about how often two students have been grouped together.
 */
export interface PairingStat {
	studentAId: string;
	studentAName: string;
	studentBId: string;
	studentBName: string;
	/** Number of sessions where these students were in the same group. */
	count: number;
}

/**
 * Input for getting pairing statistics for a program.
 */
export interface GetProgramPairingStatsInput {
	programId: string;
}

/**
 * Result of getting pairing statistics.
 */
export interface ProgramPairingStatsResult {
	programId: string;
	/** Number of published sessions analyzed. */
	totalSessions: number;
	/** All pairs sorted by count (most frequent first). */
	pairs: PairingStat[];
}

/**
 * Get pairing frequency statistics for all student pairs in a program.
 *
 * This analyzes all published sessions to determine how often each pair
 * of students has been grouped together. Useful for:
 * - Identifying over-paired students
 * - Balancing future groupings
 * - Analytics dashboards
 */
export async function getProgramPairingStats(
	deps: {
		placementRepo: PlacementRepository;
		sessionRepo: SessionRepository;
		studentRepo: StudentRepository;
	},
	input: GetProgramPairingStatsInput
): Promise<Result<ProgramPairingStatsResult, never>> {
	// Get all sessions for this program
	const sessions = await deps.sessionRepo.listByProgramId(input.programId);

	// Filter to sessions that have placements (PUBLISHED or ARCHIVED)
	const publishedSessions = sessions.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED');

	if (publishedSessions.length === 0) {
		return ok({
			programId: input.programId,
			totalSessions: 0,
			pairs: []
		});
	}

	// Load all placements for all sessions
	const allPlacements = await Promise.all(
		publishedSessions.map((session) => deps.placementRepo.listBySessionId(session.id))
	);

	// Collect all unique student IDs
	const studentIds = new Set<string>();

	// Count pairings: key = "studentA:studentB" (sorted), value = count
	const pairingCounts = new Map<string, number>();

	for (const sessionPlacements of allPlacements) {
		// Group placements by groupId for this session
		const groupMembers = new Map<string, string[]>();
		for (const placement of sessionPlacements) {
			studentIds.add(placement.studentId);
			const members = groupMembers.get(placement.groupId) ?? [];
			members.push(placement.studentId);
			groupMembers.set(placement.groupId, members);
		}

		// For each group, count all pairs
		for (const members of groupMembers.values()) {
			// Generate all pairs within this group
			for (let i = 0; i < members.length; i++) {
				for (let j = i + 1; j < members.length; j++) {
					// Sort IDs to ensure consistent key
					const [a, b] = [members[i], members[j]].sort();
					const key = `${a}:${b}`;
					pairingCounts.set(key, (pairingCounts.get(key) ?? 0) + 1);
				}
			}
		}
	}

	// Load student names
	const students = await deps.studentRepo.getByIds([...studentIds]);
	const studentMap = new Map(students.map((s) => [s.id, s]));

	const getStudentName = (id: string): string => {
		const student = studentMap.get(id);
		if (!student) return id;
		return `${student.firstName}${student.lastName ? ' ' + student.lastName : ''}`;
	};

	// Convert to array and sort by count descending
	const pairs: PairingStat[] = [];
	for (const [key, count] of pairingCounts) {
		const [studentAId, studentBId] = key.split(':');
		pairs.push({
			studentAId,
			studentAName: getStudentName(studentAId),
			studentBId,
			studentBName: getStudentName(studentBId),
			count
		});
	}

	pairs.sort((a, b) => b.count - a.count);

	return ok({
		programId: input.programId,
		totalSessions: publishedSessions.length,
		pairs
	});
}
