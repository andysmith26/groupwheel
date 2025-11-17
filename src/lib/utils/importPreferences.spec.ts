import { describe, it, expect } from 'vitest';
import { buildRosterIndex, buildGroupIndex, importPreferences, type RawSheetRow, type PreferenceMappingConfig } from './importPreferences';
import type { Student, Group } from '$lib/types';

describe('importPreferences', () => {
        // Helper to build simple roster and group indexes
        const students: Student[] = [
                { id: 'alice@example.com', firstName: 'Alice', lastName: 'Anderson', gender: '' },
                { id: 'bob@example.com', firstName: 'Bob', lastName: 'Brown', gender: '' },
                { id: 'carol@example.com', firstName: 'Carol', lastName: 'Clark', gender: '' }
        ];
        const groups: Group[] = [
                { id: 'group-1', name: 'Group 1', capacity: null, memberIds: [] },
                { id: 'group-2', name: 'Group 2', capacity: null, memberIds: [] }
        ];
        const rosterIndex = buildRosterIndex(students);
        const groupIndex = buildGroupIndex(groups);

        it('maps simple like preferences by id', () => {
                const rows: RawSheetRow[] = [
                        {
                                subject: 'alice@example.com',
                                friend1: 'bob@example.com'
                        }
                ];
                const mapping: PreferenceMappingConfig = {
                        subjectColumn: 'subject',
                        subjectKeyKind: 'id',
                        likeStudentColumns: ['friend1'],
                        avoidStudentColumns: [],
                        likeGroupColumns: [],
                        avoidGroupColumns: [],
                        metaColumns: {}
                };
                const result = importPreferences(rows, rosterIndex, groupIndex, mapping);
                expect(result.warnings).toEqual([]);
                expect(result.preferences.length).toBe(1);
                const pref = result.preferences[0];
                expect(pref.studentId).toBe('alice@example.com');
                expect(pref.likeStudentIds).toEqual(['bob@example.com']);
                expect(pref.avoidStudentIds).toEqual([]);
                expect(pref.likeGroupIds).toEqual([]);
                expect(pref.avoidGroupIds).toEqual([]);
        });

        it('resolves students by display name and handles duplicates and unknowns', () => {
                const rows: RawSheetRow[] = [
                        {
                                subject: 'Alice Anderson',
                                first: 'Bob Brown',
                                second: 'Unknown Student'
                        }
                ];
                        const mapping: PreferenceMappingConfig = {
                                subjectColumn: 'subject',
                                subjectKeyKind: 'displayName',
                                likeStudentColumns: ['first', 'second'],
                                avoidStudentColumns: [],
                                likeGroupColumns: [],
                                avoidGroupColumns: [],
                                metaColumns: {}
                        };
                const result = importPreferences(rows, rosterIndex, groupIndex, mapping);
                // Should warn about unknown student
                expect(result.warnings.length).toBe(1);
                expect(result.warnings[0].column).toBe('second');
                // Duplicate names should not duplicate entries
                const pref = result.preferences[0];
                expect(pref.likeStudentIds).toEqual(['bob@example.com']);
        });

        it('maps group preferences and avoid lists', () => {
                const rows: RawSheetRow[] = [
                        {
                                subject: 'bob@example.com',
                                like1: 'Group 1',
                                like2: 'group-2',
                                avoid1: 'Group 2',
                                avoid2: 'Missing'
                        }
                ];
                const mapping: PreferenceMappingConfig = {
                        subjectColumn: 'subject',
                        subjectKeyKind: 'id',
                        likeStudentColumns: [],
                        avoidStudentColumns: [],
                        likeGroupColumns: ['like1', 'like2'],
                        avoidGroupColumns: ['avoid1', 'avoid2'],
                        metaColumns: {}
                };
                const result = importPreferences(rows, rosterIndex, groupIndex, mapping);
                // One warning for the unknown group 'Missing'
                expect(result.warnings.length).toBe(1);
                expect(result.warnings[0].column).toBe('avoid2');
                const pref = result.preferences[0];
                // likeGroupIds should resolve names and ids equivalently
                expect(pref.likeGroupIds).toEqual(['group-1', 'group-2']);
                // avoidGroupIds should include only the known group-2 once
                expect(pref.avoidGroupIds).toEqual(['group-2']);
        });

        it('parses meta values with correct types', () => {
                const rows: RawSheetRow[] = [
                        {
                                subject: 'carol@example.com',
                                wantsFriend: 'yes',
                                groupSize: '3',
                                notes: 'Enjoys math'
                        }
                ];
                const mapping: PreferenceMappingConfig = {
                        subjectColumn: 'subject',
                        subjectKeyKind: 'id',
                        likeStudentColumns: [],
                        avoidStudentColumns: [],
                        likeGroupColumns: [],
                        avoidGroupColumns: [],
                        metaColumns: {
                                wantsAtLeastOneFriend: { column: 'wantsFriend', type: 'boolean' },
                                preferredGroupSize: { column: 'groupSize', type: 'number' },
                                notes: { column: 'notes', type: 'string' }
                        }
                };
                const result = importPreferences(rows, rosterIndex, groupIndex, mapping);
                expect(result.warnings).toEqual([]);
                const pref = result.preferences[0];
                expect(pref.meta).toEqual({
                        wantsAtLeastOneFriend: true,
                        preferredGroupSize: 3,
                        notes: 'Enjoys math'
                });
        });
});
