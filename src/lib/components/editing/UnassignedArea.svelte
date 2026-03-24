<script lang="ts">
  import type { Student } from '$lib/domain';
  import DraggableStudentCard, { type KeyboardMoveDirection } from './DraggableStudentCard.svelte';
  import DropIndicator from './DropIndicator.svelte';
  import {
    droppable,
    monitorDrag,
    type Edge,
    type SortableDropState
  } from '$lib/utils/pragmatic-dnd';

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
    onStudentClick,
    onAlphabetize,
    vertical = false,
    compact = false
  } = $props<{
    studentsById: Record<string, Student>;
    unassignedIds?: string[];
    draggingId?: string | null;
    onDrop?: (payload: {
      studentId: string;
      source: string;
      target: string;
      targetIndex?: number;
    }) => void;
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
    onStudentClick?: (studentId: string) => void;
    onAlphabetize?: () => void;
    vertical?: boolean;
    /** When true, hides the header and outer wrapper (for embedding in a parent bench zone) */
    compact?: boolean;
  }>();

  // Track which item has edge hover and which edge
  let hoveredItemId = $state<string | null>(null);
  let hoveredEdge = $state<Edge | null>(null);

  // Reference to the grid container for gap-position computation
  let gridEl = $state<HTMLElement | null>(null);

  /**
   * Compute insertion slot from cursor position relative to grid children.
   * Returns { itemId, edge } so we can show the indicator even when the cursor
   * is over the gap between cards (where no sortableItem fires onDrag).
   */
  function computeSlotFromCursor(
    clientX: number,
    clientY: number
  ): { itemId: string; edge: Edge } | null {
    if (!gridEl || unassignedIds.length === 0) return null;

    // Get all card wrappers (direct children with data-unassigned-slot)
    const cells = gridEl.querySelectorAll<HTMLElement>('[data-unassigned-slot]');
    if (cells.length === 0) return null;

    let closestIdx = 0;
    let closestDist = Infinity;

    for (let i = 0; i < cells.length; i++) {
      const rect = cells[i].getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    const rect = cells[closestIdx].getBoundingClientRect();
    const isVert = vertical;
    const edge: Edge = isVert
      ? clientY < rect.top + rect.height / 2
        ? 'top'
        : 'bottom'
      : clientX < rect.left + rect.width / 2
        ? 'left'
        : 'right';

    const slotId = cells[closestIdx].getAttribute('data-unassigned-slot');
    if (!slotId) return null;
    return { itemId: slotId, edge };
  }

  /**
   * Compute the insertion index from the current hoveredItemId + hoveredEdge.
   * Matches the same logic sortableItem uses internally.
   */
  function insertionIndexFromIndicator(): number {
    if (!hoveredItemId) return unassignedIds.length;
    const idx = unassignedIds.indexOf(hoveredItemId);
    if (idx === -1) return unassignedIds.length;
    if (hoveredEdge === 'right' || hoveredEdge === 'bottom') return idx + 1;
    return idx;
  }

  function handleContainerDrop(event: {
    draggedItem: { id: string };
    sourceContainer: string | null;
    targetContainer: string | null;
  }) {
    // Use the indicator position if one is visible, otherwise append to end
    const insertIndex = hoveredItemId ? insertionIndexFromIndicator() : unassignedIds.length;

    const sourceIndex = unassignedIds.indexOf(event.draggedItem.id);
    const isWithinUnassigned = event.sourceContainer === 'unassigned' && sourceIndex !== -1;

    if (isWithinUnassigned) {
      let adjustedIndex = insertIndex;
      if (sourceIndex < adjustedIndex) adjustedIndex--;
      if (sourceIndex !== adjustedIndex && onReorder) {
        onReorder({
          groupId: 'unassigned',
          studentId: event.draggedItem.id,
          newIndex: adjustedIndex
        });
      }
    } else {
      onDrop?.({
        studentId: event.draggedItem.id,
        source: event.sourceContainer ?? 'unassigned',
        target: 'unassigned',
        targetIndex: insertIndex
      });
    }

    hoveredItemId = null;
    hoveredEdge = null;
  }

  function handleItemDrop(state: SortableDropState) {
    // targetIndex from sortableItem already accounts for edge direction
    let insertIndex = state.targetIndex ?? 0;

    const sourceIndex = unassignedIds.indexOf(state.draggedItem.id);
    const isWithinUnassignedMove = state.sourceContainer === 'unassigned' && sourceIndex !== -1;

    if (isWithinUnassignedMove) {
      if (sourceIndex < insertIndex) insertIndex--;
      if (sourceIndex !== insertIndex && onReorder) {
        onReorder({
          groupId: 'unassigned',
          studentId: state.draggedItem.id,
          newIndex: insertIndex
        });
      }
    } else {
      onDrop?.({
        studentId: state.draggedItem.id,
        source: state.sourceContainer ?? 'unassigned',
        target: 'unassigned',
        targetIndex: insertIndex
      });
    }

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

  /**
   * Monitor-based hover tracking: fires on every drag frame so we can show an
   * indicator even when the cursor is over the gap between cards.
   */
  function handleMonitorDrag(clientX: number, clientY: number) {
    if (!gridEl) return;
    // Only update if the cursor is within the grid bounds
    const gridRect = gridEl.getBoundingClientRect();
    if (
      clientX < gridRect.left ||
      clientX > gridRect.right ||
      clientY < gridRect.top ||
      clientY > gridRect.bottom
    ) {
      return; // Outside grid — let card-level onEdgeChange handle clearing
    }
    const slot = computeSlotFromCursor(clientX, clientY);
    if (slot) {
      hoveredItemId = slot.itemId;
      hoveredEdge = slot.edge;
    }
  }

  function handleMonitorDragEnd() {
    hoveredItemId = null;
    hoveredEdge = null;
  }
</script>

<div
  class={compact
    ? 'flex flex-col'
    : vertical
      ? 'flex h-full flex-col rounded-xl bg-gray-50 p-1.5'
      : 'flex flex-col gap-2 rounded-xl bg-gray-50 p-1.5'}
>
  {#if !compact}
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
            class="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            title="Sort alphabetically"
            aria-label="Sort alphabetically"
          >
            <svg
              class="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
          </button>
        {/if}
        <span class="text-xs font-medium text-gray-600">
          {unassignedIds.length}
        </span>
      </div>
    </div>
  {/if}

  <div
    bind:this={gridEl}
    use:droppable={{ container: 'unassigned', callbacks: { onDrop: handleContainerDrop } }}
    use:monitorDrag={{ onDrag: handleMonitorDrag, onDragEnd: handleMonitorDragEnd }}
    class={vertical
      ? `grid flex-1 place-items-center content-start overflow-x-hidden overflow-y-auto rounded-lg px-1 py-1 ${
          draggingId ? 'bg-white' : ''
        }`
      : `grid content-start justify-items-center overflow-visible rounded-lg px-1 py-1 ${
          draggingId ? 'bg-white' : ''
        }`}
    style={vertical
      ? 'grid-template-columns: 1fr; gap: var(--card-gap, 4px);'
      : 'grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: var(--card-gap, 8px);'}
  >
    {#if unassignedIds.length === 0}
      <p
        class={vertical
          ? 'py-4 text-center text-xs text-gray-500'
          : 'col-span-full py-4 text-center text-xs text-gray-500'}
      >
        All students are assigned
      </p>
    {:else}
      {#each unassignedIds as studentId, index (studentId)}
        {#if studentsById[studentId]}
          {#if vertical}
            <div class="relative" data-unassigned-slot={studentId}>
              <DropIndicator
                edge="top"
                visible={hoveredItemId === studentId &&
                  hoveredEdge === 'top' &&
                  draggingId !== studentId}
              />

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
                {onStudentClick}
              />

              {#if index === unassignedIds.length - 1}
                <DropIndicator
                  edge="bottom"
                  visible={hoveredItemId === studentId &&
                    hoveredEdge === 'bottom' &&
                    draggingId !== studentId}
                />
              {/if}
            </div>
          {:else}
            <div class="relative overflow-visible" data-unassigned-slot={studentId}>
              <DropIndicator
                edge="left"
                visible={hoveredItemId === studentId &&
                  hoveredEdge === 'left' &&
                  draggingId !== studentId}
              />

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
                {onStudentClick}
                allowedEdges={['left', 'right']}
              />

              {#if index === unassignedIds.length - 1}
                <DropIndicator
                  edge="right"
                  visible={hoveredItemId === studentId &&
                    hoveredEdge === 'right' &&
                    draggingId !== studentId}
                />
              {/if}
            </div>
          {/if}
        {/if}
      {/each}
    {/if}
  </div>
</div>
