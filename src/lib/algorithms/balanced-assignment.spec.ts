import { describe, expect, it } from 'vitest';
import { assignBalanced } from './balanced-assignment';
import type { AssignmentOptions } from './types';
import type { Group, Student, StudentPreference } from '$lib/domain';

function buildOptions(
	groups: Group[],
	students: Student[],
	preferences: StudentPreference[],
	order: string[],
	overrides: Partial<AssignmentOptions> = {}
): AssignmentOptions {
	const studentsById = Object.fromEntries(students.map((s) => [s.id, s]));
	const preferencesById = Object.fromEntries(preferences.map((p) => [p.studentId, p]));
	return {
		groups,
		studentOrder: order,
		studentsById,
		preferencesById,
		...overrides
	};
}

describe('assignBalanced', () => {
	it('distributes students evenly across groups', () => {
		const groups: Group[] = [
			{ id: 'g1', name: 'Group 1', capacity: 2, memberIds: [] },
			{ id: 'g2', name: 'Group 2', capacity: 2, memberIds: [] }
		];
		const students: Student[] = [
			{ id: 'a', firstName: 'A' },
			{ id: 'b', firstName: 'B' },
			{ id: 'c', firstName: 'C' },
			{ id: 'd', firstName: 'D' }
		];
		const preferences: StudentPreference[] = [
			{
				studentId: 'a',
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			},
			{
				studentId: 'b',
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			},
			{
				studentId: 'c',
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			},
			{
				studentId: 'd',
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			}
		];

		const result = assignBalanced(
			buildOptions(
				groups,
				students,
				preferences,
				students.map((s) => s.id)
			)
		);

		// All students should be assigned
		const totalAssigned = result.groups.reduce((sum, group) => sum + group.memberIds.length, 0);
		expect(totalAssigned).toBe(4);
		expect(result.unassignedStudentIds).toHaveLength(0);

		// Groups should be balanced (2 each)
		expect(result.groups[0].memberIds.length).toBe(2);
		expect(result.groups[1].memberIds.length).toBe(2);
	});

	it('honors capacity limits and reports unassigned students', () => {
		const groups: Group[] = [{ id: 'g1', name: 'Only Group', capacity: 2, memberIds: [] }];
		const students: Student[] = [
			{ id: 'a', firstName: 'A' },
			{ id: 'b', firstName: 'B' },
			{ id: 'c', firstName: 'C' }
		];
		const preferences: StudentPreference[] = students.map((student) => ({
			studentId: student.id,
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		}));

		const result = assignBalanced(
			buildOptions(
				groups,
				students,
				preferences,
				students.map((s) => s.id)
			)
		);

		const totalAssigned = result.groups.reduce((sum, group) => sum + group.memberIds.length, 0);

		expect(totalAssigned).toBe(2);
		expect(result.unassignedStudentIds).toHaveLength(1);
		expect(result.unassignedStudentIds[0]).toBeDefined();
	});

	it('produces deterministic results with the same seed', () => {
		const groups: Group[] = [
			{ id: 'g1', name: 'Group 1', capacity: 2, memberIds: [] },
			{ id: 'g2', name: 'Group 2', capacity: 2, memberIds: [] }
		];
		const students: Student[] = [
			{ id: 'a', firstName: 'A' },
			{ id: 'b', firstName: 'B' },
			{ id: 'c', firstName: 'C' },
			{ id: 'd', firstName: 'D' }
		];
		const preferences: StudentPreference[] = students.map((student) => ({
			studentId: student.id,
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		}));

		const result1 = assignBalanced(
			buildOptions(groups, students, preferences, students.map((s) => s.id), { seed: 42 })
		);
		const result2 = assignBalanced(
			buildOptions(groups, students, preferences, students.map((s) => s.id), { seed: 42 })
		);

		// Same seed should produce same assignment
		expect(result1.groups[0].memberIds).toEqual(result2.groups[0].memberIds);
		expect(result1.groups[1].memberIds).toEqual(result2.groups[1].memberIds);
	});
});
