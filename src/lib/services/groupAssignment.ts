import type { CommandStore } from '$lib/stores/commands.svelte';
import type { Group, Student } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';

interface AssignmentDependencies {
        commandStore: CommandStore;
        getGroups: () => Group[];
        getStudentOrder: () => string[];
        getPreferencesById: () => Record<string, StudentPreference>;
        getStudentsById: () => Record<string, Student>;
        resetCollapsedGroups: () => void;
}

export function createGroupAssignmentService({
        commandStore,
        getGroups,
        getStudentOrder,
        getPreferencesById,
        getStudentsById,
        resetCollapsedGroups
}: AssignmentDependencies) {
        function groupOf(studentId: string): Group | null {
                const groups = getGroups();
                for (const g of groups) if (g.memberIds.includes(studentId)) return g;
                return null;
        }

        function studentHappiness(studentId: string): number {
                const pref = getPreferencesById()[studentId];
                if (!pref || !pref.likeStudentIds?.length) return 0;
                const g = groupOf(studentId);
                if (!g) return 0;
                const set = new Set(g.memberIds);
                const studentsById = getStudentsById();
                let count = 0;
                for (const fid of pref.likeStudentIds) {
                        if (studentsById[fid] && set.has(fid)) count++;
                }
                return count;
        }

        function clearAndRandomAssign() {
                const currentGroups = commandStore.groups;
                const emptyGroups = currentGroups.map((g) => ({ ...g, memberIds: [] }));
                const shuffled = [...getStudentOrder()].sort(() => Math.random() - 0.5);

                const newMemberIds: Record<string, string[]> = {};
                emptyGroups.forEach((g) => {
                        newMemberIds[g.id] = [];
                });

                let gi = 0;
                for (const id of shuffled) {
                        for (let k = 0; k < emptyGroups.length * 2; k++) {
                                const g = emptyGroups[gi % emptyGroups.length];
                                gi++;
                                if (g.capacity != null && newMemberIds[g.id].length >= g.capacity) continue;
                                newMemberIds[g.id].push(id);
                                break;
                        }
                }

                const finalGroups = emptyGroups.map((g) => ({ ...g, memberIds: newMemberIds[g.id] }));
                commandStore.initializeGroups(finalGroups);
                resetCollapsedGroups();
        }

        function buildAdjacency(): Map<string, Set<string>> {
                const adj = new Map<string, Set<string>>();
                for (const id of getStudentOrder()) adj.set(id, new Set());
                const preferences = getPreferencesById();
                const students = getStudentsById();
                for (const [sid, pref] of Object.entries(preferences)) {
                        for (const fid of pref.likeStudentIds) {
                                if (!students[fid] || !students[sid]) continue;
                                const otherPref = preferences[fid];
                                if (otherPref && otherPref.likeStudentIds.includes(sid)) {
                                        adj.get(sid)!.add(fid);
                                        adj.get(fid)!.add(sid);
                                }
                        }
                }
                return adj;
        }

        function autoAssignBalanced() {
                const currentGroups = commandStore.groups;
                const emptyGroups = currentGroups.map((g) => ({ ...g, memberIds: [] }));
                const adj = buildAdjacency();
                const degree = (id: string) => adj.get(id)?.size ?? 0;
                const order = [...getStudentOrder()].sort((a, b) => degree(b) - degree(a));

                const newMemberIds: Record<string, string[]> = {};
                emptyGroups.forEach((g) => {
                        newMemberIds[g.id] = [];
                });

                const remaining = (gid: string) => {
                        const g = emptyGroups.find((gr) => gr.id === gid);
                        if (!g) return 0;
                        return g.capacity == null ? Infinity : g.capacity - newMemberIds[gid].length;
                };

                for (const id of order) {
                        let bestG: string | null = null;
                        let bestScore = -1;

                        for (const g of emptyGroups) {
                                if (remaining(g.id) <= 0) continue;

                                let sc = 0;
                                const set = new Set(newMemberIds[g.id]);
                                for (const fid of adj.get(id) ?? []) {
                                        if (set.has(fid)) sc++;
                                }

                                if (sc > bestScore) {
                                        bestScore = sc;
                                        bestG = g.id;
                                }
                        }

                        if (bestG) {
                                newMemberIds[bestG].push(id);
                        }
                }

                let workingGroups = emptyGroups.map((g) => ({
                        ...g,
                        memberIds: newMemberIds[g.id]
                }));

                const budget = 300;
                for (let t = 0; t < budget; t++) {
                        const a = pickRandomPlaced();
                        const b = pickRandomPlaced();
                        if (!a || !b || a.id === b.id || a.group.id === b.group.id) continue;

                        const delta = swapDeltaHappiness(a.id, b.id, a.group, b.group);
                        if (delta > 0) {
                                const ai = a.group.memberIds.indexOf(a.id);
                                const bi = b.group.memberIds.indexOf(b.id);
                                a.group.memberIds[ai] = b.id;
                                b.group.memberIds[bi] = a.id;
                        }
                }

                commandStore.initializeGroups(workingGroups);
                resetCollapsedGroups();

                function pickRandomPlaced() {
                        const placedPairs: { id: string; group: Group }[] = [];
                        for (const g of workingGroups) {
                                for (const id of g.memberIds) {
                                        placedPairs.push({ id, group: g });
                                }
                        }
                        if (!placedPairs.length) return null;
                        return placedPairs[(Math.random() * placedPairs.length) | 0];
                }

                function swapDeltaHappiness(aId: string, bId: string, gA: Group, gB: Group) {
                        const before =
                                studentHappiness(aId) +
                                studentHappiness(bId) +
                                neighborsDeltaContext(gA, aId) +
                                neighborsDeltaContext(gB, bId);

                        const ai = gA.memberIds.indexOf(aId);
                        const bi = gB.memberIds.indexOf(bId);
                        gA.memberIds[ai] = bId;
                        gB.memberIds[bi] = aId;

                        const after =
                                studentHappiness(aId) +
                                studentHappiness(bId) +
                                neighborsDeltaContext(gA, bId) +
                                neighborsDeltaContext(gB, aId);

                        gA.memberIds[ai] = aId;
                        gB.memberIds[bi] = bId;

                        return after - before;
                }

                function neighborsDeltaContext(g: Group, movedId: string) {
                        let sum = 0;
                        const preferences = getPreferencesById();
                        for (const otherId of g.memberIds) {
                                const otherPref = preferences[otherId];
                                if (otherPref?.likeStudentIds?.includes(movedId)) {
                                        sum += studentHappiness(otherId);
                                }
                        }
                        return sum;
                }
        }

        return {
                clearAndRandomAssign,
                autoAssignBalanced,
                studentHappiness
        };
}
