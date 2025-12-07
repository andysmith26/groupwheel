/**
 * GroupingAlgorithm port.
 *
 * Defines the interface for any grouping algorithm implementation.
 * This allows the application layer to remain decoupled from specific
 * algorithm implementations (balanced assignment, random, etc.).
 *
 * @module application/ports/GroupingAlgorithm
 */

/**
 * Result of a successful grouping operation.
 */
export interface GroupingResult {
	/** Groups with memberIds populated. */
	groups: Array<{
		id: string;
		name: string;
		capacity: number | null;
		memberIds: string[];
	}>;
}

/**
 * Result of a failed grouping operation.
 */
export interface GroupingFailure {
	/** Human-readable error message. */
	message: string;
}

/**
 * Parameters for the grouping algorithm.
 */
export interface GroupingParams {
	/** The program ID (used to fetch preferences). */
	programId: string;

	/** Student IDs to assign to groups. */
	studentIds: string[];

	/**
	 * Optional algorithm-specific configuration.
	 * Shape depends on the implementation (e.g., swap budget, group definitions).
	 */
	algorithmConfig?: unknown;
}

/**
 * Port interface for grouping algorithms.
 *
 * Implementations:
 * - BalancedGroupingAlgorithm (src/lib/infrastructure/algorithms/balancedGrouping.ts)
 * - TrivialGroupingAlgorithm (for testing)
 */
export interface GroupingAlgorithm {
	/**
	 * Generate group assignments for the given students.
	 *
	 * @param params - Grouping parameters including student IDs and optional config
	 * @returns Success with populated groups, or failure with error message
	 */
	generateGroups(
		params: GroupingParams
	): Promise<
		| { success: true; groups: GroupingResult['groups'] }
		| { success: false; message: string }
	>;
}