import { describe, expect, it } from 'vitest';
import { computeScenarioSatisfaction } from './analytics';
import type { Scenario } from './scenario';
import type { Preference } from './preference';

function createPreference(
	studentId: string,
	programId: string,
	likeGroupIds: string[]
): Preference {
	return {
		id: `pref-${studentId}`,
		programId,
		studentId,
		payload: { likeGroupIds }
	};
}

function createTestScenario(
	groups: Array<{ id: string; name: string; memberIds: string[] }>
): Scenario {
	return {
		id: 's1',
		programId: 'p1',
		groups: groups.map((g) => ({ ...g, capacity: g.memberIds.length })),
		participantSnapshot: groups.flatMap((g) => g.memberIds),
		status: 'DRAFT',
		createdAt: new Date()
	};
}

describe('computeScenarioSatisfaction', () => {
	it('returns 100% when all students get top choice group', () => {
		const scenario = createTestScenario([
			{ id: 'g1', name: 'G1', memberIds: ['a', 'b'] },
			{ id: 'g2', name: 'G2', memberIds: ['c', 'd'] }
		]);

		// Each student got their first choice group
		const preferences = [
			createPreference('a', 'p1', ['g1', 'g2']), // got g1, their top choice
			createPreference('b', 'p1', ['g1']), // got g1, their top choice
			createPreference('c', 'p1', ['g2', 'g1']), // got g2, their top choice
			createPreference('d', 'p1', ['g2']) // got g2, their top choice
		];

		const result = computeScenarioSatisfaction({
			scenario,
			preferences,
			students: []
		});

		expect(result.percentAssignedTopChoice).toBe(100);
		expect(result.averagePreferenceRankAssigned).toBe(1);
	});

	it('handles students with no preferences', () => {
		const scenario = createTestScenario([{ id: 'g1', name: 'G1', memberIds: ['a', 'b'] }]);

		const result = computeScenarioSatisfaction({
			scenario,
			preferences: [],
			students: []
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.averagePreferenceRankAssigned).toBeNaN();
	});

	it('calculates partial satisfaction correctly', () => {
		const scenario = createTestScenario([
			{ id: 'g1', name: 'G1', memberIds: ['a'] },
			{ id: 'g2', name: 'G2', memberIds: ['b'] }
		]);

		// a got g1 but wanted g2 first, g1 second
		// b got g2 but wanted g1 first, g2 second
		const preferences = [
			createPreference('a', 'p1', ['g2', 'g1']), // got g1, their 2nd choice
			createPreference('b', 'p1', ['g1', 'g2']) // got g2, their 2nd choice
		];

		const result = computeScenarioSatisfaction({
			scenario,
			preferences,
			students: []
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(100);
		expect(result.averagePreferenceRankAssigned).toBe(2);
	});

	it('handles students not in scenario gracefully', () => {
		const scenario = createTestScenario([{ id: 'g1', name: 'G1', memberIds: ['a', 'b'] }]);

		// 'x' is not in the scenario, should be skipped
		const preferences = [
			createPreference('a', 'p1', ['g1']), // got their top choice
			createPreference('x', 'p1', ['g1']) // not in scenario
		];

		const result = computeScenarioSatisfaction({
			scenario,
			preferences,
			students: []
		});

		expect(result.percentAssignedTopChoice).toBe(100);
		expect(result.averagePreferenceRankAssigned).toBe(1);
	});

	it('handles empty group choice lists in preferences', () => {
		const scenario = createTestScenario([{ id: 'g1', name: 'G1', memberIds: ['a', 'b'] }]);

		// 'a' has no group choices, 'b' got their choice
		const preferences = [
			createPreference('a', 'p1', []), // no preferences
			createPreference('b', 'p1', ['g1']) // got their top choice
		];

		const result = computeScenarioSatisfaction({
			scenario,
			preferences,
			students: []
		});

		// Only 'b' has preferences and got their top choice
		expect(result.percentAssignedTopChoice).toBe(100);
		expect(result.studentsWithNoPreferences).toBe(1);
	});

	it('calculates correct rank when not assigned to requested group', () => {
		const scenario = createTestScenario([
			{ id: 'g1', name: 'G1', memberIds: ['a'] },
			{ id: 'g2', name: 'G2', memberIds: ['b', 'c'] }
		]);

		// 'a' got g1 but wanted g2 then g3 (neither of which they got)
		const preferences = [createPreference('a', 'p1', ['g2', 'g3'])];

		const result = computeScenarioSatisfaction({
			scenario,
			preferences,
			students: []
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(0);
		expect(result.studentsUnassignedToRequest).toBe(1);
		// Average rank is 3 (beyond their 2 choices)
		expect(result.averagePreferenceRankAssigned).toBe(3);
	});
});
