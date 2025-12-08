import { describe, it, expect } from 'vitest';
import { computeGroupsAnalytics, type ComputeGroupsAnalyticsInput } from './computeGroupsAnalytics';
import type { Group, Preference } from '$lib/domain';

describe('computeGroupsAnalytics', () => {
	it('computes metrics from in-memory groups', () => {
		// Setup: 2 groups, 4 students, 2 with preferences
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'bob'] },
			{ id: 'group-2', name: 'Group 2', capacity: 2, memberIds: ['charlie', 'diana'] }
		];

		// Alice wants bob (got top choice), Charlie wants bob (didn't get)
		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'alice',
				programId: 'program-1',
				payload: { likeStudentIds: ['bob'] }
			},
			{
				id: 'pref-2',
				studentId: 'charlie',
				programId: 'program-1',
				payload: { likeStudentIds: ['bob'] }
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
		// Alice got bob (top choice), Charlie didn't get bob
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

	it('handles multiple friend choices correctly', () => {
		// Alice wants [bob, charlie, diana] in order
		// Alice is in group with charlie (2nd choice)
		const groups: Group[] = [
			{ id: 'group-1', name: 'Group 1', capacity: 2, memberIds: ['alice', 'charlie'] },
			{ id: 'group-2', name: 'Group 2', capacity: 2, memberIds: ['bob', 'diana'] }
		];

		const preferences: Preference[] = [
			{
				id: 'pref-1',
				studentId: 'alice',
				programId: 'program-1',
				payload: { likeStudentIds: ['bob', 'charlie', 'diana'] }
			}
		];

		const result = computeGroupsAnalytics({
			groups,
			preferences,
			participantSnapshot: ['alice', 'bob', 'charlie', 'diana']
		});

		// Alice got 2nd choice, so:
		// - Top choice: 0%
		// - Top 2: 100%
		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(100);
	});

	it('calculates average rank correctly', () => {
		// Student A got rank 1 (top choice)
		// Student B got rank 2 (second choice)
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
				payload: { likeStudentIds: ['bob', 'charlie'] } // Got top choice (bob)
			},
			{
				id: 'pref-2',
				studentId: 'charlie',
				programId: 'program-1',
				payload: { likeStudentIds: ['alice', 'diana'] } // Got 2nd choice (diana)
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
				payload: { likeStudentIds: ['alice'] }
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
