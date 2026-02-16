import { describe, expect, it } from 'vitest';
import { testGroups } from '$lib/test-utils/fixtures';
import {
	computeInitialWorkspaceRowLayout,
	normalizeWorkspaceRowLayout,
	normalizeWorkspaceRowLayoutFromConfig,
	parseWorkspaceRowLayoutFromConfig,
	updateWorkspaceRowLayoutInConfig,
	workspaceRowLayoutEquals
} from './normalize-workspace-row-layout';

describe('normalizeWorkspaceRowLayout', () => {
	it('parses valid row layout from config', () => {
		const parsed = parseWorkspaceRowLayoutFromConfig({
			workspace: {
				rowLayout: {
					top: ['grp-1'],
					bottom: ['grp-2', 'grp-3']
				}
			}
		});

		expect(parsed).toEqual({ top: ['grp-1'], bottom: ['grp-2', 'grp-3'] });
	});

	it('computes initial layout by placing larger groups in bottom row', () => {
		const groups = [
			{ ...testGroups[0], memberIds: ['stu-1'] },
			{ ...testGroups[1], memberIds: ['stu-2', 'stu-3', 'stu-4'] },
			{ ...testGroups[2], memberIds: ['stu-5', 'stu-6'] }
		];

		const layout = computeInitialWorkspaceRowLayout(groups);
		expect(layout).toEqual({
			top: ['grp-1'],
			bottom: ['grp-2', 'grp-3']
		});
	});

	it('normalizes duplicates/unknown ids and appends missing groups', () => {
		const normalized = normalizeWorkspaceRowLayout(
			{
				top: ['grp-1', 'grp-1', 'unknown'],
				bottom: ['grp-3']
			},
			testGroups
		);

		expect(normalized).toEqual({
			top: ['grp-1'],
			bottom: ['grp-3', 'grp-2']
		});
	});

	it('repairs one-row-only layouts back to initial two-row strategy', () => {
		const groups = [
			{ ...testGroups[0], memberIds: ['stu-1'] },
			{ ...testGroups[1], memberIds: ['stu-2', 'stu-3', 'stu-4'] },
			{ ...testGroups[2], memberIds: ['stu-5', 'stu-6'] }
		];

		const normalized = normalizeWorkspaceRowLayout(
			{
				top: [],
				bottom: ['grp-1', 'grp-2', 'grp-3']
			},
			groups
		);

		expect(normalized).toEqual({
			top: ['grp-1'],
			bottom: ['grp-2', 'grp-3']
		});
	});

	it('returns config update decision and next config payload', () => {
		const result = normalizeWorkspaceRowLayoutFromConfig({
			groups: testGroups,
			algorithmConfig: {
				workspace: {
					rowLayout: {
						top: ['grp-1'],
						bottom: ['grp-2']
					}
				}
			}
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.value.shouldPersistConfig).toBe(true);
			expect(result.value.rowLayout).toEqual({
				top: ['grp-1'],
				bottom: ['grp-2', 'grp-3']
			});
			expect(result.value.nextAlgorithmConfig).toEqual(
				updateWorkspaceRowLayoutInConfig(
					{
						workspace: {
							rowLayout: {
								top: ['grp-1'],
								bottom: ['grp-2']
							}
						}
					},
					{ top: ['grp-1'], bottom: ['grp-2', 'grp-3'] }
				)
			);
		}
	});

	it('compares equality by exact ordering in both rows', () => {
		expect(
			workspaceRowLayoutEquals(
				{ top: ['grp-1'], bottom: ['grp-2', 'grp-3'] },
				{ top: ['grp-1'], bottom: ['grp-2', 'grp-3'] }
			)
		).toBe(true);
		expect(
			workspaceRowLayoutEquals(
				{ top: ['grp-1'], bottom: ['grp-2', 'grp-3'] },
				{ top: ['grp-1'], bottom: ['grp-3', 'grp-2'] }
			)
		).toBe(false);
	});
});
