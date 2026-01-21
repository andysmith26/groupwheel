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
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import {
	attachClosestEdge,
	extractClosestEdge,
	type Edge
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

const isBrowser = typeof window !== 'undefined';

export type { Edge };
export { extractClosestEdge };

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
		onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
			// Calculate offset to preserve click position (no jump)
			const rect = element.getBoundingClientRect();
			const offsetX = location.current.input.clientX - rect.left;
			const offsetY = location.current.input.clientY - rect.top;

			// Create a custom drag preview with "floating" state styling
			setCustomNativeDragPreview({
				nativeSetDragImage,
				getOffset: () => ({ x: offsetX, y: offsetY }),
				render: ({ container }) => {
					// Clone the element for the preview
					const clone = element.cloneNode(true) as HTMLElement;
					clone.style.width = `${element.offsetWidth}px`;

					// Find the preference dot and update it to grey (floating state)
					const dot = clone.querySelector('span.rounded-full');
					if (dot) {
						// Remove color classes and set to grey for students with preferences
						// or keep hollow for students without preferences
						const isHollow = dot.classList.contains('bg-transparent');
						if (!isHollow) {
							dot.className = 'absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gray-400';
						}
					}

					container.appendChild(clone);
				}
			});
		},
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
		onDrop: ({ source, location, self }) => {
			// Remove visual feedback on drop
			element.classList.remove('drop-target-active');

			// Only handle the innermost drop target to avoid duplicate drops
			const primaryTarget = location.current.dropTargets[0];
			if (primaryTarget && primaryTarget.element !== self.element) {
				return;
			}

			// Extract the drag data from the source
			const dragData = source.data as DragData & { container?: string; type?: string };
			const sourceContainer = dragData.container || null;

			// Get target container from the drop target's data
			const targetData = self.data as { containerId?: string };
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

// Sortable item action configuration
export type SortableItemConfig = {
	container: string; // The ID of the container this item belongs to
	index: number; // The current index of this item in the list
	dragData: DragData;
	callbacks?: {
		onDragStart?: () => void;
		onDragEnd?: () => void;
		onEdgeChange?: (edge: Edge | null) => void;
		onDrop?: (state: SortableDropState) => void;
	};
};

// Extended drop state with index information
export type SortableDropState = DropState & {
	targetIndex?: number;
	closestEdge?: Edge | null;
};

/**
 * Svelte action for sortable list items.
 * Makes an element both draggable and a drop target for reordering.
 */
export function sortableItem(element: HTMLElement, config: SortableItemConfig) {
	if (!isBrowser) {
		return {
			update() {},
			destroy() {}
		};
	}

	let currentConfig = config;

	const draggableCleanup = makeDraggable({
		element,
		getInitialData: () => ({
			type: 'student-card',
			...currentConfig.dragData,
			container: currentConfig.container,
			index: currentConfig.index
		}),
		onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
			const rect = element.getBoundingClientRect();
			const offsetX = location.current.input.clientX - rect.left;
			const offsetY = location.current.input.clientY - rect.top;

			setCustomNativeDragPreview({
				nativeSetDragImage,
				getOffset: () => ({ x: offsetX, y: offsetY }),
				render: ({ container }) => {
					const clone = element.cloneNode(true) as HTMLElement;
					clone.style.width = `${element.offsetWidth}px`;

					const dot = clone.querySelector('span.rounded-full');
					if (dot) {
						const isHollow = dot.classList.contains('bg-transparent');
						if (!isHollow) {
							dot.className = 'absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gray-400';
						}
					}

					container.appendChild(clone);
				}
			});
		},
		onDragStart: () => {
			currentConfig.callbacks?.onDragStart?.();
		},
		onDrop: () => {
			currentConfig.callbacks?.onDragEnd?.();
		}
	});

	const dropTargetCleanup = dropTargetForElements({
		element,
		getData: ({ input, element: el }) => {
			return attachClosestEdge(
				{
					containerId: currentConfig.container,
					itemId: currentConfig.dragData.id,
					index: currentConfig.index
				},
				{
					input,
					element: el,
					allowedEdges: ['top', 'bottom']
				}
			);
		},
		onDrag: ({ self }) => {
			const edge = extractClosestEdge(self.data);
			currentConfig.callbacks?.onEdgeChange?.(edge);
		},
		onDragLeave: () => {
			currentConfig.callbacks?.onEdgeChange?.(null);
		},
		onDrop: ({ source, self }) => {
			currentConfig.callbacks?.onEdgeChange?.(null);

			// Extract the drag data from the source
			const dragData = source.data as DragData & { container?: string; type?: string };
			const sourceContainer = dragData.container || null;

			// Get edge and target info
			const edge = extractClosestEdge(self.data);
			const targetData = self.data as { containerId?: string; index?: number };
			const targetContainer = targetData?.containerId || null;
			const targetIndex = targetData?.index ?? 0;

			// Calculate insertion index based on edge
			let insertIndex = targetIndex;
			if (edge === 'bottom') {
				insertIndex = targetIndex + 1;
			}

			// Call the onDrop callback with the drop state
			currentConfig.callbacks?.onDrop?.({
				draggedItem: { id: dragData.id },
				sourceContainer,
				targetContainer,
				targetIndex: insertIndex,
				closestEdge: edge
			});
		}
	});

	return {
		update(newConfig: SortableItemConfig) {
			currentConfig = newConfig;
		},
		destroy() {
			draggableCleanup();
			dropTargetCleanup();
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
