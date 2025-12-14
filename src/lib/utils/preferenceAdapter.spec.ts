import { describe, expect, it } from 'vitest';
import type { Preference } from '$lib/domain';
import { buildPreferenceMap } from './preferenceAdapter';

describe('buildPreferenceMap', () => {
	it('maps studentId to StudentPreference payload', () => {
		const preferences: Preference[] = [
			{
				id: 'p1',
				programId: 'prog-1',
				studentId: 's1',
				payload: {
					studentId: 's1',
					avoidStudentIds: [],
					likeGroupIds: ['g1'],
					avoidGroupIds: []
				}
			},
			{
				id: 'p2',
				programId: 'prog-1',
				studentId: 's2',
				payload: { unexpected: true }
			}
		];

		const map = buildPreferenceMap(preferences);

		expect(map.s1.studentId).toBe('s1');
		expect(map.s1.likeGroupIds).toEqual(['g1']);
		expect(map.s2.studentId).toBe('s2');
		expect(map.s2.likeGroupIds).toEqual([]);
	});
});
