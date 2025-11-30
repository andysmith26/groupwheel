import { describe, expect, it } from 'vitest';
import { computeScenarioSatisfaction } from './analytics';
import type { Scenario } from './scenario';
import type { Preference } from './preference';

function createPreference(studentId: string, programId: string, likeStudentIds: string[]): Preference {
        return {
                id: `pref-${studentId}`,
                programId,
                studentId,
                payload: { likeStudentIds }
        };
}

function createTestScenario(groups: Array<{ id: string; name: string; memberIds: string[] }>): Scenario {
        return {
                id: 's1',
                programId: 'p1',
                groups: groups.map((g) => ({ ...g, capacity: g.memberIds.length })),
                participantSnapshot: groups.flatMap((g) => g.memberIds),
                status: 'DRAFT',
                createdAt: new Date()
        };
}

describe('computeScenarioSatisfaction', () => {
        it('returns 100% when all students get top choice', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'b'] },
                        { id: 'g2', name: 'G2', memberIds: ['c', 'd'] }
                ]);

                const preferences = [
                        createPreference('a', 'p1', ['b']),
                        createPreference('b', 'p1', ['a']),
                        createPreference('c', 'p1', ['d']),
                        createPreference('d', 'p1', ['c'])
                ];

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences,
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(100);
                expect(result.averagePreferenceRankAssigned).toBe(1);
        });

        it('handles students with no preferences', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'b'] }
                ]);

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences: [],
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(0);
                expect(result.averagePreferenceRankAssigned).toBeNaN();
        });

        it('calculates partial satisfaction correctly', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'c'] },
                        { id: 'g2', name: 'G2', memberIds: ['b', 'd'] }
                ]);

                const preferences = [
                        createPreference('a', 'p1', ['b', 'c']),
                        createPreference('b', 'p1', ['a', 'd'])
                ];

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences,
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(0);
                expect(result.percentAssignedTop2).toBe(100);
                expect(result.averagePreferenceRankAssigned).toBe(2);
        });

        it('handles students not in scenario gracefully', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'b'] }
                ]);

                const preferences = [
                        createPreference('a', 'p1', ['b']),
                        createPreference('x', 'p1', ['a'])
                ];

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences,
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(100);
                expect(result.averagePreferenceRankAssigned).toBe(1);
        });

        it('handles empty friend lists in preferences', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'b'] }
                ]);

                const preferences = [
                        createPreference('a', 'p1', []),
                        createPreference('b', 'p1', ['a'])
                ];

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences,
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(100);
        });

        it('calculates correct rank when no friends are in group', () => {
                const scenario = createTestScenario([
                        { id: 'g1', name: 'G1', memberIds: ['a', 'x'] },
                        { id: 'g2', name: 'G2', memberIds: ['b', 'c'] }
                ]);

                const preferences = [createPreference('a', 'p1', ['b', 'c'])];

                const result = computeScenarioSatisfaction({
                        scenario,
                        preferences,
                        students: []
                });

                expect(result.percentAssignedTopChoice).toBe(0);
                expect(result.percentAssignedTop2).toBe(0);
                expect(result.averagePreferenceRankAssigned).toBe(3);
        });
});
