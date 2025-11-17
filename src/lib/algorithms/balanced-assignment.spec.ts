import { describe, expect, it } from 'vitest';
import { assignBalanced } from './balanced-assignment';
import type { AssignmentOptions } from './types';
import type { Group, Student } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';

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
        it('clusters mutual friends into the same group when capacity allows', () => {
                const groups: Group[] = [
                        { id: 'g1', name: 'Group 1', capacity: 2, memberIds: [] },
                        { id: 'g2', name: 'Group 2', capacity: 2, memberIds: [] }
                ];
                const students: Student[] = [
                        { id: 'a' },
                        { id: 'b' },
                        { id: 'c' },
                        { id: 'd' }
                ];
                const preferences: StudentPreference[] = [
                        { studentId: 'a', likeStudentIds: ['b'], avoidStudentIds: [], likeGroupIds: [], avoidGroupIds: [] },
                        { studentId: 'b', likeStudentIds: ['a'], avoidStudentIds: [], likeGroupIds: [], avoidGroupIds: [] },
                        { studentId: 'c', likeStudentIds: ['d'], avoidStudentIds: [], likeGroupIds: [], avoidGroupIds: [] },
                        { studentId: 'd', likeStudentIds: ['c'], avoidStudentIds: [], likeGroupIds: [], avoidGroupIds: [] }
                ];

                const result = assignBalanced(
                        buildOptions(groups, students, preferences, students.map((s) => s.id))
                );

                const hasAB = result.groups.some((group) =>
                        group.memberIds.includes('a') && group.memberIds.includes('b')
                );
                const hasCD = result.groups.some((group) =>
                        group.memberIds.includes('c') && group.memberIds.includes('d')
                );

                expect(hasAB).toBe(true);
                expect(hasCD).toBe(true);
                expect(result.unassignedStudentIds).toHaveLength(0);
        });

        it('honors capacity limits and reports unassigned students', () => {
                const groups: Group[] = [{ id: 'g1', name: 'Only Group', capacity: 2, memberIds: [] }];
                const students: Student[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
                const preferences: StudentPreference[] = students.map((student) => ({
                        studentId: student.id,
                        likeStudentIds: [],
                        avoidStudentIds: [],
                        likeGroupIds: [],
                        avoidGroupIds: []
                }));

                const result = assignBalanced(
                        buildOptions(groups, students, preferences, students.map((s) => s.id))
                );

                const totalAssigned = result.groups.reduce(
                        (sum, group) => sum + group.memberIds.length,
                        0
                );

                expect(totalAssigned).toBe(2);
                expect(result.unassignedStudentIds).toHaveLength(1);
                expect(result.unassignedStudentIds[0]).toBeDefined();
        });
});
