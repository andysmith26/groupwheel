/**
 * Utility functions for building grouping constraints from preferences and placement history.
 *
 * @module algorithms/buildConstraints
 */

import type { Placement, Preference, StudentPreference } from '$lib/domain';
import { extractStudentPreference } from '$lib/domain';
import type { AvoidPair, GroupingConstraints } from './types';

/**
 * Build avoid pairs from student preferences.
 *
 * Extracts all avoidStudentIds from preferences and creates symmetric pairs.
 */
export function buildAvoidPairsFromPreferences(preferences: Preference[]): AvoidPair[] {
	const pairs: AvoidPair[] = [];
	const seenPairs = new Set<string>();

	for (const pref of preferences) {
		const studentPref: StudentPreference = extractStudentPreference(pref);
		const studentId = pref.studentId;

		for (const avoidId of studentPref.avoidStudentIds) {
			// Create a canonical key to avoid duplicates (smaller ID first)
			const key = studentId < avoidId ? `${studentId}:${avoidId}` : `${avoidId}:${studentId}`;
			if (!seenPairs.has(key)) {
				seenPairs.add(key);
				pairs.push([studentId, avoidId]);
			}
		}
	}

	return pairs;
}

/**
 * Build a map of recent groupmates from placement history.
 *
 * @param placements - All placements to consider
 * @param studentIds - The students to build the map for
 * @param lookbackSessions - Number of most recent sessions to consider (default: 1). Use 0 to return empty sets.
 */
export function buildRecentGroupmatesMap(
	placements: Placement[],
	studentIds: string[],
	lookbackSessions: number = 1
): Map<string, Set<string>> {
	const result = new Map<string, Set<string>>();

	// Initialize empty sets for all students
	for (const studentId of studentIds) {
		result.set(studentId, new Set());
	}

	if (placements.length === 0 || lookbackSessions <= 0) {
		return result;
	}

	// Group placements by session
	const placementsBySession = new Map<string, Placement[]>();
	for (const placement of placements) {
		const sessionPlacements = placementsBySession.get(placement.sessionId) ?? [];
		sessionPlacements.push(placement);
		placementsBySession.set(placement.sessionId, sessionPlacements);
	}

	// Sort sessions by most recent placement date, descending
	const sessionsByRecency = [...placementsBySession.entries()]
		.map(([sessionId, sessionPlacements]) => ({
			sessionId,
			latestDate: Math.max(...sessionPlacements.map((p) => p.startDate.getTime()))
		}))
		.sort((a, b) => b.latestDate - a.latestDate);

	// Take top N sessions
	const sessionsToProcess = sessionsByRecency
		.slice(0, Math.max(0, lookbackSessions))
		.map((s) => s.sessionId);

	for (const sessionId of sessionsToProcess) {
		const sessionPlacements = placementsBySession.get(sessionId) ?? [];

		// Group placements by groupId within this session
		const placementsByGroup = new Map<string, Placement[]>();
		for (const placement of sessionPlacements) {
			const groupPlacements = placementsByGroup.get(placement.groupId) ?? [];
			groupPlacements.push(placement);
			placementsByGroup.set(placement.groupId, groupPlacements);
		}

		// For each group, add all members as groupmates of each other
		for (const groupPlacements of placementsByGroup.values()) {
			const memberIds = groupPlacements.map((p) => p.studentId);
			for (const studentId of memberIds) {
				const groupmates = result.get(studentId);
				if (groupmates) {
					for (const otherId of memberIds) {
						if (otherId !== studentId) {
							groupmates.add(otherId);
						}
					}
				}
			}
		}
	}

	return result;
}

/**
 * Build complete grouping constraints from preferences and placements.
 */
export function buildGroupingConstraints(options: {
	preferences: Preference[];
	placements: Placement[];
	studentIds: string[];
	avoidRecentGroupmates: boolean;
	lookbackSessions?: number;
}): GroupingConstraints {
	const avoidPairs = buildAvoidPairsFromPreferences(options.preferences);
	const recentGroupmates = options.avoidRecentGroupmates
		? buildRecentGroupmatesMap(options.placements, options.studentIds, options.lookbackSessions ?? 1)
		: undefined;

	return {
		avoidPairs: avoidPairs.length > 0 ? avoidPairs : undefined,
		recentGroupmates,
		avoidRecentGroupmates: options.avoidRecentGroupmates
	};
}
