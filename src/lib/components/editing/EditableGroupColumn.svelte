<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Group, Student } from '$lib/domain';
  import { droppable, sortableGroup, type Edge, type SortableDropState, type SortableGroupDropState } from '$lib/utils/pragmatic-dnd';
  import DraggableStudentCard, { type KeyboardMoveDirection } from './DraggableStudentCard.svelte';
  import DropIndicator from './DropIndicator.svelte';
  import GroupDropIndicator from './GroupDropIndicator.svelte';
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
    draggedStudentPreferences = null,
    siblingGroupNames = [] as string[],
    readonly = false,
    groupIndex = 0,
    draggingGroupId = null,
    onGroupDrop,
    onGroupEdgeChange,
    onGroupDragStart,
    onGroupDragEnd
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
    /** Names of sibling groups for duplicate-name validation. */
    siblingGroupNames?: string[];
    /** When true, suppresses drag-drop affordances and empty placeholder text. */
    readonly?: boolean;
    /** Index of this group in the group array (for sortableGroup). */
    groupIndex?: number;
    /** ID of the group currently being dragged (null if none). */
    draggingGroupId?: string | null;
    /** Called when a group is dropped on this column. */
    onGroupDrop?: (state: SortableGroupDropState) => void;
    /** Called when the closest edge changes during a group drag. */
    onGroupEdgeChange?: (groupId: string, edge: Edge | null) => void;
    /** Called when this group starts being dragged. */
    onGroupDragStart?: (groupId: string) => void;
    /** Called when this group stops being dragged. */
    onGroupDragEnd?: () => void;
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

  // Local editing state for inline rename
  let editingName = $state(group.name);
  let isEditingName = $state(focusNameOnMount);
  let nameInputEl = $state<HTMLInputElement | null>(null);
  let nameError = $state<string | null>(null);
  let nameErrorTimeout: ReturnType<typeof setTimeout> | null = null;

  // Kebab menu state
  let menuOpen = $state(false);
  let menuButtonEl = $state<HTMLButtonElement | null>(null);

  const capacityLabel = $derived(() => {
    if (group.capacity === null) return `${group.memberIds.length}`;
    return `${group.memberIds.length}/${group.capacity}`;
  });

  // Track which item has edge hover and which edge
  let hoveredItemId = $state<string | null>(null);
  let hoveredEdge = $state<Edge | null>(null);

  // Group drag handle element binding
  let headerEl = $state<HTMLElement | null>(null);

  // Local group edge state for rendering indicator
  let localGroupEdge = $state<Edge | null>(null);

  const isThisGroupDragging = $derived(draggingGroupId === group.id);

  // Use memberIds directly - no sorting (preserve order for drag reordering)
  const memberIds = $derived(group.memberIds);

  // Sync local state when group changes externally
  $effect(() => {
    editingName = group.name;
  });

  // Focus and select input when it becomes visible
  $effect(() => {
    if (isEditingName && nameInputEl) {
      nameInputEl.focus();
      nameInputEl.select();
    }
  });

  function showNameError(msg: string) {
    nameError = msg;
    if (nameErrorTimeout) clearTimeout(nameErrorTimeout);
    nameErrorTimeout = setTimeout(() => { nameError = null; }, 2000);
  }

  function isDuplicateName(name: string): boolean {
    return siblingGroupNames.some((n: string) => n.toLowerCase() === name.toLowerCase());
  }

  function commitName() {
    const trimmed = editingName.trim();

    if (trimmed.length === 0) {
      editingName = group.name;
      isEditingName = false;
      return;
    }

    if (trimmed === group.name) {
      isEditingName = false;
      return;
    }

    // Check for duplicate names among siblings — keep editing so user can fix
    if (isDuplicateName(trimmed)) {
      showNameError('Name already taken');
      // Re-focus after the blur event completes
      requestAnimationFrame(() => nameInputEl?.focus());
      return;
    }

    onUpdateGroup?.(group.id, { name: trimmed });
    isEditingName = false;
  }

  function handleNameInput() {
    if (nameError) {
      nameError = null;
      if (nameErrorTimeout) clearTimeout(nameErrorTimeout);
    }
  }

  function handleNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingName = group.name;
      nameError = null;
      isEditingName = false;
    }
  }

  function handleNameClick() {
    if (!onUpdateGroup || readonly) return;
    isEditingName = true;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function handleDeleteClick() {
    menuOpen = false;
    onDeleteGroup?.(group.id);
  }

  // Close menu on outside click
  function handleWindowClick(e: MouseEvent) {
    if (menuOpen && menuButtonEl && !menuButtonEl.contains(e.target as Node)) {
      menuOpen = false;
    }
  }

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

<svelte:window onclick={handleWindowClick} />

<div
  class={`relative flex flex-col gap-2 rounded-xl border-2 p-1.5 shadow-sm ${
    preferenceStyles()
      ? `${preferenceStyles()!.borderColor} ${preferenceStyles()!.bgColor}`
      : 'border-gray-200 bg-gray-50'
  } ${isThisGroupDragging ? 'opacity-40' : ''}`}
  style={`grid-row: span ${rowSpan}; height: 100%;`}
  use:sortableGroup={{
    groupId: group.id,
    index: groupIndex,
    dragHandle: headerEl ?? undefined,
    disabled: readonly,
    callbacks: {
      onDragStart: () => onGroupDragStart?.(group.id),
      onDragEnd: () => onGroupDragEnd?.(),
      onEdgeChange: (edge) => {
        localGroupEdge = edge;
        onGroupEdgeChange?.(group.id, edge);
      },
      onDrop: (state) => onGroupDrop?.(state)
    }
  }}
>
  <GroupDropIndicator edge="left" visible={localGroupEdge === 'left' && !isThisGroupDragging} />
  <GroupDropIndicator edge="right" visible={localGroupEdge === 'right' && !isThisGroupDragging} />

  <div class="group/header flex items-center gap-1">
    {#if !readonly}
      <div
        bind:this={headerEl}
        class="flex shrink-0 cursor-grab items-center self-stretch rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover/header:opacity-100 active:cursor-grabbing"
        title="Drag to reorder group"
        aria-label="Drag to reorder group"
      >
        <svg class="h-3.5 w-3 text-gray-400" viewBox="0 0 6 10" fill="currentColor">
          <circle cx="1.5" cy="1.5" r="1" />
          <circle cx="4.5" cy="1.5" r="1" />
          <circle cx="1.5" cy="5" r="1" />
          <circle cx="4.5" cy="5" r="1" />
          <circle cx="1.5" cy="8.5" r="1" />
          <circle cx="4.5" cy="8.5" r="1" />
        </svg>
      </div>
    {/if}
    <div class="flex min-w-0 flex-1 items-center justify-between gap-2">
    {#if isEditingName}
      <input
        bind:this={nameInputEl}
        type="text"
        bind:value={editingName}
        onblur={commitName}
        oninput={handleNameInput}
        onkeydown={handleNameKeydown}
        class="min-w-0 flex-1 rounded border border-teal-400 bg-white px-1 py-0.5 text-xs font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-teal-400"
      />
    {:else}
      <button
        type="button"
        onclick={handleNameClick}
        class="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-xs font-semibold text-gray-900 {onUpdateGroup && !readonly ? 'cursor-text hover:bg-gray-100' : ''}"
        title={onUpdateGroup && !readonly ? `Click to rename "${editingName}"` : editingName}
        disabled={!onUpdateGroup || readonly}
      >
        {editingName}
      </button>
    {/if}
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
        {#if onDeleteGroup && !readonly}
          <div class="relative">
            <button
              bind:this={menuButtonEl}
              type="button"
              onclick={toggleMenu}
              class="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              title="Group options"
              aria-label="Group options"
              aria-expanded={menuOpen}
            >
              <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {#if menuOpen}
              <div
                class="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  onclick={handleDeleteClick}
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete group
                </button>
              </div>
            {/if}
          </div>
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
  </div>

  {#if nameError}
    <p class="absolute left-1 top-8 z-20 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500 shadow-sm" transition:fade={{ duration: 150 }}>{nameError}</p>
  {/if}

  <div
    use:droppable={{ container: group.id, callbacks: { onDrop: handleContainerDrop } }}
    class={`grid flex-1 place-items-center content-start px-1 py-1 ${draggingId ? 'bg-white' : ''}`}
    style="grid-template-columns: 1fr; gap: var(--card-gap, 4px);"
  >
    {#if memberIds.length === 0}
      <p class="col-span-full py-6 text-center text-xs text-gray-500">{readonly ? 'No students' : 'Drop students here'}</p>
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
              {readonly}
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
