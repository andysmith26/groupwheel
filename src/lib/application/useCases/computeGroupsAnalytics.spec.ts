import { describe, it, expect } from 'vitest';
import { computeGroupsAnalytics } from './computeGroupsAnalytics';
import type { Group, Preference } from '$lib/domain';

describe('computeGroupsAnalytics', () => {
	it('computes metrics from in-memory groups', () => {
		// Setup: 2 groups, 4 students, 2 with group preferences
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'bob'] },
			{ id: 'group-2', name: 'Group 2', capacity: 2, memberIds: ['charlie', 'diana'] }
		];

		// Alice wants group-1 (got top choice), Charlie wants group-1 (didn't get)
		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'alice',
				programId: 'program-1',
				payload: { likeGroupIds: ['group-1'] }
			},
			{
				id: 'pref-2',
				studentId: 'charlie',
				programId: 'program-1',
				payload: { likeGroupIds: ['group-1'] }
			}
		];

		const participantSnapshot = ['alice', 'bob', 'charlie', 'diana'];

		// Act
		const result = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot
		});

		// Assert
		expect(result).toBeDefined();
		// Alice got group-1 (top choice), Charlie didn't get group-1
		// So 1 out of 2 students with preferences got their top choice = 50%
		expect(result.percentAssignedTopChoice).toBe(50);
	});

	it('returns zero metrics when no preferences exist', () => {
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'bob'] }
		];

		const result = computeGroupsAnalytics({
			groups,
			preferences: [],
			participantSnapshot: ['alice', 'bob']
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(0);
	});

	it('handles multiple group choices correctly', () => {
		// Alice wants [group-2, group-1] in order
		// Alice is in group-1 (2nd choice)
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'charlie'] },
			{ id: 'group-2', name: 'Group 2', capacity: 2, memberIds: ['bob', 'diana'] }
		];

		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'alice',
				programId: 'program-1',
				payload: { likeGroupIds: ['group-2', 'group-1'] }
			}
		];

		const result = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot: ['alice', 'bob', 'charlie', 'diana']
		});

		// Alice got 2nd choice group, so:
		// - Top choice: 0%
		// - Top 2: 100%
		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(100);
	});

	it('calculates average rank correctly', () => {
		// Student A got rank 1 (top choice group)
		// Student B got rank 2 (second choice group)
		// Average = 1.5
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'bob'] },
			{ id: 'group-2', name: 'Group 2', capacity: 2, memberIds: ['charlie', 'diana'] }
		];

		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'alice',
				programId: 'program-1',
				payload: { likeGroupIds: ['group-1', 'group-2'] } // Got top choice (group-1)
			},
			{
				id: 'pref-2',
				studentId: 'charlie',
				programId: 'program-1',
				payload: { likeGroupIds: ['group-1', 'group-2'] } // Got 2nd choice (group-2)
			}
		];

		const result = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot: ['alice', 'bob', 'charlie', 'diana']
		});

		// Alice: rank 1, Charlie: rank 2 => average = 1.5
		expect(result.averagePreferenceRankAssigned).toBe(1.5);
	});

	it('handles students not in any group', () => {
		// Student with preference is not in any group
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'bob'] }
		];

		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'charlie', // Not in any group
				programId: 'program-1',
				payload: { likeGroupIds: ['group-1'] }
			}
		];

		const result = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot: ['alice', 'bob', 'charlie']
		});

		// Charlie's preference shouldn't count since they're not assigned
		expect(result.percentAssignedTopChoice).toBe(0);
		expect(isNaN(result.averagePreferenceRankAssigned)).toBe(true);
	});

	it('handles empty groups array', () => {
		const result = computeGroupsAnalytics({
			groups: [],
			preferences: [],
			participantSnapshot: []
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(0);
	});
});
