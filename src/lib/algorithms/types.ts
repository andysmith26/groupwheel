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
	 * Number of swap iterations to attempt for optimization.
	 * Higher values may produce better results but take longer.
	 * Default: 300
	 */
	swapBudget?: number;
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
 * Context needed for happiness calculations.
 */
export interface HappinessContext {
	/** Lookup table of preferences by student ID. */
	preferencesById: Record<string, StudentPreference>;

	/** Lookup table of students by ID. */
	studentsById: Record<string, Student>;
}