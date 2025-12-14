/**
 * Type definitions for the grouping algorithms.
 *
 * @module algorithms/types
 */

import type { Group, Student, StudentPreference } from '$lib/domain';

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
}

/**
 * Result of the balanced assignment algorithm.
 */
export interface AssignmentResult {
	/** Groups with memberIds populated. */
	groups: Group[];

	/** Student IDs that could not be assigned (e.g., all groups at capacity). */
	unassignedStudentIds: string[];
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
