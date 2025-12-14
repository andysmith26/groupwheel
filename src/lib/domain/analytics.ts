import type { Scenario } from './scenario';
import type { Preference } from './preference';
import type { Student } from './student';

export interface ScenarioSatisfaction {
	/**
	 * Percentage of students assigned to their first choice group (0–100).
	 */
	percentAssignedTopChoice: number;

	/**
	 * Mean numeric rank of assigned group choice (lower is better).
	 * If there are no usable preferences, this may be NaN or a sentinel.
	 */
	averagePreferenceRankAssigned: number;

	/**
	 * Percentage assigned to one of their top 2 group choices (0–100).
	 */
	percentAssignedTop2?: number;

	/**
	 * Percentage assigned to one of their top 3 group choices (0–100).
	 */
	percentAssignedTop3?: number;

	/**
	 * Number of students who had no group preferences.
	 */
	studentsWithNoPreferences?: number;

	/**
	 * Number of students who were not assigned to any of their requested groups.
	 */
	studentsUnassignedToRequest?: number;
}

/**
 * Extract ranked group choices from a Preference payload.
 * Returns the likeGroupIds array if present, otherwise an empty array.
 */
function extractGroupChoices(pref: Preference): string[] {
	if (!pref.payload || typeof pref.payload !== 'object') {
		return [];
	}

	const payload = pref.payload as Record<string, unknown>;

	if (Array.isArray(payload.likeGroupIds)) {
		return payload.likeGroupIds.filter((id): id is string => typeof id === 'string');
	}

	return [];
}

/**
 * Compute satisfaction metrics for a scenario based on how well students
 * were assigned to their requested groups.
 *
 * This measures request satisfaction: what percentage of students got
 * their 1st choice, top 2, top 3, etc.
 */
export function computeScenarioSatisfaction(params: {
	scenario: Scenario;
	preferences: Preference[];
	students: Student[];
}): ScenarioSatisfaction {
	const { scenario, preferences } = params;

	// Build a map from student ID to their assigned group ID
	const studentToGroup = new Map<string, string>();
	for (const group of scenario.groups) {
		for (const studentId of group.memberIds) {
			studentToGroup.set(studentId, group.id);
		}
	}

	// Build a map from group name (lowercase) to group ID for name-based matching
	// This supports the case where preferences store group names instead of IDs
	const groupNameToId = new Map<string, string>();
	for (const group of scenario.groups) {
		groupNameToId.set(group.name.toLowerCase(), group.id);
	}

	let topChoiceCount = 0;
	let top2Count = 0;
	let top3Count = 0;
	let totalRank = 0;
	let studentsWithPrefs = 0;
	let studentsWithNoPrefs = 0;
	let unassignedToRequest = 0;

	for (const pref of preferences) {
		const assignedGroupId = studentToGroup.get(pref.studentId);
		if (!assignedGroupId) {
			// Student not assigned to any group
			continue;
		}

		const groupChoices = extractGroupChoices(pref);
		if (groupChoices.length === 0) {
			studentsWithNoPrefs++;
			continue;
		}

		studentsWithPrefs++;

		// Find the rank of the assigned group in the student's preferences
		// Try matching by ID first, then by name (case-insensitive)
		let assignedRank = groupChoices.indexOf(assignedGroupId);
		if (assignedRank === -1) {
			// Try matching by name - preferences might store group names instead of IDs
			assignedRank = groupChoices.findIndex(
				(choice) => groupNameToId.get(choice.toLowerCase()) === assignedGroupId
			);
		}

		if (assignedRank === -1) {
			// Student was not assigned to any of their requested groups
			unassignedToRequest++;
			// Treat as rank beyond their choices for averaging
			totalRank += groupChoices.length + 1;
		} else {
			const rank = assignedRank + 1; // 1-indexed
			totalRank += rank;

			if (rank === 1) {
				topChoiceCount++;
			}
			if (rank <= 2) {
				top2Count++;
			}
			if (rank <= 3) {
				top3Count++;
			}
		}
	}

	if (studentsWithPrefs === 0) {
		return {
			percentAssignedTopChoice: 0,
			averagePreferenceRankAssigned: NaN,
			percentAssignedTop2: 0,
			percentAssignedTop3: 0,
			studentsWithNoPreferences: studentsWithNoPrefs,
			studentsUnassignedToRequest: 0
		};
	}

	return {
		percentAssignedTopChoice: (topChoiceCount / studentsWithPrefs) * 100,
		averagePreferenceRankAssigned: totalRank / studentsWithPrefs,
		percentAssignedTop2: (top2Count / studentsWithPrefs) * 100,
		percentAssignedTop3: (top3Count / studentsWithPrefs) * 100,
		studentsWithNoPreferences: studentsWithNoPrefs,
		studentsUnassignedToRequest: unassignedToRequest
	};
}
