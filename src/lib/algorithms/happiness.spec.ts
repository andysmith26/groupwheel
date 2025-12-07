import { describe, expect, it } from 'vitest';
import type { Group, Student, StudentPreference } from '$lib/domain';
import {
	neighborsHappinessImpact,
	studentHappinessForMembers,
	studentHappinessInGroups
} from './happiness';
import type { HappinessContext } from './types';

const students: Record<string, Student> = {
	a: { id: 'a', firstName: 'A' },
	b: { id: 'b', firstName: 'B' },
	c: { id: 'c', firstName: 'C' }
};

const preferences: Record<string, StudentPreference> = {
	a: {
		studentId: 'a',
		likeStudentIds: ['b', 'c'],
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	},
	b: {
		studentId: 'b',
		likeStudentIds: ['a'],
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	},
	c: {
		studentId: 'c',
		likeStudentIds: [],
		avoidStudentIds: [],
		likeGroupIds: [],
		avoidGroupIds: []
	}
};

const context: HappinessContext = {
	preferencesById: preferences,
	studentsById: students
};

describe('happiness utilities', () => {
	it('counts how many liked friends are present in the group', () => {
		const happiness = studentHappinessForMembers('a', ['a', 'b'], context);
		expect(happiness).toBe(1);
	});

	it('returns zero when student is not assigned to any group', () => {
		const groups: Group[] = [
			{ id: 'g1', name: 'G1', capacity: 3, memberIds: ['b', 'c'] },
			{ id: 'g2', name: 'G2', capacity: 3, memberIds: [] }
		];
		expect(studentHappinessInGroups('a', groups, context)).toBe(0);
	});

	it('measures neighbor impact for a moved student', () => {
		const members = ['a', 'b', 'c'];
		const impact = neighborsHappinessImpact(members, 'a', context);
		expect(impact).toBeGreaterThan(0);
	});
});
