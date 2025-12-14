/**
 * Balanced assignment algorithm for distributing students into groups.
 *
 * This module provides a simple balanced assignment that distributes
 * students evenly across groups while respecting capacity constraints.
 *
 * Note: This replaces the previous friend-based optimization algorithm.
 * The request-based assignment algorithm (for club placement based on
 * student choices) will be implemented in a future milestone.
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
 * Assign students to groups in a balanced manner.
 *
 * This algorithm:
 * 1. Shuffles students (using seed for determinism if provided)
 * 2. Assigns students round-robin to groups with available capacity
 * 3. Returns any students that couldn't be assigned due to capacity limits
 *
 * @param options - Assignment configuration
 * @returns Groups with assigned students and any unassigned student IDs
 */
export function assignBalanced(options: AssignmentOptions): AssignmentResult {
	const random = options.seed !== undefined ? createSeededRandom(options.seed) : Math.random;

	// Create empty copies of groups
	const workingGroups: Group[] = options.groups.map((group) => ({
		...group,
		memberIds: []
	}));

	// Shuffle students for random distribution
	const shuffledStudents = shuffleArray(options.studentOrder, random);

	const unassigned: string[] = [];

	// Assign students round-robin to groups
	for (const studentId of shuffledStudents) {
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
		} else {
			unassigned.push(studentId);
		}
	}

	return { groups: workingGroups, unassignedStudentIds: unassigned };
}

/**
 * Calculate remaining capacity for a group.
 */
function remainingCapacity(group: Group): number {
	if (group.capacity == null) return Infinity;
	return group.capacity - group.memberIds.length;
}
