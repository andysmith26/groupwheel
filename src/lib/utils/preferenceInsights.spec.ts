import { describe, expect, it } from 'vitest';
import { computePreferenceInsights, type SimplePreference } from './preferenceInsights';

describe('computePreferenceInsights', () => {
	it('returns null when no preferences provided', () => {
		expect(computePreferenceInsights([])).toBe(null);
	});

	it('calculates average friends correctly', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b', 'c'] },
			{ studentId: 'b', likeStudentIds: ['a'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.avgFriends).toBe('1.5');
	});

	it('calculates average friends as 0 when no friends listed', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: [] },
			{ studentId: 'b', likeStudentIds: [] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.avgFriends).toBe('0.0');
	});

	it('counts mutual friendships', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b'] },
			{ studentId: 'b', likeStudentIds: ['a'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.mutualCount).toBe(1);
	});

	it('counts multiple mutual friendships', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b', 'c'] },
			{ studentId: 'b', likeStudentIds: ['a', 'c'] },
			{ studentId: 'c', likeStudentIds: ['a', 'b'] }
		];
		const insights = computePreferenceInsights(prefs);
		// a<->b, a<->c, b<->c = 3 mutual friendships
		expect(insights?.mutualCount).toBe(3);
	});

	it('does not count one-way preferences as mutual', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b'] },
			{ studentId: 'b', likeStudentIds: ['c'] },
			{ studentId: 'c', likeStudentIds: ['a'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.mutualCount).toBe(0);
	});

	it('identifies low coverage when average friends < 1', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: [] },
			{ studentId: 'b', likeStudentIds: ['a'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.lowCoverage).toBe(true);
	});

	it('does not flag low coverage when average friends >= 1', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b'] },
			{ studentId: 'b', likeStudentIds: ['a'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.lowCoverage).toBe(false);
	});

	it('identifies no mutual preferences when more than 1 preference exists', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'a', likeStudentIds: ['b'] },
			{ studentId: 'b', likeStudentIds: ['c'] }
		];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.noMutual).toBe(true);
	});

	it('does not flag noMutual for single preference', () => {
		const prefs: SimplePreference[] = [{ studentId: 'a', likeStudentIds: ['b'] }];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.noMutual).toBe(false);
	});

	it('counts unknown references from warnings', () => {
		const prefs: SimplePreference[] = [{ studentId: 'a', likeStudentIds: ['b'] }];
		const warnings = [
			'Alice: listed "unknown1" who is not in roster',
			'Bob: listed "unknown2" who is not in roster',
			'Row 5: duplicate entry for "alice", using first'
		];
		const insights = computePreferenceInsights(prefs, warnings);
		expect(insights?.unknownRefs).toBe(2);
	});

	it('returns 0 unknown refs when no roster warnings', () => {
		const prefs: SimplePreference[] = [{ studentId: 'a', likeStudentIds: ['b'] }];
		const warnings = ['Row 5: duplicate entry for "alice", using first'];
		const insights = computePreferenceInsights(prefs, warnings);
		expect(insights?.unknownRefs).toBe(0);
	});

	it('handles empty warnings array', () => {
		const prefs: SimplePreference[] = [{ studentId: 'a', likeStudentIds: ['b'] }];
		const insights = computePreferenceInsights(prefs);
		expect(insights?.unknownRefs).toBe(0);
	});

	it('handles complex real-world scenario', () => {
		const prefs: SimplePreference[] = [
			{ studentId: 'alice', likeStudentIds: ['bob', 'carol'] },
			{ studentId: 'bob', likeStudentIds: ['alice', 'dave'] },
			{ studentId: 'carol', likeStudentIds: ['alice', 'eve'] },
			{ studentId: 'dave', likeStudentIds: ['bob'] },
			{ studentId: 'eve', likeStudentIds: ['carol'] }
		];
		const warnings = ['Frank: listed "unknown" who is not in roster'];

		const insights = computePreferenceInsights(prefs, warnings);

		// Average: (2 + 2 + 2 + 1 + 1) / 5 = 8/5 = 1.6
		expect(insights?.avgFriends).toBe('1.6');
		// Mutual: alice<->bob, alice<->carol, bob<->dave, carol<->eve = 4
		expect(insights?.mutualCount).toBe(4);
		expect(insights?.unknownRefs).toBe(1);
		expect(insights?.lowCoverage).toBe(false);
		expect(insights?.noMutual).toBe(false);
	});
});
