<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Group, Student } from '$lib/domain';
  import { droppable, type Edge, type SortableDropState } from '$lib/utils/pragmatic-dnd';
  import DraggableStudentCard, { type KeyboardMoveDirection } from './DraggableStudentCard.svelte';
  import DropIndicator from './DropIndicator.svelte';
  import { getCapacityStatus } from '$lib/utils/groups';
  import { resolveGroupColorHex } from '$lib/utils/groupColors';

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
    selected = false,
    onSelect,
    renamingGroupId = null,
    onRenameComplete,
    clickedStudentId = null
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
    /** Whether this group is currently selected in the toolbar. */
    selected?: boolean;
    /** Called when user clicks header to select this group. */
    onSelect?: (groupId: string) => void;
    /** When set to this group's ID, triggers inline rename from the toolbar. */
    renamingGroupId?: string | null;
    /** Called when rename completes or is cancelled, to clear the toolbar state. */
    onRenameComplete?: () => void;
    /** ID of the click-selected student (for blue border in card). */
    clickedStudentId?: string | null;
  }>();

  const capacityStatus = $derived(getCapacityStatus(group));
  const leftBorderColor = $derived(resolveGroupColorHex(group));

  // Preference rank styling — highlights top 4 choices
  const preferenceStyles = $derived(() => {
    if (preferenceRank === null || preferenceRank > 4) return null;

    if (preferenceRank === 1) {
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        badgeBg: 'bg-green-100',
        label: '1st Choice'
      };
    }

    if (preferenceRank === 2) {
      return {
        borderColor: 'border-amber-400',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        badgeBg: 'bg-amber-100',
        label: '2nd Choice'
      };
    }

    // 3rd and 4th: moderate, similar styling
    return {
      borderColor: 'border-orange-300',
      bgColor: 'bg-orange-50/60',
      textColor: 'text-orange-600',
      badgeBg: 'bg-orange-100',
      label: preferenceRank === 3 ? '3rd Choice' : '4th Choice'
    };
  });

  // Ring highlight for preferred groups — bold for 1st/2nd, subtle for 3rd/4th
  const highlightRingClass = $derived.by(() => {
    if (preferenceRank === null || preferenceRank > 4) return '';
    if (preferenceRank === 1)
      return 'ring-2 ring-offset-1 ring-green-400 shadow-lg shadow-green-200/50';
    if (preferenceRank === 2)
      return 'ring-2 ring-offset-1 ring-amber-400 shadow-lg shadow-amber-200/50';
    // 3rd/4th: light ring
    return 'ring-1 ring-orange-300';
  });

  // Local editing state for inline rename
  let editingName = $state(group.name);
  let isEditingName = $state(focusNameOnMount);
  let nameInputEl = $state<HTMLInputElement | null>(null);
  let nameError = $state<string | null>(null);
  let nameErrorTimeout: ReturnType<typeof setTimeout> | null = null;

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

  // Trigger inline rename from toolbar
  $effect(() => {
    if (renamingGroupId === group.id && !isEditingName) {
      isEditingName = true;
    }
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
    nameErrorTimeout = setTimeout(() => {
      nameError = null;
    }, 2000);
  }

  function isDuplicateName(name: string): boolean {
    return siblingGroupNames.some((n: string) => n.toLowerCase() === name.toLowerCase());
  }

  function commitName() {
    const trimmed = editingName.trim();

    if (trimmed.length === 0) {
      editingName = group.name;
      isEditingName = false;
      onRenameComplete?.();
      return;
    }

    if (trimmed === group.name) {
      isEditingName = false;
      onRenameComplete?.();
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
    onRenameComplete?.();
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
      onRenameComplete?.();
    }
  }

  function handleHeaderClick() {
    onSelect?.(group.id);
  }

  function handleNameDblClick() {
    if (!onUpdateGroup || readonly) return;
    isEditingName = true;
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

<div class="relative flex flex-col" style={`grid-row: span ${rowSpan}; height: 100%;`}>
  <!-- Preference choice label: single stable div avoids layout shift when switching students -->
  {#if studentPreferenceRanks.size > 0}
    <div
      class={`shrink-0 pb-0.5 text-center text-[11px] font-semibold ${preferenceStyles() ? preferenceStyles()!.textColor : 'text-transparent'}`}
    >
      {preferenceStyles() && !draggingId ? preferenceStyles()!.label : '\u00A0'}
    </div>
  {/if}

  <div
    class={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 shadow-sm ${
      preferenceStyles()
        ? `${preferenceStyles()!.borderColor} ${preferenceStyles()!.bgColor}`
        : selected
          ? 'border-teal-400 bg-gray-50'
          : 'border-gray-200 bg-gray-50'
    } ${highlightRingClass}`}
  >
    <!-- Top color bar -->
    <div class="h-1.5 w-full shrink-0" style={`background-color: ${leftBorderColor};`}></div>

    <!-- Header: name + count -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5"
      onclick={handleHeaderClick}
    >
      {#if isEditingName}
        <input
          bind:this={nameInputEl}
          type="text"
          bind:value={editingName}
          onblur={commitName}
          oninput={handleNameInput}
          onkeydown={handleNameKeydown}
          onclick={(e) => e.stopPropagation()}
          class="min-w-0 flex-1 rounded border border-teal-400 bg-white px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-teal-400"
        />
      {:else}
        <span
          class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900"
          ondblclick={handleNameDblClick}
          title={onUpdateGroup && !readonly
            ? `Double-click to rename "${editingName}"`
            : editingName}
        >
          {editingName}
        </span>
      {/if}
      {#if !draggingId || !draggedStudentPreferences}
        <span
          class={`shrink-0 text-xs ${
            capacityStatus.isOverEnrolled ? 'font-medium text-violet-600' : 'text-gray-400'
          }`}
        >
          {capacityLabel()}
        </span>
      {/if}
    </div>

    {#if nameError}
      <p
        class="absolute top-10 left-2 z-20 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500 shadow-sm"
        transition:fade={{ duration: 150 }}
      >
        {nameError}
      </p>
    {/if}

    <div
      use:droppable={{ container: group.id, callbacks: { onDrop: handleContainerDrop } }}
      class={`grid flex-1 place-items-center content-start px-1 py-1 ${draggingId ? 'bg-white' : ''}`}
      style="grid-template-columns: 1fr; gap: var(--card-gap, 4px);"
    >
      {#if memberIds.length === 0}
        <p class="col-span-full py-6 text-center text-xs text-gray-500">
          {readonly ? 'No students' : 'Drop students here'}
        </p>
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
                isSelected={clickedStudentId === memberId}
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
</div>
