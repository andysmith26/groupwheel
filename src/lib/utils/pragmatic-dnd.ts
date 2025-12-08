/**
 * Svelte actions for Atlassian's Pragmatic Drag and Drop
 *
 * These actions provide a simple Svelte-friendly API for drag-and-drop functionality
 * powered by @atlaskit/pragmatic-drag-and-drop.
 */

import {
	draggable as makeDraggable,
	dropTargetForElements,
	monitorForElements
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

const isBrowser = typeof window !== 'undefined';

// Type for drag data - matches the structure used in the original app
export type DragData = {
	id: string;
};

// Type for drop state - simplified version of what @thisux/sveltednd provides
export type DropState = {
	draggedItem: DragData;
	sourceContainer: string | null;
	targetContainer: string | null;
};

// Draggable action configuration
export type DraggableConfig = {
	container?: string; // The ID of the container this draggable belongs to
	dragData: DragData;
	callbacks?: {
		onDragStart?: () => void;
		onDragEnd?: () => void;
	};
};

// Droppable action configuration
export type DroppableConfig = {
	container: string; // The ID of this drop target
	callbacks: {
		onDrop: (state: DropState) => void;
	};
};

/**
 * Svelte action to make an element draggable
 *
 * Usage:
 * ```svelte
 * <div use:draggable={{ dragData: { id: 'item-1' }, container: 'list-1' }}>
 *   Drag me
 * </div>
 * ```
 */
export function draggable(element: HTMLElement, config: DraggableConfig) {
	if (!isBrowser) {
		return {
			destroy() {
				// no-op on server
			}
		};
	}

	const cleanup = makeDraggable({
		element,
		getInitialData: () => ({
			type: 'student-card',
			...config.dragData,
			container: config.container || null
		}),
		onDragStart: () => {
			config.callbacks?.onDragStart?.();
		},
		onDrop: () => {
			config.callbacks?.onDragEnd?.();
		}
	});

	return {
		destroy() {
			cleanup();
		}
	};
}

/**
 * Svelte action to make an element a drop target
 *
 * Usage:
 * ```svelte
 * <div use:droppable={{ container: 'list-1', callbacks: { onDrop: handleDrop } }}>
 *   Drop here
 * </div>
 * ```
 */
export function droppable(element: HTMLElement, config: DroppableConfig) {
	if (!isBrowser) {
		return {
			destroy() {
				// no-op on server
			}
		};
	}

	const cleanup = dropTargetForElements({
		element,
		getData: () => ({
			containerId: config.container
		}),
		onDragEnter: () => {
			// Add visual feedback when drag enters
			element.classList.add('drop-target-active');
		},
		onDragLeave: () => {
			// Remove visual feedback when drag leaves
			element.classList.remove('drop-target-active');
		},
		onDrop: ({ source, location }) => {
			// Remove visual feedback on drop
			element.classList.remove('drop-target-active');

			// Extract the drag data from the source
			const dragData = source.data as DragData & { container?: string; type?: string };
			const sourceContainer = dragData.container || null;

			// Get target container from the drop target's data
			const targetRecord = location.current.dropTargets[0];
			const targetData = targetRecord?.data as { containerId?: string };
			const targetContainer = targetData?.containerId || null;

			// Call the onDrop callback with the drop state
			config.callbacks.onDrop({
				draggedItem: { id: dragData.id },
				sourceContainer,
				targetContainer
			});
		}
	});

	return {
		destroy() {
			cleanup();
		}
	};
}

// Global monitor to track currently dragging items
let currentlyDraggingId: string | null = null;

/**
 * Initialize global drag-and-drop monitoring
 * Call this once when your app mounts
 */
export function initializeDragMonitor() {
	if (!isBrowser) {
		return {
			destroy() {
				// no-op on server
			}
		};
	}

	return monitorForElements({
		onDragStart: ({ source }) => {
			const data = source.data as DragData;
			currentlyDraggingId = data.id;
		},
		onDrop: () => {
			currentlyDraggingId = null;
		}
	});
}

/**
 * Get the ID of the currently dragging item
 */
export function getCurrentlyDraggingId(): string | null {
	return currentlyDraggingId;
}
