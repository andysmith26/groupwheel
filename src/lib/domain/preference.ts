/**
 * Preference types for the Turntable domain.
 *
 * This module contains two related but distinct concepts:
 *
 * 1. `StudentPreference` - A value object representing the preferences expressed
 *    by a single student (which groups they want to join, avoid, etc.). This is
 *    the "payload" that gets stored and used by algorithms.
 *
 * 2. `Preference` - A persisted entity that wraps a StudentPreference with
 *    identity (id) and context (programId, studentId). This is what gets stored
 *    in the PreferenceRepository.
 *
 * Note: This module previously supported friend-based preferences (likeStudentIds).
 * That feature was removed in the Turntable pivot (December 2025). See PROJECT_HISTORY.md.
 *
 * @module domain/preference
 */

// ============================================================================
// Value Types (aliases for documentation clarity)
// ============================================================================

/**
 * A unique identifier for a student. In practice this will often be their
 * email address, but any unique string is acceptable.
 */
export type StudentId = string;

/**
 * A unique identifier for a group. Groups are defined separately;
 * preference records refer to them by ID.
 */
export type GroupId = string;

// ============================================================================
// StudentPreference (Value Object)
// ============================================================================

/**
 * Represents the preferences expressed by a single student.
 *
 * Ordering of arrays conveys ranking (earlier items are higher priority).
 * Unordered lists (avoid lists) are treated as sets where ordering has no
 * semantic meaning.
 *
 * This is a pure value object with no identity of its own. It becomes
 * meaningful when associated with a student in a specific program context
 * (see `Preference` entity below).
 */
export interface StudentPreference {
	/**
	 * The identifier of the student this preference belongs to.
	 * Must correspond to a Student.id in the same scenario/program.
	 */
	studentId: StudentId;

	/**
	 * A set of student IDs this student would prefer to avoid.
	 * Order has no meaning. Used for constraint-based grouping.
	 */
	avoidStudentIds: StudentId[];

	/**
	 * An ordered list of group IDs representing the student's ranked
	 * choices of groups they would prefer to join (e.g., club selections).
	 * The first entry is considered the highest priority.
	 * Leave empty if the student has no group preference.
	 */
	likeGroupIds: GroupId[];

	/**
	 * A set of group IDs the student would prefer to avoid.
	 * Order has no meaning.
	 */
	avoidGroupIds: GroupId[];

	/**
	 * Optional catch-all for additional preference flags.
	 * Examples: `{ preferredGroupSize: 4 }`
	 */
	meta?: Record<string, string | number | boolean | null | undefined>;
}

// ============================================================================
// Preference (Entity)
// ============================================================================

/**
 * A persisted preference record that associates a StudentPreference
 * with a specific program and provides entity identity.
 *
 * This is what gets stored in the PreferenceRepository.
 */
export interface Preference {
	/** Unique identifier for this preference record. */
	id: string;

	/** The program this preference belongs to. */
	programId: string;

	/** The student who expressed this preference. */
	studentId: string;

	/**
	 * The actual preference data.
	 * Typed as StudentPreference for strong typing, but stored as
	 * unknown in some legacy code paths.
	 */
	payload: StudentPreference | unknown;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty StudentPreference for a student with no expressed preferences.
 * Useful for ensuring all students have a preference record even if they
 * didn't fill out the form.
 */
export function createEmptyStudentPreference(studentId: string): StudentPreference {
	return {
		studentId,
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	};
}

/**
 * Type guard to check if a payload is a valid StudentPreference.
 */
export function isStudentPreference(payload: unknown): payload is StudentPreference {
	if (!payload || typeof payload !== 'object') return false;
	const p = payload as Record<string, unknown>;
	return (
		typeof p.studentId === 'string' &&
		Array.isArray(p.avoidStudentIds) &&
		Array.isArray(p.likeGroupIds) &&
		Array.isArray(p.avoidGroupIds)
	);
}

/**
 * Safely extract a StudentPreference from a Preference payload.
 * Returns an empty preference if the payload is invalid.
 */
export function extractStudentPreference(preference: Preference): StudentPreference {
	if (isStudentPreference(preference.payload)) {
		return preference.payload;
	}
	return createEmptyStudentPreference(preference.studentId);
}
