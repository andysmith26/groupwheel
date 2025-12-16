import { describe, expect, it } from 'vitest';
import type { Preference } from '$lib/domain';
import { computeAnalyticsSync } from './computeAnalyticsSync';

function pref(studentId: string, likeGroupIds: string[]): Preference {
	return {
		id: `pref-${studentId}`,
		programId: 'prog-1',
		studentId,
		payload: { likeGroupIds }
	};
}

describe('computeAnalyticsSync', () => {
	it('calculates satisfaction metrics synchronously', () => {
		const result = computeAnalyticsSync({
			groups: [
				{ id: 'g1', name: 'G1', memberIds: ['a', 'b'], capacity: 2 },
				{ id: 'g2', name: 'G2', memberIds: ['c', 'd'], capacity: 2 }
			],
			// Each student got their first choice group
			preferences: [pref('a', ['g1']), pref('b', ['g1']), pref('c', ['g2']), pref('d', ['g2'])],
			participantSnapshot: ['a', 'b', 'c', 'd']
		});

		expect(result.percentAssignedTopChoice).toBe(100);
		expect(result.percentAssignedTop2).toBe(100);
		expect(result.averagePreferenceRankAssigned).toBe(1);
	});

	it('returns empty metrics when no preferences exist', () => {
		const result = computeAnalyticsSync({
			groups: [{ id: 'g1', name: 'G1', memberIds: ['a', 'b'], capacity: 2 }],
			preferences: [],
			participantSnapshot: ['a', 'b']
		});

		expect(result.percentAssignedTopChoice).toBe(0);
		expect(result.percentAssignedTop2).toBe(0);
		expect(result.averagePreferenceRankAssigned).toBeNaN();
	});
});
