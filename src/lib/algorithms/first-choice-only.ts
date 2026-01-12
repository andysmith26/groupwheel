/**
 * First-choice-only assignment algorithm.
 *
 * This algorithm assigns every student to their first preference, ignoring
 * capacity limits entirely. Students without preferences are left unassigned.
 *
 * Use this when you want to see what "everyone gets their first choice" looks
 * like, accepting that groups may be over-enrolled.
 *
 * @module algorithms/first-choice-only
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
 * Assign students to their first choice, ignoring capacity.
 *
 * This algorithm:
 * 1. Builds a map from group names to group objects (for name-based matching)
 * 2. Shuffles students for fair processing order
 * 3. Assigns each student with preferences to their first choice
 * 4. Leaves students without preferences unassigned
 *
 * @param options - Assignment configuration
 * @returns Groups with assigned students and unassigned student IDs
 */
export function assignFirstChoiceOnly(options: AssignmentOptions): AssignmentResult {
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

	// Shuffle students for fair processing order
	const shuffledStudents = shuffleArray([...options.studentOrder], random);

	const unassigned: string[] = [];

	for (const studentId of shuffledStudents) {
		const pref = options.preferencesById[studentId];
		const firstChoice = pref?.likeGroupIds?.[0];

		if (!firstChoice) {
			// No preferences - leave unassigned
			unassigned.push(studentId);
			continue;
		}

		// Find the group (by ID first, then by name)
		const group = findGroup(firstChoice, groupById, groupByName);

		if (group) {
			// Assign to first choice regardless of capacity
			group.memberIds.push(studentId);
		} else {
			// First choice group doesn't exist - leave unassigned
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
