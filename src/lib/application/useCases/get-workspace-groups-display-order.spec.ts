import { describe, expect, it } from 'vitest';
import { testGroups } from '$lib/test-utils/fixtures';
import { getWorkspaceGroupsDisplayOrder } from './get-workspace-groups-display-order';

describe('getWorkspaceGroupsDisplayOrder', () => {
	it('returns groups in row display order (top then bottom)', () => {
		const result = getWorkspaceGroupsDisplayOrder({
			groups: testGroups,
			rowLayout: {
				top: ['grp-3'],
				bottom: ['grp-1', 'grp-2']
			}
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.groups.map((group) => group.id)).toEqual(['grp-3', 'grp-1', 'grp-2']);
	});

	it('appends groups that are missing from row layout', () => {
		const result = getWorkspaceGroupsDisplayOrder({
			groups: testGroups,
			rowLayout: {
				top: ['grp-2'],
				bottom: []
			}
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.groups.map((group) => group.id)).toEqual(['grp-2', 'grp-1', 'grp-3']);
	});

	it('falls back to input group order when layout is null', () => {
		const result = getWorkspaceGroupsDisplayOrder({
			groups: testGroups,
			rowLayout: null
		});

			if (result.status !== 'ok') {
				throw new Error('Expected ok result');
			}

		expect(result.value.groups.map((group) => group.id)).toEqual(testGroups.map((group) => group.id));
	});
});
