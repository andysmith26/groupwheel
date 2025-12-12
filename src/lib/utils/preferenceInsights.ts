/**
 * Utility functions for computing preference data insights.
 * Used to help teachers understand their data quality before proceeding.
 */

export interface SimplePreference {
	studentId: string;
	likeStudentIds: string[];
}

export interface PreferenceInsights {
	/** Average number of friends listed per student (formatted to 1 decimal) */
	avgFriends: string;
	/** Number of mutual friendships (where A lists B and B lists A) */
	mutualCount: number;
	/** Number of preferences referencing unknown students */
	unknownRefs: number;
	/** True if average friends < 1 */
	lowCoverage: boolean;
	/** True if there are 0 mutual friendships and more than 1 preference */
	noMutual: boolean;
}

/**
 * Compute insights from parsed preference data.
 *
 * @param preferences - Array of parsed student preferences
 * @param warnings - Array of warning messages from parsing (used to count unknown refs)
 * @returns Computed insights or null if no preferences
 */
export function computePreferenceInsights(
	preferences: SimplePreference[],
	warnings: string[] = []
): PreferenceInsights | null {
	if (preferences.length === 0) return null;

	// Average friends per student
	const totalFriends = preferences.reduce((sum, p) => sum + p.likeStudentIds.length, 0);
	const avgFriends = totalFriends / preferences.length;

	// Mutual friendships
	const friendMap = new Map<string, Set<string>>();
	for (const pref of preferences) {
		friendMap.set(pref.studentId, new Set(pref.likeStudentIds));
	}

	let mutualCount = 0;
	const counted = new Set<string>();
	for (const [studentA, friendsA] of friendMap) {
		for (const studentB of friendsA) {
			const key = [studentA, studentB].sort().join('|');
			if (counted.has(key)) continue;

			const friendsB = friendMap.get(studentB);
			if (friendsB?.has(studentA)) {
				mutualCount++;
				counted.add(key);
			}
		}
	}

	// Unknown references (count warnings that mention "not in roster")
	const unknownRefs = warnings.filter((w) => w.includes('not in roster')).length;

	return {
		avgFriends: avgFriends.toFixed(1),
		mutualCount,
		unknownRefs,
		lowCoverage: avgFriends < 1,
		noMutual: mutualCount === 0 && preferences.length > 1
	};
}
