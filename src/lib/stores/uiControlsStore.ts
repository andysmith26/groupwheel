import type { CommandStore } from '$lib/stores/commands.svelte';
import type { Group } from '$lib/types';
import type { DropState } from '$lib/utils/pragmatic-dnd';

interface UiControlsDependencies {
        getGroups: () => Group[];
        commandStore: CommandStore;
        getCollapsedGroups: () => Set<string>;
        setCollapsedGroups: (next: Set<string>) => void;
        getSelectedStudentId: () => string | null;
        setSelectedStudentId: (value: string | null) => void;
        setCurrentlyDragging: (value: string | null) => void;
}

export function createUiControlsStore({
        getGroups,
        commandStore,
        getCollapsedGroups,
        setCollapsedGroups,
        getSelectedStudentId,
        setSelectedStudentId,
        setCurrentlyDragging
}: UiControlsDependencies) {
        function toggleCollapse(groupId: string) {
                const next = new Set(getCollapsedGroups());
                if (next.has(groupId)) {
                        next.delete(groupId);
                } else {
                        next.add(groupId);
                }
                setCollapsedGroups(next);
        }

        function handleDragStart(studentId: string) {
                setCurrentlyDragging(studentId);
                setSelectedStudentId(studentId);
        }

        function handleStudentClick(studentId: string) {
                const current = getSelectedStudentId();
                setSelectedStudentId(current === studentId ? null : studentId);
        }

        function handleDrop(state: DropState) {
                const groups = getGroups();
                const { draggedItem, sourceContainer, targetContainer } = state;
                const studentId = draggedItem.id;

                if (!targetContainer || sourceContainer === targetContainer) {
                        setCurrentlyDragging(null);
                        return;
                }

                if (targetContainer !== 'unassigned') {
                        const targetGroup = groups.find((g) => g.id === targetContainer);
                        if (targetGroup) {
                                const currentCount = targetGroup.memberIds.length;
                                if (targetGroup.capacity != null && currentCount >= targetGroup.capacity) {
                                        console.warn(`Cannot drop: ${targetGroup.name} is at capacity`);
                                        setCurrentlyDragging(null);
                                        return;
                                }
                        }
                }

                if (getCollapsedGroups().has(targetContainer)) {
                        const next = new Set(getCollapsedGroups());
                        next.delete(targetContainer);
                        setCollapsedGroups(next);
                }

                commandStore.dispatch({
                        type: 'ASSIGN_STUDENT',
                        studentId,
                        groupId: targetContainer,
                        previousGroupId: sourceContainer ?? undefined
                });

                setCurrentlyDragging(null);
        }

        return {
                toggleCollapse,
                handleDragStart,
                handleStudentClick,
                handleDrop
        };
}
