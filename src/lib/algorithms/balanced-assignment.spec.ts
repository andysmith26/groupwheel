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
	describe('basic distribution', () => {
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
			const preferences: StudentPreference[] = students.map((student) => ({
				studentId: student.id,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			}));

			const result = assignBalanced(
				buildOptions(groups, students, preferences, students.map((s) => s.id))
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
				buildOptions(groups, students, preferences, students.map((s) => s.id))
			);

			const totalAssigned = result.groups.reduce((sum, group) => sum + group.memberIds.length, 0);
			expect(totalAssigned).toBe(2);
			expect(result.unassignedStudentIds).toHaveLength(1);
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

	describe('request-aware assignment', () => {
		it('assigns students to their first choice group when capacity allows', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 2, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [
				{ id: 'alice', firstName: 'Alice' },
				{ id: 'bob', firstName: 'Bob' }
			];
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['Art Club'], // Alice wants Art Club
					avoidGroupIds: []
				},
				{
					studentId: 'bob',
					avoidStudentIds: [],
					likeGroupIds: ['Music Club'], // Bob wants Music Club
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice', 'bob'], { seed: 123 })
			);

			// Both should get their first choice
			const artClub = result.groups.find((g) => g.name === 'Art Club');
			const musicClub = result.groups.find((g) => g.name === 'Music Club');

			expect(artClub?.memberIds).toContain('alice');
			expect(musicClub?.memberIds).toContain('bob');
		});

		it('matches groups by ID as well as name', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 2, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [{ id: 'alice', firstName: 'Alice' }];
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['g2'], // Using ID instead of name
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice'], { seed: 123 })
			);

			const musicClub = result.groups.find((g) => g.id === 'g2');
			expect(musicClub?.memberIds).toContain('alice');
		});

		it('falls back to second choice when first choice is full', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 1, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [
				{ id: 'alice', firstName: 'Alice' },
				{ id: 'bob', firstName: 'Bob' }
			];
			// Both want Art Club first, but it only has capacity 1
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['Art Club', 'Music Club'],
					avoidGroupIds: []
				},
				{
					studentId: 'bob',
					avoidStudentIds: [],
					likeGroupIds: ['Art Club', 'Music Club'],
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice', 'bob'], { seed: 42 })
			);

			// One gets Art Club, one gets Music Club
			const artClub = result.groups.find((g) => g.name === 'Art Club');
			const musicClub = result.groups.find((g) => g.name === 'Music Club');

			expect(artClub?.memberIds).toHaveLength(1);
			expect(musicClub?.memberIds).toHaveLength(1);
			expect(result.unassignedStudentIds).toHaveLength(0);
		});

		it('assigns students without preferences using balanced distribution', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 2, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [
				{ id: 'alice', firstName: 'Alice' },
				{ id: 'bob', firstName: 'Bob' },
				{ id: 'carol', firstName: 'Carol' },
				{ id: 'dave', firstName: 'Dave' }
			];
			// Only Alice has a preference
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['Art Club'],
					avoidGroupIds: []
				},
				{
					studentId: 'bob',
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				},
				{
					studentId: 'carol',
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				},
				{
					studentId: 'dave',
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice', 'bob', 'carol', 'dave'], { seed: 42 })
			);

			// Alice should be in Art Club
			const artClub = result.groups.find((g) => g.name === 'Art Club');
			expect(artClub?.memberIds).toContain('alice');

			// All should be assigned
			expect(result.unassignedStudentIds).toHaveLength(0);

			// Groups should be balanced
			expect(result.groups[0].memberIds.length).toBe(2);
			expect(result.groups[1].memberIds.length).toBe(2);
		});

		it('handles case-insensitive group name matching', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 2, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [{ id: 'alice', firstName: 'Alice' }];
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['ART CLUB'], // Uppercase
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice'], { seed: 123 })
			);

			const artClub = result.groups.find((g) => g.name === 'Art Club');
			expect(artClub?.memberIds).toContain('alice');
		});

		it('handles students with unrecognized group choices', () => {
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 2, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 2, memberIds: [] }
			];
			const students: Student[] = [{ id: 'alice', firstName: 'Alice' }];
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['Drama Club', 'Chess Club'], // Non-existent groups
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice'], { seed: 123 })
			);

			// Alice should still be assigned (to balanced fallback)
			expect(result.unassignedStudentIds).toHaveLength(0);
			const totalAssigned = result.groups.reduce((sum, g) => sum + g.memberIds.length, 0);
			expect(totalAssigned).toBe(1);
		});

		it('prioritizes students with preferences over those without', () => {
			// Edge case: limited capacity, some students have prefs
			const groups: Group[] = [
				{ id: 'g1', name: 'Art Club', capacity: 1, memberIds: [] },
				{ id: 'g2', name: 'Music Club', capacity: 1, memberIds: [] }
			];
			const students: Student[] = [
				{ id: 'alice', firstName: 'Alice' },
				{ id: 'bob', firstName: 'Bob' },
				{ id: 'carol', firstName: 'Carol' }
			];
			// Only Alice has a strong preference
			const preferences: StudentPreference[] = [
				{
					studentId: 'alice',
					avoidStudentIds: [],
					likeGroupIds: ['Art Club'],
					avoidGroupIds: []
				},
				{
					studentId: 'bob',
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				},
				{
					studentId: 'carol',
					avoidStudentIds: [],
					likeGroupIds: [],
					avoidGroupIds: []
				}
			];

			const result = assignBalanced(
				buildOptions(groups, students, preferences, ['alice', 'bob', 'carol'], { seed: 42 })
			);

			// Alice should definitely get Art Club (her preference)
			const artClub = result.groups.find((g) => g.name === 'Art Club');
			expect(artClub?.memberIds).toContain('alice');

			// One student should be unassigned (only 2 spots total)
			expect(result.unassignedStudentIds).toHaveLength(1);
			// Alice should NOT be the unassigned one
			expect(result.unassignedStudentIds).not.toContain('alice');
		});
	});

	describe('edge cases', () => {
		it('handles empty student list', () => {
			const groups: Group[] = [{ id: 'g1', name: 'Group 1', capacity: 5, memberIds: [] }];

			const result = assignBalanced(buildOptions(groups, [], [], []));

			expect(result.groups[0].memberIds).toHaveLength(0);
			expect(result.unassignedStudentIds).toHaveLength(0);
		});

		it('handles groups with unlimited capacity', () => {
			const groups: Group[] = [{ id: 'g1', name: 'Group 1', capacity: null, memberIds: [] }];
			const students: Student[] = Array.from({ length: 10 }, (_, i) => ({
				id: `s${i}`,
				firstName: `Student ${i}`
			}));
			const preferences: StudentPreference[] = students.map((s) => ({
				studentId: s.id,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			}));

			const result = assignBalanced(
				buildOptions(groups, students, preferences, students.map((s) => s.id))
			);

			expect(result.groups[0].memberIds).toHaveLength(10);
			expect(result.unassignedStudentIds).toHaveLength(0);
		});
	});
});
