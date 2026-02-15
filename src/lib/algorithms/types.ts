/**
 * Type definitions for the grouping algorithms.
 *
 * @module algorithms/types
 */

import type { Group, Student, StudentPreference } from '$lib/domain';

/**
 * A pair of student IDs that should not be placed in the same group.
 */
export type AvoidPair = [studentId1: string, studentId2: string];

/**
 * Constraints for the grouping algorithm.
 */
export interface GroupingConstraints {
	/**
	 * Pairs of students that must not be placed in the same group.
	 * Derived from StudentPreference.avoidStudentIds or teacher-defined rules.
	 */
	avoidPairs?: AvoidPair[];

	/**
	 * Map from student ID to set of student IDs they were grouped with in recent sessions.
	 * Used for "no repeat groupmates" and "completely different group" rules.
	 */
	recentGroupmates?: Map<string, Set<string>>;

	/**
	 * If true, students should not be placed with anyone from their most recent group.
	 * Uses recentGroupmates to enforce this.
	 */
	avoidRecentGroupmates?: boolean;
}

/**
 * Options for the balanced assignment algorithm.
 */
export interface AssignmentOptions {
	/** Groups to assign students into. */
	groups: Group[];

	/** Ordered list of student IDs to assign (order may affect results). */
	studentOrder: string[];

	/** Lookup table of preferences by student ID. */
	preferencesById: Record<string, StudentPreference>;

	/** Lookup table of students by ID. */
	studentsById: Record<string, Student>;

	/**
	 * Random seed for deterministic results.
	 * If not provided, uses Math.random().
	 */
	seed?: number;

	/**
	 * Constraints to enforce during assignment.
	 * Optional - if not provided, no constraints are applied.
	 */
	constraints?: GroupingConstraints;
}

/**
 * A constraint violation that occurred during assignment.
 */
export interface ConstraintViolation {
	/** Type of constraint that was violated. */
	type: 'AVOID_PAIR' | 'RECENT_GROUPMATE';
	/** The student being assigned. */
	studentId: string;
	/** The group they were assigned to despite the violation. */
	groupId: string;
	/** The other student(s) involved in the violation. */
	conflictingStudentIds: string[];
}

/**
 * Result of the balanced assignment algorithm.
 */
export interface AssignmentResult {
	/** Groups with memberIds populated. */
	groups: Group[];

	/** Student IDs that could not be assigned (e.g., all groups at capacity). */
	unassignedStudentIds: string[];

	/** Constraint violations that occurred (assignments made despite violating constraints). */
	constraintViolations?: ConstraintViolation[];
}

/**
 * Context needed for group preference scoring.
 */
export interface ScoringContext {
	/** Lookup table of preferences by student ID. */
	preferencesById: Record<string, StudentPreference>;

	/** Lookup table of students by ID. */
	studentsById: Record<string, Student>;
}
