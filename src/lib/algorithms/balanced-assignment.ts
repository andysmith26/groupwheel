/**
 * Request-aware balanced assignment algorithm for distributing students into groups.
 *
 * This module provides a request-aware assignment algorithm that:
 * 1. Tries to assign students to their preferred groups (from likeGroupIds)
 * 2. Respects group capacity limits
 * 3. Falls back to balanced distribution for students without preferences
 *
 * The algorithm prioritizes:
 * - First choice requests (when capacity allows)
 * - Second/third choice as fallbacks
 * - Balanced distribution for remaining students
 *
 * @module algorithms/balanced-assignment
 */

import type { Group } from '$lib/domain';
import type { AssignmentOptions, AssignmentResult } from './types';

/**
 * Simple seeded random number generator for deterministic results.
 * Uses a linear congruential generator (LCG).
 */
function createSeededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		// LCG parameters (same as glibc)
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Assign students to groups with request-aware optimization.
 *
 * This algorithm:
 * 1. Builds a map from group names to group objects (for name-based matching)
 * 2. Processes students with preferences first, trying to satisfy their requests
 * 3. Assigns remaining students using balanced distribution
 * 4. Returns any students that couldn't be assigned due to capacity limits
 *
 * @param options - Assignment configuration
 * @returns Groups with assigned students and any unassigned student IDs
 */
export function assignBalanced(options: AssignmentOptions): AssignmentResult {
	const random = options.seed !== undefined ? createSeededRandom(options.seed) : Math.random;

	// Create working copies of groups
	const workingGroups: Group[] = options.groups.map((group) => ({
		...group,
		memberIds: []
	}));

	// Build maps for group lookup (by ID and by name)
	const groupById = new Map<string, Group>();
	const groupByName = new Map<string, Group>();
	for (const group of workingGroups) {
		groupById.set(group.id, group);
		groupByName.set(group.name.toLowerCase(), group);
	}

	// Separate students into those with and without preferences
	const studentsWithPrefs: Array<{ id: string; choices: string[] }> = [];
	const studentsWithoutPrefs: string[] = [];

	for (const studentId of options.studentOrder) {
		const pref = options.preferencesById[studentId];
		const choices = pref?.likeGroupIds ?? [];

		if (choices.length > 0) {
			studentsWithPrefs.push({ id: studentId, choices });
		} else {
			studentsWithoutPrefs.push(studentId);
		}
	}

	// Shuffle both lists for fairness when requests conflict
	const shuffledWithPrefs = shuffleArray(studentsWithPrefs, random);
	const shuffledWithoutPrefs = shuffleArray(studentsWithoutPrefs, random);

	const assigned = new Set<string>();
	const unassigned: string[] = [];

	// Phase 1: Process students with preferences
	// Try to assign each student to one of their preferred groups
	for (const { id: studentId, choices } of shuffledWithPrefs) {
		let assignedToGroup = false;

		// Try each choice in order of preference
		for (const choice of choices) {
			const group = findGroup(choice, groupById, groupByName);
			if (group && remainingCapacity(group) > 0) {
				group.memberIds.push(studentId);
				assigned.add(studentId);
				assignedToGroup = true;
				break;
			}
		}

		// If no preferred group has space, add to fallback list
		if (!assignedToGroup) {
			studentsWithoutPrefs.push(studentId);
		}
	}

	// Re-shuffle fallback list (includes students whose preferences couldn't be met)
	const fallbackStudents = shuffleArray(
		studentsWithoutPrefs.filter((id) => !assigned.has(id)),
		random
	);

	// Phase 2: Balanced assignment for remaining students
	for (const studentId of fallbackStudents) {
		// Find group with most remaining capacity
		let bestGroup: Group | null = null;
		let bestRemaining = 0;

		for (const group of workingGroups) {
			const remaining = remainingCapacity(group);
			if (remaining > bestRemaining) {
				bestRemaining = remaining;
				bestGroup = group;
			}
		}

		if (bestGroup && bestRemaining > 0) {
			bestGroup.memberIds.push(studentId);
			assigned.add(studentId);
		} else {
			unassigned.push(studentId);
		}
	}

	return { groups: workingGroups, unassignedStudentIds: unassigned };
}

/**
 * Find a group by ID or name (case-insensitive).
 */
function findGroup(
	idOrName: string,
	groupById: Map<string, Group>,
	groupByName: Map<string, Group>
): Group | undefined {
	// Try by ID first
	const byId = groupById.get(idOrName);
	if (byId) return byId;

	// Then try by name (case-insensitive)
	return groupByName.get(idOrName.toLowerCase());
}

/**
 * Calculate remaining capacity for a group.
 */
function remainingCapacity(group: Group): number {
	if (group.capacity == null) return Infinity;
	return group.capacity - group.memberIds.length;
}
