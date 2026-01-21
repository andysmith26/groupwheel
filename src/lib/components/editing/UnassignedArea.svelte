<script lang="ts">
	import type { Student } from '$lib/domain';
	import DraggableStudentCard, { type KeyboardMoveDirection } from './DraggableStudentCard.svelte';
	import DropIndicator from './DropIndicator.svelte';
	import { droppable, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';

	const {
		studentsById,
		unassignedIds = [],
		draggingId = null,
		onDrop,
		onReorder,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>(),
		studentHasPreferences = new Map<string, boolean>(),
		onStudentHoverStart,
		onStudentHoverEnd,
		pickedUpStudentId = null,
		onKeyboardPickUp,
		onKeyboardDrop,
		onKeyboardCancel,
		onKeyboardMove,
		onAlphabetize,
		vertical = false
	} = $props<{
		studentsById: Record<string, Student>;
		unassignedIds?: string[];
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string; targetIndex?: number }) => void;
		onReorder?: (payload: { groupId: string; studentId: string; newIndex: number }) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
		studentHasPreferences?: Map<string, boolean>;
		onStudentHoverStart?: (studentId: string, x: number, y: number) => void;
		onStudentHoverEnd?: () => void;
		pickedUpStudentId?: string | null;
		onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
		onKeyboardDrop?: () => void;
		onKeyboardCancel?: () => void;
		onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
		onAlphabetize?: () => void;
		vertical?: boolean;
	}>();

	// Track which item has edge hover and which edge
	let hoveredItemId = $state<string | null>(null);
	let hoveredEdge = $state<Edge | null>(null);

	function handleContainerDrop(event: {
		draggedItem: { id: string };
		sourceContainer: string | null;
		targetContainer: string | null;
	}) {
		// When dropping on the container (not on a specific item), append to end
		onDrop?.({
			studentId: event.draggedItem.id,
			source: event.sourceContainer ?? 'unassigned',
			target: 'unassigned',
			targetIndex: unassignedIds.length
		});
	}

	function handleItemDrop(state: SortableDropState) {
		let insertIndex = state.targetIndex ?? 0;

		// Check if this is a within-unassigned reorder
		const sourceIndex = unassignedIds.indexOf(state.draggedItem.id);
		const isWithinUnassignedMove = state.sourceContainer === 'unassigned' && sourceIndex !== -1;

		if (isWithinUnassignedMove) {
			// Adjust index for within-unassigned moves
			if (sourceIndex < insertIndex) {
				insertIndex--;
			}
			// Only reorder if position actually changes
			if (sourceIndex !== insertIndex && onReorder) {
				onReorder({
					groupId: 'unassigned',
					studentId: state.draggedItem.id,
					newIndex: insertIndex
				});
			}
		} else {
			// Cross-group move: use onDrop with position
			onDrop?.({
				studentId: state.draggedItem.id,
				source: state.sourceContainer ?? 'unassigned',
				target: 'unassigned',
				targetIndex: insertIndex
			});
		}

		// Clear hover state
		hoveredItemId = null;
		hoveredEdge = null;
	}

	function handleEdgeChange(itemId: string, edge: Edge | null) {
		if (edge) {
			hoveredItemId = itemId;
			hoveredEdge = edge;
		} else if (hoveredItemId === itemId) {
			hoveredItemId = null;
			hoveredEdge = null;
		}
	}
</script>

<div class={vertical ? 'flex h-full flex-col rounded-xl bg-gray-50 p-1.5' : 'flex flex-col gap-2 rounded-xl bg-gray-50 p-1.5'}>
	<!-- Header matching EditableGroupColumn style -->
	<div class="flex items-center justify-between gap-2">
		<span class="min-w-0 flex-1 truncate px-1 py-0.5 text-xs font-semibold text-gray-900">
			Unassigned
		</span>
		<div class="flex items-center gap-1">
			{#if unassignedIds.length > 1 && onAlphabetize}
				<button
					type="button"
					onclick={() => onAlphabetize?.()}
					class="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
					title="Sort alphabetically"
					aria-label="Sort alphabetically"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
					</svg>
				</button>
			{/if}
			<span class="text-xs font-medium text-gray-600">
				{unassignedIds.length}
			</span>
		</div>
	</div>

	<div
		use:droppable={{ container: 'unassigned', callbacks: { onDrop: handleContainerDrop } }}
		class={vertical
			? `grid flex-1 content-start place-items-center gap-0.5 overflow-y-auto overflow-x-hidden rounded-lg px-1 py-1 ${
					draggingId ? 'bg-white' : ''
				}`
			: `grid content-start justify-items-center gap-0.5 rounded-lg px-1 py-1 ${
					draggingId ? 'bg-white' : ''
				}`}
		style={vertical ? 'grid-template-columns: 1fr;' : 'grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));'}
	>
		{#if unassignedIds.length === 0}
			<p class={vertical ? 'py-4 text-center text-xs text-gray-500' : 'col-span-full py-4 text-center text-xs text-gray-500'}>All students are assigned</p>
		{:else}
			{#each unassignedIds as studentId, index (studentId)}
				{#if studentsById[studentId]}
					<!-- Drop indicator before this item (vertical mode only) -->
					{#if vertical}
						<DropIndicator visible={hoveredItemId === studentId && hoveredEdge === 'top' && draggingId !== studentId} />
					{/if}

					<DraggableStudentCard
						student={studentsById[studentId]}
						container="unassigned"
						{index}
						isDragging={draggingId === studentId}
						onDragStart={() => onDragStart?.(studentId)}
						{onDragEnd}
						flash={flashingIds.has(studentId)}
						hasPreferences={studentHasPreferences.get(studentId) ?? false}
						onHoverStart={onStudentHoverStart}
						onHoverEnd={onStudentHoverEnd}
						onEdgeChange={(edge) => handleEdgeChange(studentId, edge)}
						onItemDrop={handleItemDrop}
						isPickedUp={pickedUpStudentId === studentId}
						{onKeyboardPickUp}
						{onKeyboardDrop}
						{onKeyboardCancel}
						{onKeyboardMove}
					/>

					<!-- Drop indicator after this item (only for last item, vertical mode only) -->
					{#if vertical && index === unassignedIds.length - 1}
						<DropIndicator visible={hoveredItemId === studentId && hoveredEdge === 'bottom' && draggingId !== studentId} />
					{/if}
				{/if}
			{/each}
		{/if}
	</div>
</div>
