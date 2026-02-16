import { describe, expect, it } from 'vitest';
import type { Group } from '$lib/domain';
import { testProgram, testStudents } from '$lib/test-utils/fixtures';
import { prepareWorkspaceExport } from './prepare-workspace-export';

describe('prepareWorkspaceExport', () => {
	it('returns columns TSV and activity export data in display order', () => {
		const groups: Group[] = [
			{
				id: 'grp-1',
				name: 'Group One',
				capacity: 4,
				memberIds: ['stu-2', 'stu-1']
			},
			{
				id: 'grp-2',
				name: 'Group Two',
				capacity: 4,
				memberIds: ['stu-3']
			}
		];

		const result = prepareWorkspaceExport({
			program: testProgram,
			students: testStudents,
			preferences: [
				{
					id: 'pref-1',
					programId: testProgram.id,
					studentId: 'stu-1',
					payload: {
						studentId: 'stu-1',
						likeGroupIds: ['grp-2'],
						avoidStudentIds: ['stu-3'],
						avoidGroupIds: []
					}
				}
			],
			groups,
			algorithmConfig: { strategy: 'balanced' },
			rowLayout: {
				top: ['grp-2'],
				bottom: ['grp-1']
			},
			exportedAtIso: '2026-02-16T12:00:00.000Z'
		});

		if (result.status !== 'ok') {
			throw new Error('Expected ok result');
		}

		expect(result.value.columnsTsv.split('\n')[0]).toBe('Group Two\tGroup One');
		expect(result.value.activityExportData.exportedAt).toBe('2026-02-16T12:00:00.000Z');
		expect(result.value.activityExportData.scenario?.groups.map((group) => group.id)).toEqual([
			'grp-2',
			'grp-1'
		]);
		expect(result.value.activityExportData.preferences[0]).toEqual({
			studentId: 'stu-1',
			likeGroupIds: ['grp-2'],
			avoidStudentIds: ['stu-3'],
			avoidGroupIds: []
		});
	});

	it('returns missing_entities when group members are not in roster', () => {
		const result = prepareWorkspaceExport({
			program: testProgram,
			students: testStudents,
			preferences: [],
			groups: [
				{
					id: 'grp-1',
					name: 'Group One',
					capacity: 4,
					memberIds: ['unknown-student']
				}
			],
			rowLayout: null
		});

		expect(result.status).toBe('err');
		if (result.status !== 'err') return;
		expect(result.error.type).toBe('missing_entities');
	});
});
