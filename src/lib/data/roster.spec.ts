import { describe, it, expect } from 'vitest';
import type { StudentPreference } from '$lib/domain';
import { ensurePreferences, parseSheetRows } from './roster';

describe('parseSheetRows', () => {
	it('parses student and connection rows while trimming values', () => {
		const students = [
			['ID', 'First', 'Last', 'Gender'],
			[' s1 ', 'Ada', 'Lovelace', 'F'],
			['s2', 'Alan', 'Turing', '']
		];
		const connections = [
			['Student', 'Friend 1', 'Friend 2'],
			['s1', 's2', '  '],
			['s2', 's1']
		];

		const result = parseSheetRows(students, connections);

		expect(result.students).toEqual([
			{ id: 's1', firstName: 'Ada', lastName: 'Lovelace', gender: 'F' },
			{ id: 's2', firstName: 'Alan', lastName: 'Turing', gender: '' }
		]);
		expect(result.connections).toEqual({
			s1: ['s2'],
			s2: ['s1']
		});
	});
});

describe('ensurePreferences', () => {
	it('fills in empty preference shells for students without responses', () => {
		const students = [
			{ id: 's1', firstName: 'Ada' },
			{ id: 's2', firstName: 'Alan' }
		];
		const preferences: StudentPreference[] = [
			{
				studentId: 's1',
				avoidStudentIds: [],
				likeGroupIds: ['g1'],
				avoidGroupIds: []
			}
		];

		const map = ensurePreferences(students, preferences);

		expect(Object.keys(map)).toEqual(['s1', 's2']);
		expect(map.s1.likeGroupIds).toEqual(['g1']);
		expect(map.s2).toEqual({
			studentId: 's2',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: [],
			meta: {}
		});
	});
});
