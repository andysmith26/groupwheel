import type { ScenarioEditingView } from '$lib/stores/scenarioEditingStore';
import type { ScenarioEditingStore } from '$lib/stores/scenarioEditingStore';
import type { WorkspaceKeyboardController } from '$lib/stores/workspace-keyboard-controller.svelte';
import type { WorkspaceRowLayout } from '$lib/services/appEnvUseCases';

export interface WorkspaceKeyboardMoveDeps {
	getKeyboardController: () => WorkspaceKeyboardController;
	getView: () => ScenarioEditingView | null;
	getEditingStore: () => ScenarioEditingStore | null;
	getResolvedRowLayout: () => WorkspaceRowLayout | null;
	flashStudent: (id: string) => void;
}

export function createWorkspaceKeyboardMoveHandlers(deps: WorkspaceKeyboardMoveDeps) {
	function handleKeyboardPickUp(studentId: string, container: string, index: number) {
		deps.getKeyboardController().actions.pickup(studentId, container, index);
	}

	function handleKeyboardDrop() {
		const { pickedUpStudentId, pickedUpFromContainer, pickedUpFromIndex } =
			deps.getKeyboardController().state;
		if (!pickedUpStudentId) return;

		const view = deps.getView();
		let currentContainer = pickedUpFromContainer ?? 'unassigned';
		let currentIndex = pickedUpFromIndex;

		for (const group of view?.groups ?? []) {
			const idx = group.memberIds.indexOf(pickedUpStudentId);
			if (idx !== -1) {
				currentContainer = group.id;
				currentIndex = idx;
				break;
			}
		}

		if (view?.unassignedStudentIds.includes(pickedUpStudentId)) {
			currentContainer = 'unassigned';
			currentIndex = view.unassignedStudentIds.indexOf(pickedUpStudentId);
		}

		deps.getKeyboardController().actions.drop(currentContainer, currentIndex);
	}

	function handleKeyboardCancel() {
		deps.getKeyboardController().actions.cancel();
	}

	function handleKeyboardMove(direction: 'up' | 'down' | 'left' | 'right') {
		const { pickedUpStudentId, pickedUpFromContainer, pickedUpFromIndex } =
			deps.getKeyboardController().state;
		const view = deps.getView();
		if (!pickedUpStudentId || !view) return;

		// Find where the student currently is
		let currentContainer = pickedUpFromContainer;
		let currentIndex = pickedUpFromIndex;

		for (const group of view.groups) {
			const idx = group.memberIds.indexOf(pickedUpStudentId);
			if (idx !== -1) {
				currentContainer = group.id;
				currentIndex = idx;
				break;
			}
		}

		if (view.unassignedStudentIds.includes(pickedUpStudentId)) {
			currentContainer = 'unassigned';
			currentIndex = view.unassignedStudentIds.indexOf(pickedUpStudentId);
		}

		// Build list of all containers in visual order
		const resolvedRowLayout = deps.getResolvedRowLayout();
		const visualGroupOrder = resolvedRowLayout
			? [...resolvedRowLayout.top, ...resolvedRowLayout.bottom]
			: view.groups.map((g) => g.id);
		const containers = ['unassigned', ...visualGroupOrder];
		const currentContainerIndex = containers.indexOf(currentContainer ?? 'unassigned');

		let targetContainer = currentContainer;
		let targetIndex = currentIndex;

		if (direction === 'up' && currentContainer !== 'unassigned') {
			const group = view.groups.find((g) => g.id === currentContainer);
			if (group && currentIndex > 0) {
				targetIndex = currentIndex - 1;
			}
		} else if (direction === 'down' && currentContainer !== 'unassigned') {
			const group = view.groups.find((g) => g.id === currentContainer);
			if (group && currentIndex < group.memberIds.length - 1) {
				targetIndex = currentIndex + 1;
			}
		} else if (direction === 'left') {
			if (currentContainerIndex > 0) {
				targetContainer = containers[currentContainerIndex - 1];
				targetIndex = 0;
			}
		} else if (direction === 'right') {
			if (currentContainerIndex < containers.length - 1) {
				targetContainer = containers[currentContainerIndex + 1];
				targetIndex = 0;
			}
		}

		// Only dispatch if something changed
		if (targetContainer !== currentContainer || targetIndex !== currentIndex) {
			const editingStore = deps.getEditingStore();
			const result = editingStore?.dispatch({
				type: 'MOVE_STUDENT',
				studentId: pickedUpStudentId,
				source: currentContainer ?? 'unassigned',
				target: targetContainer ?? 'unassigned',
				targetIndex
			});

			if (result?.success) {
				deps.flashStudent(pickedUpStudentId);
				deps.getKeyboardController().actions.announceMove(
					targetContainer ?? 'unassigned',
					targetIndex
				);

				// After moving to a different container, the DOM element is remounted.
				// Restore focus to the new element after the DOM updates.
				if (targetContainer !== currentContainer) {
					const studentIdToFocus = pickedUpStudentId;
					requestAnimationFrame(() => {
						const newElement = document.querySelector(
							`[data-student-id="${studentIdToFocus}"]`
						) as HTMLElement | null;
						newElement?.focus();
					});
				}
			}
		}
	}

	return {
		handleKeyboardPickUp,
		handleKeyboardDrop,
		handleKeyboardCancel,
		handleKeyboardMove
	};
}
