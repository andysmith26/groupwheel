import { describe, expect, it } from 'vitest';
import type { Preference } from '$lib/domain';
import { computeAnalyticsSync } from './computeAnalyticsSync';

function pref(studentId: string, likeStudentIds: string[]): Preference {
	return {
		id: `pref-${studentId}`,
		programId: 'prog-1',
		studentId,
		payload: { likeStudentIds }
	};
}

describe('computeAnalyticsSync', () => {
	it('calculates satisfaction metrics synchronously', () => {
		const result = computeAnalyticsSync({
			groups: [
				{ id: 'g1', name: 'G1', memberIds: ['a', 'b'], capacity: 2 },
				{ id: 'g2', name: 'G2', memberIds: ['c', 'd'], capacity: 2 }
			],
			preferences: [pref('a', ['b']), pref('b', ['a']), pref('c', ['d']), pref('d', ['c'])],
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
