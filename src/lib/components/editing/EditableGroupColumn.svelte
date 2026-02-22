<script lang="ts">
  import type { Group, Student } from '$lib/domain';
  import { droppable, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';
  import DraggableStudentCard, { type KeyboardMoveDirection } from './DraggableStudentCard.svelte';
  import DropIndicator from './DropIndicator.svelte';
  import { getCapacityStatus } from '$lib/utils/groups';

  const {
    group,
    studentsById,
    draggingId = null,
    onDrop,
    onReorder,
    onDragStart,
    onDragEnd,
    flashingIds = new Set<string>(),
    onUpdateGroup,
    onDeleteGroup,
    onAlphabetize,
    focusNameOnMount = false,
    rowSpan = 1,
    preferenceRank = null,
    studentPreferenceRanks = new Map<string, number | null>(),
    studentHasPreferences = new Map<string, boolean>(),
    onStudentHoverStart,
    onStudentHoverEnd,
    pickedUpStudentId = null,
    onKeyboardPickUp,
    onKeyboardDrop,
    onKeyboardCancel,
    onKeyboardMove,
    onStudentClick,
    draggedStudentPreferences = null
  } = $props<{
    group: Group;
    studentsById: Record<string, Student>;
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
    onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
    onDeleteGroup?: (groupId: string) => void;
    onAlphabetize?: (groupId: string) => void;
    focusNameOnMount?: boolean;
    rowSpan?: number;
    preferenceRank?: number | null;
    studentPreferenceRanks?: Map<string, number | null>;
    studentHasPreferences?: Map<string, boolean>;
    onStudentHoverStart?: (studentId: string, x: number, y: number) => void;
    onStudentHoverEnd?: () => void;
    pickedUpStudentId?: string | null;
    onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
    onKeyboardDrop?: () => void;
    onKeyboardCancel?: () => void;
    onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
    onStudentClick?: (studentId: string) => void;
    draggedStudentPreferences?: string[] | null;
  }>();

  const capacityStatus = $derived(getCapacityStatus(group));

  // Drag destination rank preview
  const previewRank = $derived.by(() => {
    if (!draggingId || !draggedStudentPreferences) return null;
    const rank = draggedStudentPreferences.indexOf(group.id);
    return rank >= 0 ? rank + 1 : null;
  });

  const previewBadgeText = $derived.by(() => {
    if (previewRank === null) return 'Not preferred';
    if (previewRank === 1) return 'Would be 1st';
    if (previewRank === 2) return 'Would be 2nd';
    if (previewRank === 3) return 'Would be 3rd';
    return `Would be ${previewRank}th`;
  });

  const previewBadgeClass = $derived.by(() => {
    if (previewRank === null) return 'bg-gray-100 text-gray-500';
    if (previewRank === 1) return 'bg-green-100 text-green-700';
    if (previewRank === 2) return 'bg-yellow-100 text-yellow-700';
    if (previewRank === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  });

  // Configuration: only highlight top N choices with border/background (future: make this user-configurable)
  const MAX_HIGHLIGHTED_RANK = 1;

  // Preference rank styling
  const preferenceStyles = $derived(() => {
    if (preferenceRank === null) return null;

    // Determine label
    const label =
      preferenceRank === 1
        ? '1st Choice'
        : preferenceRank === 2
          ? '2nd Choice'
          : preferenceRank === 3
            ? '3rd Choice'
            : `Choice ${preferenceRank}`;

    // Highlight top choice with border and background
    if (preferenceRank <= MAX_HIGHLIGHTED_RANK) {
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        badgeBg: 'bg-green-100',
        label
      };
    }

    if (preferenceRank === 2) {
      return {
        borderColor: 'border-yellow-400',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        badgeBg: 'bg-yellow-100',
        label
      };
    }

    // Other choices: default styling, no highlight
    return {
      borderColor: 'border-gray-200',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      badgeBg: 'bg-gray-100',
      label
    };
  });

  // Local editing state to handle validation
  let editingName = $state(group.name);

  const capacityLabel = $derived(() => {
    if (group.capacity === null) return `${group.memberIds.length}`;
    return `${group.memberIds.length}/${group.capacity}`;
  });

  // Track which item has edge hover and which edge
  let hoveredItemId = $state<string | null>(null);
  let hoveredEdge = $state<Edge | null>(null);

  // Use memberIds directly - no sorting (preserve order for drag reordering)
  const memberIds = $derived(group.memberIds);

  // Sync local state when group changes externally
  $effect(() => {
    editingName = group.name;
  });

  function handleContainerDrop(event: {
    draggedItem: { id: string };
    sourceContainer: string | null;
    targetContainer: string | null;
  }) {
    if (!event.targetContainer) return;
    // When dropping on the container (not on a specific item), append to end
    onDrop?.({
      studentId: event.draggedItem.id,
      source: event.sourceContainer ?? 'unassigned',
      target: event.targetContainer,
      targetIndex: group.memberIds.length // Append to end
    });
  }

  function handleItemDrop(state: SortableDropState) {
    if (!state.targetContainer) return;

    let insertIndex = state.targetIndex ?? 0;

    // Check if this is a within-group reorder
    const sourceIndex = group.memberIds.indexOf(state.draggedItem.id);
    const isWithinGroupMove = state.sourceContainer === group.id && sourceIndex !== -1;

    if (isWithinGroupMove) {
      // Adjust index for within-group moves
      if (sourceIndex < insertIndex) {
        insertIndex--;
      }
      // Only reorder if position actually changes
      if (sourceIndex !== insertIndex && onReorder) {
        onReorder({
          groupId: group.id,
          studentId: state.draggedItem.id,
          newIndex: insertIndex
        });
      }
    } else {
      // Cross-group move: use onDrop
      onDrop?.({
        studentId: state.draggedItem.id,
        source: state.sourceContainer ?? 'unassigned',
        target: state.targetContainer,
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

<div
  class={`relative flex flex-col gap-2 rounded-xl border-2 p-1.5 shadow-sm ${
    preferenceStyles()
      ? `${preferenceStyles()!.borderColor} ${preferenceStyles()!.bgColor}`
      : 'border-gray-200 bg-gray-50'
  }`}
  style={`grid-row: span ${rowSpan}; height: 100%;`}
>
  <div class="flex items-center justify-between gap-2">
    <span
      class="min-w-0 flex-1 truncate px-1 py-0.5 text-xs font-semibold text-gray-900"
      title={editingName}
    >
      {editingName}
    </span>
    <div class="flex items-center gap-1">
      {#if draggingId && draggedStudentPreferences}
        <span class={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${previewBadgeClass}`}>
          {previewBadgeText}
        </span>
      {:else}
        {#if group.memberIds.length > 1 && onAlphabetize}
          <button
            type="button"
            onclick={() => onAlphabetize?.(group.id)}
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
        <span
          class={`text-xs font-medium ${
            capacityStatus.isOverEnrolled ? 'text-violet-600' : 'text-gray-600'
          }`}
        >
          {capacityLabel()}
        </span>
      {/if}
    </div>
  </div>

  <div
    use:droppable={{ container: group.id, callbacks: { onDrop: handleContainerDrop } }}
    class={`grid flex-1 place-items-center content-start px-1 py-1 ${draggingId ? 'bg-white' : ''}`}
    style="grid-template-columns: 1fr; gap: var(--card-gap, 4px);"
  >
    {#if memberIds.length === 0}
      <p class="col-span-full py-6 text-center text-xs text-gray-500">Drop students here</p>
    {:else}
      {#each memberIds as memberId, index (memberId)}
        {#if studentsById[memberId]}
          <div class="relative">
            <DropIndicator
              edge="top"
              visible={hoveredItemId === memberId &&
                hoveredEdge === 'top' &&
                draggingId !== memberId}
            />

            <DraggableStudentCard
              student={studentsById[memberId]}
              container={group.id}
              {index}
              isDragging={draggingId === memberId}
              onDragStart={() => onDragStart?.(memberId)}
              {onDragEnd}
              flash={flashingIds.has(memberId)}
              preferenceRank={studentPreferenceRanks.get(memberId) ?? null}
              hasPreferences={studentHasPreferences.get(memberId) ?? false}
              onHoverStart={onStudentHoverStart}
              onHoverEnd={onStudentHoverEnd}
              onEdgeChange={(edge) => handleEdgeChange(memberId, edge)}
              onItemDrop={handleItemDrop}
              isPickedUp={pickedUpStudentId === memberId}
              {onKeyboardPickUp}
              {onKeyboardDrop}
              {onKeyboardCancel}
              {onKeyboardMove}
              {onStudentClick}
            />

            {#if index === memberIds.length - 1}
              <DropIndicator
                edge="bottom"
                visible={hoveredItemId === memberId &&
                  hoveredEdge === 'bottom' &&
                  draggingId !== memberId}
              />
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
    <div
      style="width: var(--card-width, 112px);"
      class="pointer-events-none mx-auto p-0.5 opacity-0 select-none"
      aria-hidden="true"
    >
      <div style="font-size: var(--card-font-size, 15px);" class="px-0.5 py-0.5 font-semibold">
        &nbsp;
      </div>
    </div>
  </div>
</div>
