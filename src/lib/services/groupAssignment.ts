import { assignBalanced } from '$lib/algorithms/balanced-assignment';
import { studentHappinessInGroups } from '$lib/algorithms/happiness';
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
	function studentHappiness(studentId: string): number {
		return studentHappinessInGroups(studentId, getGroups(), {
			preferencesById: getPreferencesById(),
			studentsById: getStudentsById()
		});
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

	function autoAssignBalanced() {
		const result = assignBalanced({
			groups: commandStore.groups,
			studentOrder: getStudentOrder(),
			preferencesById: getPreferencesById(),
			studentsById: getStudentsById()
		});

		commandStore.initializeGroups(result.groups);
		resetCollapsedGroups();
	}

	return {
		clearAndRandomAssign,
		autoAssignBalanced,
		studentHappiness
	};
}
