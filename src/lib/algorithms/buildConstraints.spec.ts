import { describe, it, expect } from 'vitest';
import {
	buildAvoidPairsFromPreferences,
	buildRecentGroupmatesMap,
	buildGroupingConstraints
} from './buildConstraints';
import type { Preference, Placement } from '$lib/domain';

function makePref(
	studentId: string,
	avoidStudentIds: string[] = [],
	likeGroupIds: string[] = []
): Preference {
	return {
		id: `pref-${studentId}`,
		programId: 'program-1',
		studentId,
		payload: {
			studentId,
			avoidStudentIds,
			likeGroupIds,
			avoidGroupIds: []
		}
	};
}

function makePlacement(
	studentId: string,
	groupId: string,
	sessionId: string,
	startDate: Date
): Placement {
	return {
		id: `placement-${studentId}-${sessionId}`,
		sessionId,
		studentId,
		groupId,
		groupName: `Group ${groupId}`,
		preferenceRank: null,
		assignedAt: startDate,
		startDate,
		type: 'INITIAL'
	};
}

describe('buildAvoidPairsFromPreferences', () => {
	it('should return empty array for no preferences', () => {
		expect(buildAvoidPairsFromPreferences([])).toEqual([]);
	});

	it('should extract avoid pairs from preferences', () => {
		const prefs = [makePref('alice', ['bob'])];
		const pairs = buildAvoidPairsFromPreferences(prefs);

		expect(pairs).toHaveLength(1);
		expect(pairs[0]).toContain('alice');
		expect(pairs[0]).toContain('bob');
	});

	it('should deduplicate symmetric pairs', () => {
		const prefs = [makePref('alice', ['bob']), makePref('bob', ['alice'])];
		const pairs = buildAvoidPairsFromPreferences(prefs);

		expect(pairs).toHaveLength(1);
	});

	it('should handle multiple avoid targets from one student', () => {
		const prefs = [makePref('alice', ['bob', 'carol', 'dave'])];
		const pairs = buildAvoidPairsFromPreferences(prefs);

		expect(pairs).toHaveLength(3);
	});

	it('should handle preferences with invalid payload gracefully', () => {
		const pref: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 'alice',
			payload: { invalid: 'data' }
		};
		const pairs = buildAvoidPairsFromPreferences([pref]);
		expect(pairs).toEqual([]);
	});
});

describe('buildRecentGroupmatesMap', () => {
	it('should return empty sets for no placements', () => {
		const result = buildRecentGroupmatesMap([], ['alice', 'bob']);

		expect(result.get('alice')?.size).toBe(0);
		expect(result.get('bob')?.size).toBe(0);
	});

	it('should build groupmates from same group', () => {
		const date = new Date('2024-09-01');
		const placements = [
			makePlacement('alice', 'g1', 'session-1', date),
			makePlacement('bob', 'g1', 'session-1', date),
			makePlacement('carol', 'g2', 'session-1', date)
		];

		const result = buildRecentGroupmatesMap(placements, ['alice', 'bob', 'carol']);

		expect(result.get('alice')?.has('bob')).toBe(true);
		expect(result.get('bob')?.has('alice')).toBe(true);
		expect(result.get('alice')?.has('carol')).toBe(false);
		expect(result.get('carol')?.has('alice')).toBe(false);
	});

	it('should only consider most recent session when limitToMostRecent is true', () => {
		const older = new Date('2024-01-01');
		const newer = new Date('2024-09-01');

		const placements = [
			makePlacement('alice', 'g1', 'session-old', older),
			makePlacement('bob', 'g1', 'session-old', older),
			makePlacement('alice', 'g2', 'session-new', newer),
			makePlacement('carol', 'g2', 'session-new', newer)
		];

		const result = buildRecentGroupmatesMap(placements, ['alice', 'bob', 'carol'], true);

		// Only session-new should be considered
		expect(result.get('alice')?.has('carol')).toBe(true);
		expect(result.get('alice')?.has('bob')).toBe(false);
	});

	it('should consider all sessions when limitToMostRecent is false', () => {
		const older = new Date('2024-01-01');
		const newer = new Date('2024-09-01');

		const placements = [
			makePlacement('alice', 'g1', 'session-old', older),
			makePlacement('bob', 'g1', 'session-old', older),
			makePlacement('alice', 'g2', 'session-new', newer),
			makePlacement('carol', 'g2', 'session-new', newer)
		];

		const result = buildRecentGroupmatesMap(placements, ['alice', 'bob', 'carol'], false);

		expect(result.get('alice')?.has('bob')).toBe(true);
		expect(result.get('alice')?.has('carol')).toBe(true);
	});
});

describe('buildGroupingConstraints', () => {
	it('should build constraints with avoid pairs', () => {
		const prefs = [makePref('alice', ['bob'])];
		const constraints = buildGroupingConstraints({
			preferences: prefs,
			placements: [],
			studentIds: ['alice', 'bob'],
			avoidRecentGroupmates: false
		});

		expect(constraints.avoidPairs).toHaveLength(1);
		expect(constraints.recentGroupmates).toBeUndefined();
	});

	it('should include recent groupmates when avoidRecentGroupmates is true', () => {
		const date = new Date('2024-09-01');
		const placements = [
			makePlacement('alice', 'g1', 'session-1', date),
			makePlacement('bob', 'g1', 'session-1', date)
		];

		const constraints = buildGroupingConstraints({
			preferences: [],
			placements,
			studentIds: ['alice', 'bob'],
			avoidRecentGroupmates: true
		});

		expect(constraints.recentGroupmates).toBeDefined();
		expect(constraints.recentGroupmates?.get('alice')?.has('bob')).toBe(true);
	});

	it('should set avoidPairs to undefined when no avoid preferences exist', () => {
		const constraints = buildGroupingConstraints({
			preferences: [],
			placements: [],
			studentIds: ['alice', 'bob'],
			avoidRecentGroupmates: false
		});

		expect(constraints.avoidPairs).toBeUndefined();
	});
});
