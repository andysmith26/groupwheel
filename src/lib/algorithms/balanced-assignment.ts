import type { Group } from '$lib/types';
import { neighborsHappinessImpact, studentHappinessForMembers } from './happiness';
import type { AssignmentOptions, AssignmentResult, HappinessContext } from './types';

export function assignBalanced(options: AssignmentOptions): AssignmentResult {
        const emptyGroups = options.groups.map((group) => ({
                ...group,
                memberIds: [] as string[]
        }));

        const adjacency = buildMutualFriendAdjacency(options);
        const degree = (id: string) => adjacency.get(id)?.size ?? 0;
        const order = [...options.studentOrder].sort((a, b) => degree(b) - degree(a));

        const memberMap: Record<string, string[]> = {};
        for (const group of emptyGroups) memberMap[group.id] = [];

        const unassigned: string[] = [];

        for (const studentId of order) {
                let bestGroup: Group | null = null;
                let bestScore = -1;

                for (const group of emptyGroups) {
                        const remaining = remainingCapacity(group, memberMap[group.id]);
                        if (remaining <= 0) continue;

                        const members = memberMap[group.id];
                        const set = new Set(members);
                        let score = 0;
                        for (const friendId of adjacency.get(studentId) ?? []) {
                                if (set.has(friendId)) score++;
                        }

                        if (score > bestScore) {
                                bestScore = score;
                                bestGroup = group;
                        }
                }

                if (bestGroup) {
                        memberMap[bestGroup.id].push(studentId);
                } else {
                        unassigned.push(studentId);
                }
        }

        let workingGroups = emptyGroups.map((group) => ({
                ...group,
                memberIds: memberMap[group.id]
        }));

        const context: HappinessContext = {
                preferencesById: options.preferencesById,
                studentsById: options.studentsById
        };
        const swapBudget = options.swapBudget ?? 300;

        for (let i = 0; i < swapBudget; i++) {
                const a = pickRandomPlaced(workingGroups);
                const b = pickRandomPlaced(workingGroups);
                if (!a || !b || a.id === b.id || a.group.id === b.group.id) continue;

                const delta = swapDeltaHappiness(a.id, b.id, a.group, b.group, context);
                if (delta > 0) {
                        const ai = a.group.memberIds.indexOf(a.id);
                        const bi = b.group.memberIds.indexOf(b.id);
                        a.group.memberIds[ai] = b.id;
                        b.group.memberIds[bi] = a.id;
                }
        }

        return { groups: workingGroups, unassignedStudentIds: unassigned };
}

function remainingCapacity(group: Group, memberIds: string[]): number {
        if (group.capacity == null) return Infinity;
        return group.capacity - memberIds.length;
}

function pickRandomPlaced(groups: Group[]): { id: string; group: Group } | null {
        const placed: { id: string; group: Group }[] = [];
        for (const group of groups) {
                for (const id of group.memberIds) {
                        placed.push({ id, group });
                }
        }
        if (!placed.length) return null;
        return placed[(Math.random() * placed.length) | 0];
}

function swapDeltaHappiness(
        aId: string,
        bId: string,
        groupA: Group,
        groupB: Group,
        context: HappinessContext
): number {
        const before =
                studentHappinessForMembers(aId, groupA.memberIds, context) +
                studentHappinessForMembers(bId, groupB.memberIds, context) +
                neighborsHappinessImpact(groupA.memberIds, aId, context) +
                neighborsHappinessImpact(groupB.memberIds, bId, context);

        const ai = groupA.memberIds.indexOf(aId);
        const bi = groupB.memberIds.indexOf(bId);
        groupA.memberIds[ai] = bId;
        groupB.memberIds[bi] = aId;

        const after =
                studentHappinessForMembers(aId, groupB.memberIds, context) +
                studentHappinessForMembers(bId, groupA.memberIds, context) +
                neighborsHappinessImpact(groupA.memberIds, bId, context) +
                neighborsHappinessImpact(groupB.memberIds, aId, context);

        groupA.memberIds[ai] = aId;
        groupB.memberIds[bi] = bId;

        return after - before;
}

function buildMutualFriendAdjacency(options: AssignmentOptions): Map<string, Set<string>> {
        const adjacency = new Map<string, Set<string>>();
        for (const id of options.studentOrder) adjacency.set(id, new Set());

        const { preferencesById, studentsById } = options;
        for (const [studentId, pref] of Object.entries(preferencesById)) {
                for (const friendId of pref.likeStudentIds ?? []) {
                        if (!studentsById[friendId] || !studentsById[studentId]) continue;
                        const friendPref = preferencesById[friendId];
                        if (friendPref?.likeStudentIds?.includes(studentId)) {
                                adjacency.get(studentId)?.add(friendId);
                                adjacency.get(friendId)?.add(studentId);
                        }
                }
        }

        return adjacency;
}
