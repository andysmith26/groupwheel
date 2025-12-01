import type { Scenario } from './scenario';
import type { Preference } from './preference';
import type { Student } from './student';

export interface ScenarioSatisfaction {
	/**
	 * Percentage of students assigned to their first choice (0–100).
	 */
	percentAssignedTopChoice: number;

	/**
	 * Mean numeric rank of assigned choice (lower is better).
	 * If there are no usable preferences, this may be NaN or a sentinel.
	 */
	averagePreferenceRankAssigned: number;

	/**
	 * Optional: percentage assigned to one of their top 2 choices (0–100).
	 */
	percentAssignedTop2?: number;
}

/**
 * Extract friend ("like") student IDs from a Preference payload.
 * Handles the StudentPreference shape used by the grouping algorithm and
 * roster import code, but gracefully returns an empty list for unknown shapes.
 */
function extractFriendIds(pref: Preference): string[] {
        if (!pref.payload || typeof pref.payload !== 'object') {
                return [];
        }

        const payload = pref.payload as Record<string, unknown>;

        if (Array.isArray(payload.likeStudentIds)) {
                return payload.likeStudentIds.filter((id): id is string => typeof id === 'string');
        }

        return [];
}

export function computeScenarioSatisfaction(params: {
        scenario: Scenario;
        preferences: Preference[];
        students: Student[];
}): ScenarioSatisfaction {
        const { scenario, preferences } = params;

        const studentToGroup = new Map<string, string>();
        for (const group of scenario.groups) {
                for (const studentId of group.memberIds) {
                        studentToGroup.set(studentId, group.id);
                }
        }

        const groupMembers = new Map<string, Set<string>>();
        for (const group of scenario.groups) {
                groupMembers.set(group.id, new Set(group.memberIds));
        }

        let topChoiceCount = 0;
        let top2Count = 0;
        let totalRank = 0;
        let studentsWithPrefs = 0;

        for (const pref of preferences) {
                const studentGroupId = studentToGroup.get(pref.studentId);
                if (!studentGroupId) {
                        continue;
                }

                const friendIds = extractFriendIds(pref);
                if (friendIds.length === 0) {
                        continue;
                }

                const groupMemberSet = groupMembers.get(studentGroupId);
                if (!groupMemberSet) {
                        continue;
                }

                studentsWithPrefs++;

                let rank = friendIds.length + 1;
                for (let i = 0; i < friendIds.length; i++) {
                        if (groupMemberSet.has(friendIds[i])) {
                                rank = i + 1;
                                break;
                        }
                }

                if (rank === 1) {
                        topChoiceCount++;
                }
                if (rank <= 2) {
                        top2Count++;
                }
                totalRank += rank;
        }

        if (studentsWithPrefs === 0) {
                return {
                        percentAssignedTopChoice: 0,
                        averagePreferenceRankAssigned: NaN,
                        percentAssignedTop2: 0
                };
        }

        return {
                        percentAssignedTopChoice: (topChoiceCount / studentsWithPrefs) * 100,
                        averagePreferenceRankAssigned: totalRank / studentsWithPrefs,
                        percentAssignedTop2: (top2Count / studentsWithPrefs) * 100
        };
}