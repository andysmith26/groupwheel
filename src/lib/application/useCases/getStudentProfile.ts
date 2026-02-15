/**
 * Use case for getting a comprehensive student profile.
 *
 * Aggregates all historical data for a student identity across activities:
 * - All student records (import instances)
 * - Placement history with sessions
 * - Preferences expressed
 * - Observations (via groups they were placed in)
 * - Pairing statistics with other students
 *
 * @module application/useCases/getStudentProfile
 */

import type {
	Student,
	StudentIdentity,
	Placement,
	Session,
	Preference,
	Observation
} from '$lib/domain';
import { getCanonicalId } from '$lib/domain/student';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import type { StudentIdentityRepository } from '$lib/application/ports/StudentIdentityRepository';
import type { PlacementRepository } from '$lib/application/ports/PlacementRepository';
import type { SessionRepository } from '$lib/application/ports/SessionRepository';
import type { PreferenceRepository } from '$lib/application/ports/PreferenceRepository';
import type { ObservationRepository } from '$lib/application/ports/ObservationRepository';
import type { PoolRepository } from '$lib/application/ports/PoolRepository';
import type { ProgramRepository } from '$lib/application/ports/ProgramRepository';
import { ok, err, type Result } from '$lib/types/result';

// ============================================================================
// Types
// ============================================================================

export interface GetStudentProfileDeps {
	studentRepo: StudentRepository;
	studentIdentityRepo: StudentIdentityRepository;
	placementRepo: PlacementRepository;
	sessionRepo: SessionRepository;
	preferenceRepo: PreferenceRepository;
	observationRepo: ObservationRepository;
	poolRepo: PoolRepository;
	programRepo: ProgramRepository;
}

export interface GetStudentProfileInput {
	/** The canonical identity ID to get profile for */
	identityId: string;
}

/**
 * A placement record enriched with session and activity context.
 */
export interface PlacementWithContext {
	placement: Placement;
	session: Session | null;
	activityName: string;
	groupName: string;
}

/**
 * Preference record with activity context.
 */
export interface PreferenceWithContext {
	preference: Preference;
	activityName: string;
}

/**
 * Pairing statistics with another student.
 */
export interface ProfilePairingStat {
	/** The other student's canonical ID */
	otherStudentCanonicalId: string;
	/** Display name of the other student */
	otherStudentName: string;
	/** Number of times paired together */
	count: number;
}

/**
 * Summary statistics for the student profile.
 */
export interface ProfileSummary {
	/** Total number of activities participated in */
	activityCount: number;
	/** Total number of groupings/sessions */
	totalGroupings: number;
	/** Percentage of first-choice placements */
	firstChoicePercentage: number;
	/** First seen date (earliest import) */
	firstSeen: Date;
	/** Last seen date (most recent activity) */
	lastSeen: Date | null;
}

/**
 * Complete student profile data.
 */
export interface StudentProfile {
	/** The canonical identity */
	identity: StudentIdentity;
	/** All import instances of this student */
	studentRecords: Student[];
	/** Placement history with context */
	placementHistory: PlacementWithContext[];
	/** Preferences expressed across activities */
	preferences: PreferenceWithContext[];
	/** Observations involving this student's groups */
	observations: Observation[];
	/** Pairing frequency with other students */
	pairingStats: ProfilePairingStat[];
	/** Summary statistics */
	summary: ProfileSummary;
}

export type GetStudentProfileError =
	| { type: 'IDENTITY_NOT_FOUND'; message: string };

// ============================================================================
// Use Case
// ============================================================================

/**
 * Get a comprehensive profile for a student identity.
 */
export async function getStudentProfile(
	deps: GetStudentProfileDeps,
	input: GetStudentProfileInput
): Promise<Result<StudentProfile, GetStudentProfileError>> {
	const {
		studentRepo,
		studentIdentityRepo,
		placementRepo,
		sessionRepo,
		preferenceRepo,
		observationRepo,
		poolRepo,
		programRepo
	} = deps;
	const { identityId } = input;

	// Fetch the identity
	const identity = await studentIdentityRepo.getById(identityId);
	if (!identity) {
		return err({
			type: 'IDENTITY_NOT_FOUND',
			message: `Student identity ${identityId} not found`
		});
	}

	// Get all student records linked to this identity
	const studentRecords = await studentRepo.listByCanonicalId(identityId);

	// Collect all student IDs (for querying placements, preferences)
	const studentIds = studentRecords.map((s) => s.id);
	// Also include the identity ID itself for backward compatibility
	// (students without canonicalId use their own id)
	if (!studentIds.includes(identityId)) {
		studentIds.push(identityId);
	}

	// Fetch placements for all student IDs
	const allPlacements: Placement[] = [];
	for (const studentId of studentIds) {
		const placements = await placementRepo.listByStudentId(studentId);
		allPlacements.push(...placements);
	}

	// Get unique session IDs and load sessions
	const sessionIds = [...new Set(allPlacements.map((p) => p.sessionId))];
	const sessionMap = new Map<string, Session>();
	for (const sessionId of sessionIds) {
		const session = await sessionRepo.getById(sessionId);
		if (session) {
			sessionMap.set(sessionId, session);
		}
	}

	// Get program names for sessions
	const programIds = [...new Set(
		Array.from(sessionMap.values()).map((s) => s.programId)
	)];
	const programMap = new Map<string, string>();
	for (const programId of programIds) {
		const program = await programRepo.getById(programId);
		if (program) {
			programMap.set(programId, program.name);
		}
	}

	// Build placement history with context
	const placementHistory: PlacementWithContext[] = allPlacements.map((placement) => {
		const session = sessionMap.get(placement.sessionId) ?? null;
		const activityName = session ? (programMap.get(session.programId) ?? 'Unknown') : 'Unknown';
		return {
			placement,
			session,
			activityName,
			groupName: placement.groupName ?? 'Unknown'
		};
	});

	// Sort by date (most recent first)
	placementHistory.sort((a, b) => {
		const dateA = a.session?.startDate?.getTime() ?? 0;
		const dateB = b.session?.startDate?.getTime() ?? 0;
		return dateB - dateA;
	});

	// Fetch preferences for all student IDs
	const allPreferences: PreferenceWithContext[] = [];
	for (const programId of programIds) {
		const prefs = await preferenceRepo.listByProgramId(programId);
		for (const pref of prefs) {
			if (studentIds.includes(pref.studentId)) {
				allPreferences.push({
					preference: pref,
					activityName: programMap.get(programId) ?? 'Unknown'
				});
			}
		}
	}

	// Fetch observations for groups this student was in
	const groupIds = [...new Set(allPlacements.map((p) => p.groupId))];
	const observations: Observation[] = [];
	for (const programId of programIds) {
		const programObs = await observationRepo.listByProgramId(programId);
		for (const obs of programObs) {
			if (groupIds.includes(obs.groupId)) {
				observations.push(obs);
			}
		}
	}

	// Sort observations by date (most recent first)
	observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	// Calculate pairing stats
	const pairingStats = await calculatePairingStats(
		deps,
		studentIds,
		allPlacements
	);

	// Calculate summary
	const summary = calculateSummary(
		identity,
		placementHistory,
		programIds.length
	);

	return ok({
		identity,
		studentRecords,
		placementHistory,
		preferences: allPreferences,
		observations,
		pairingStats,
		summary
	});
}

// ============================================================================
// Helpers
// ============================================================================

async function calculatePairingStats(
	deps: GetStudentProfileDeps,
	studentIds: string[],
	placements: Placement[]
): Promise<ProfilePairingStat[]> {
	const { placementRepo, studentRepo, studentIdentityRepo } = deps;

	// Group placements by session+group
	const groupKey = (p: Placement) => `${p.sessionId}:${p.groupId}`;
	const placementsByGroup = new Map<string, Placement[]>();
	for (const p of placements) {
		const key = groupKey(p);
		if (!placementsByGroup.has(key)) {
			placementsByGroup.set(key, []);
		}
		placementsByGroup.get(key)!.push(p);
	}

	// Count pairings with other students
	const pairingCounts = new Map<string, number>();

	for (const [key, groupPlacements] of placementsByGroup.entries()) {
		// Get all placements in this group
		const sessionId = key.split(':')[0];
		const groupId = key.split(':')[1];

		// We already have our student's placements; get all placements for the group
		const allGroupPlacements = await placementRepo.listBySessionId(sessionId);
		const groupmates = allGroupPlacements.filter(
			(p) => p.groupId === groupId && !studentIds.includes(p.studentId)
		);

		for (const mate of groupmates) {
			const current = pairingCounts.get(mate.studentId) ?? 0;
			pairingCounts.set(mate.studentId, current + 1);
		}
	}

	// Convert to array and fetch names
	const stats: ProfilePairingStat[] = [];
	for (const [otherStudentId, count] of pairingCounts.entries()) {
		// Try to get the other student's identity
		const otherStudent = await studentRepo.getById(otherStudentId);
		let otherStudentName = 'Unknown';
		let otherStudentCanonicalId = otherStudentId;

		if (otherStudent) {
			otherStudentCanonicalId = getCanonicalId(otherStudent);
			otherStudentName = otherStudent.lastName
				? `${otherStudent.firstName} ${otherStudent.lastName}`
				: otherStudent.firstName;

			// Try to get identity for better display name
			const identity = await studentIdentityRepo.getById(otherStudentCanonicalId);
			if (identity) {
				otherStudentName = identity.displayName;
			}
		}

		stats.push({
			otherStudentCanonicalId,
			otherStudentName,
			count
		});
	}

	// Sort by count descending
	stats.sort((a, b) => b.count - a.count);

	return stats;
}

function calculateSummary(
	identity: StudentIdentity,
	placementHistory: PlacementWithContext[],
	activityCount: number
): ProfileSummary {
	const totalGroupings = placementHistory.length;

	// Calculate first-choice percentage
	const firstChoiceCount = placementHistory.filter(
		(p) => p.placement.preferenceRank === 1
	).length;
	const placementsWithPrefs = placementHistory.filter(
		(p) => p.placement.preferenceRank !== null
	).length;
	const firstChoicePercentage =
		placementsWithPrefs > 0
			? Math.round((firstChoiceCount / placementsWithPrefs) * 100)
			: 0;

	// Find first/last seen dates
	const firstSeen = identity.createdAt;
	let lastSeen: Date | null = null;

	for (const p of placementHistory) {
		if (p.session?.startDate) {
			if (!lastSeen || p.session.startDate > lastSeen) {
				lastSeen = p.session.startDate;
			}
		}
	}

	return {
		activityCount,
		totalGroupings,
		firstChoicePercentage,
		firstSeen,
		lastSeen
	};
}
