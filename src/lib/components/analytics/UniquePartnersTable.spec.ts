import { describe, it, expect } from 'vitest';
import type { PairingStat } from '$lib/application/useCases/getProgramPairingStats';

/**
 * Pure computation for unique partner counts — mirrors the logic
 * used in the activity detail page's derived computation.
 */
function computeUniquePartners(
	pairs: PairingStat[],
	studentCount: number
): Map<string, { name: string; uniquePartners: number; maxPossible: number }> {
	const partnerCounts = new Map<string, { name: string; count: number }>();

	for (const pair of pairs) {
		const a = partnerCounts.get(pair.studentAId) ?? { name: pair.studentAName, count: 0 };
		a.count++;
		partnerCounts.set(pair.studentAId, a);

		const b = partnerCounts.get(pair.studentBId) ?? { name: pair.studentBName, count: 0 };
		b.count++;
		partnerCounts.set(pair.studentBId, b);
	}

	const maxPossible = studentCount - 1;
	const result = new Map<string, { name: string; uniquePartners: number; maxPossible: number }>();
	for (const [id, { name, count }] of partnerCounts) {
		result.set(id, { name, uniquePartners: count, maxPossible });
	}
	return result;
}

describe('computeUniquePartners', () => {
	it('counts correctly from pairs', () => {
		const pairs: PairingStat[] = [
			{ studentAId: 'A', studentAName: 'Alice', studentBId: 'B', studentBName: 'Bob', count: 1 },
			{ studentAId: 'A', studentAName: 'Alice', studentBId: 'C', studentBName: 'Carol', count: 1 },
			{ studentAId: 'B', studentAName: 'Bob', studentBId: 'C', studentBName: 'Carol', count: 1 }
		];

		const result = computeUniquePartners(pairs, 3);

		expect(result.get('A')).toEqual({ name: 'Alice', uniquePartners: 2, maxPossible: 2 });
		expect(result.get('B')).toEqual({ name: 'Bob', uniquePartners: 2, maxPossible: 2 });
		expect(result.get('C')).toEqual({ name: 'Carol', uniquePartners: 2, maxPossible: 2 });
	});

	it('students with no pairings are absent from result', () => {
		// Only A and B have been paired; C has not appeared in any pairs
		const pairs: PairingStat[] = [
			{ studentAId: 'A', studentAName: 'Alice', studentBId: 'B', studentBName: 'Bob', count: 1 }
		];

		const result = computeUniquePartners(pairs, 3);

		expect(result.get('A')).toEqual({ name: 'Alice', uniquePartners: 1, maxPossible: 2 });
		expect(result.get('B')).toEqual({ name: 'Bob', uniquePartners: 1, maxPossible: 2 });
		expect(result.has('C')).toBe(false);
	});

	it('handles empty pairs', () => {
		const result = computeUniquePartners([], 5);
		expect(result.size).toBe(0);
	});

	it('correctly sets maxPossible based on student count', () => {
		const pairs: PairingStat[] = [
			{ studentAId: 'A', studentAName: 'Alice', studentBId: 'B', studentBName: 'Bob', count: 3 }
		];

		const result = computeUniquePartners(pairs, 10);

		expect(result.get('A')?.maxPossible).toBe(9);
		expect(result.get('B')?.maxPossible).toBe(9);
	});
});
