<script lang="ts">
  /**
   * GroupsPanel — group columns layout with drag-drop editing, "Make Groups" button at top.
   *
   * See: project definition.md — WP5, WP6
   */

  import type { Group, Student } from '$lib/domain';
  import type { KeyboardMoveDirection } from '$lib/components/editing/DraggableStudentCard.svelte';
  import { Alert } from '$lib/components/ui';
  import GenerationControls from './GenerationControls.svelte';
  import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';
  import DeleteGroupConfirmDialog from '$lib/components/editing/DeleteGroupConfirmDialog.svelte';
  import ShuffleConfirmDialog from './ShuffleConfirmDialog.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { cardSizeStyle } from '$lib/utils/cardSizeTokens';

  interface Props {
    groups: Group[];
    studentsById: Record<string, Student>;
    studentCount: number;
    onGenerate: (groupCount?: number) => void;
    onAssignAll: () => void;
    onShuffle: () => void;
    onImport?: () => void;
    disabled?: boolean;
    isGenerating?: boolean;
    generationError?: string | null;
    unplacedStudentCount?: number;

    // Drag-drop editing callbacks (WP6)
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
    onSortGroup?: (groupId: string, sortBy: 'firstName' | 'lastName', direction: 'asc' | 'desc') => void;
    flashingIds?: Set<string>;

    // Keyboard drag-drop (P6/P11)
    pickedUpStudentId?: string | null;
    onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
    onKeyboardDrop?: () => void;
    onKeyboardCancel?: () => void;
    onKeyboardMove?: (direction: KeyboardMoveDirection) => void;

    // Group CRUD callbacks
    onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
    onDeleteGroup?: (groupId: string) => void;
    onAddGroup?: () => void;
    newGroupId?: string | null;

    // Preference-adaptive UI (WP8 / Decision 4)
    studentPreferenceRanks?: Map<string, number | null>;
    studentHasPreferences?: Map<string, boolean>;

    // Student detail click
    onStudentClick?: (studentId: string) => void;

    // Read-only mode (published session)
    readOnly?: boolean;
  }

  let {
    groups,
    studentsById,
    studentCount,
    onGenerate,
    onAssignAll,
    onShuffle,
    onImport,
    disabled = false,
    isGenerating = false,
    generationError = null,
    unplacedStudentCount = 0,
    draggingId = null,
    onDrop,
    onReorder,
    onDragStart,
    onDragEnd,
    onSortGroup,
    flashingIds = new Set<string>(),
    onUpdateGroup,
    onDeleteGroup,
    onAddGroup,
    newGroupId = null,
    pickedUpStudentId = null,
    onKeyboardPickUp,
    onKeyboardDrop,
    onKeyboardCancel,
    onKeyboardMove,
    studentPreferenceRanks = new Map(),
    studentHasPreferences = new Map(),
    onStudentClick,
    readOnly = false
  }: Props = $props();

  // --- Group selection state (for toolbar actions) ---
  let selectedGroupId = $state<string | null>(null);

  function handleSelectGroup(groupId: string) {
    selectedGroupId = selectedGroupId === groupId ? null : groupId;
  }

  const selectedGroup = $derived(
    selectedGroupId ? groups.find((g) => g.id === selectedGroupId) ?? null : null
  );

  // --- Sort dropdown state ---
  let sortMenuOpen = $state(false);
  let sortButtonEl = $state<HTMLButtonElement | null>(null);

  function handleWindowClick(e: MouseEvent) {
    if (sortMenuOpen && sortButtonEl && !sortButtonEl.contains(e.target as Node)) {
      sortMenuOpen = false;
    }
  }

  function handleSort(sortBy: 'firstName' | 'lastName', direction: 'asc' | 'desc') {
    if (!selectedGroupId || !onSortGroup) return;
    onSortGroup(selectedGroupId, sortBy, direction);
    sortMenuOpen = false;
  }

  function handleToolbarDelete() {
    if (!selectedGroupId) return;
    handleRequestDelete(selectedGroupId);
    selectedGroupId = null;
  }

  // --- Preview group count (for the empty-state slider) ---
  // Stored as group count directly so every integer count is reachable.
  const minGroups = $derived(Math.max(1, Math.ceil(studentCount / 10)));
  const maxGroups = $derived(Math.max(1, Math.floor(studentCount / 2)));
  // Default to ~4 students per group
  const defaultGroupCount = $derived(Math.max(minGroups, Math.min(maxGroups, Math.ceil(studentCount / 4))));
  let previewGroupCount = $state<number | null>(null);
  const effectiveGroupCount = $derived(
    previewGroupCount !== null
      ? Math.max(minGroups, Math.min(maxGroups, previewGroupCount))
      : defaultGroupCount
  );

  function handleSliderInput(e: Event) {
    const count = Number((e.target as HTMLInputElement).value);
    previewGroupCount = count;
  }

  // --- Derived counts ---
  const assignedStudentCount = $derived(groups.reduce((sum, g) => sum + g.memberIds.length, 0));

  // --- Shuffle confirmation state ---
  let showShuffleConfirm = $state(false);
  const hasPlacedStudents = $derived(groups.some((g) => g.memberIds.length > 0));

  function handleShuffle() {
    if (hasPlacedStudents) {
      showShuffleConfirm = true;
      return;
    }
    onShuffle();
  }

  function handleConfirmShuffle() {
    showShuffleConfirm = false;
    onShuffle();
  }

  function handleCancelShuffle() {
    showShuffleConfirm = false;
  }

  const hasEditingCallbacks = $derived(!!onDrop);

  // --- Rename from toolbar ---
  let renamingGroupId = $state<string | null>(null);

  function handleToolbarRename() {
    if (!selectedGroupId) return;
    renamingGroupId = selectedGroupId;
  }

  function handleRenameComplete() {
    renamingGroupId = null;
  }

  // --- Delete confirmation state ---
  let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);

  function handleRequestDelete(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (uiSettings.skipDeleteGroupConfirm) {
      onDeleteGroup?.(groupId);
      return;
    }

    groupToDelete = { id: groupId, name: group.name, memberCount: group.memberIds.length };
  }

  function handleConfirmDelete(dontAskAgain: boolean) {
    if (!groupToDelete) return;
    if (dontAskAgain) {
      uiSettings.setSkipDeleteGroupConfirm(true);
    }
    onDeleteGroup?.(groupToDelete.id);
    groupToDelete = null;
  }

  function handleCancelDelete() {
    groupToDelete = null;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="flex h-full flex-col bg-gray-50">
  <!-- Header with Generation Controls -->
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
    <div>
      <h2 class="text-lg font-medium text-gray-900">Groups</h2>
      <p class="text-sm text-gray-500">
        {#if readOnly}
          Published &middot; {groups.length} groups
        {:else}
          {groups.length > 0 ? `${groups.length} groups generated` : 'No groups generated yet'}
        {/if}
      </p>
    </div>
    {#if !readOnly}
      <GenerationControls
        hasGroups={groups.length > 0}
        onAssignAll={onAssignAll}
        onShuffle={handleShuffle}
        disabled={disabled || studentCount === 0}
        {isGenerating}
        {unplacedStudentCount}
        {assignedStudentCount}
      />
    {/if}
  </div>

  <!-- Groups Display -->
  <div class="flex-1 overflow-auto">
    {#if generationError}
      <div class="p-4">
        <Alert variant="error" title="Failed to generate groups" dismissible>
          <p>{generationError}</p>
        </Alert>
      </div>
    {/if}

    {#if unplacedStudentCount > 0 && groups.length > 0}
      <div class="px-4 pt-4">
        <div class="rounded-md bg-amber-50 p-3" role="status">
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
            <p class="text-sm text-amber-800">
              {unplacedStudentCount} {unplacedStudentCount === 1 ? 'student' : 'students'} not yet in groups. Tap "Assign All" to place them.
            </p>
          </div>
        </div>
      </div>
    {/if}

    {#if groups.length > 0}
      <!-- Group actions toolbar -->
      {#if !readOnly && hasEditingCallbacks && (onSortGroup || onUpdateGroup || onDeleteGroup)}
        <div class="flex items-center gap-2 border-b border-gray-200 bg-white px-6 py-2">
          {#if onUpdateGroup}
            <button
              type="button"
              onclick={handleToolbarRename}
              disabled={!selectedGroup}
              class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors {
                !selectedGroup
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              Rename
            </button>
          {/if}

          {#if onSortGroup}
            <div class="relative">
              <button
                bind:this={sortButtonEl}
                type="button"
                onclick={() => { sortMenuOpen = !sortMenuOpen; }}
                disabled={!selectedGroup || selectedGroup.memberIds.length <= 1}
                class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors {
                  !selectedGroup || selectedGroup.memberIds.length <= 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort
              </button>
              {#if sortMenuOpen}
                <div class="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg" role="menu">
                  <button type="button" onclick={() => handleSort('firstName', 'asc')} class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100" role="menuitem">First name A–Z</button>
                  <button type="button" onclick={() => handleSort('firstName', 'desc')} class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100" role="menuitem">First name Z–A</button>
                  <button type="button" onclick={() => handleSort('lastName', 'asc')} class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100" role="menuitem">Last name A–Z</button>
                  <button type="button" onclick={() => handleSort('lastName', 'desc')} class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100" role="menuitem">Last name Z–A</button>
                </div>
              {/if}
            </div>
          {/if}

          {#if onDeleteGroup}
            <button
              type="button"
              onclick={handleToolbarDelete}
              disabled={!selectedGroup}
              class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors {
                !selectedGroup
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              }"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          {/if}
        </div>
      {/if}

      <div class="h-full p-6" style={cardSizeStyle(uiSettings.cardSize)}>
        <GroupEditingLayout
          {groups}
          {studentsById}
          layout="masonry"
          readonly={readOnly || !hasEditingCallbacks}
          {draggingId}
          {onDrop}
          {onReorder}
          {onDragStart}
          {onDragEnd}
          {flashingIds}
          {onUpdateGroup}
          {onAddGroup}
          {newGroupId}
          {pickedUpStudentId}
          {onKeyboardPickUp}
          {onKeyboardDrop}
          {onKeyboardCancel}
          {onKeyboardMove}
          {studentPreferenceRanks}
          {studentHasPreferences}
          {selectedGroupId}
          onSelectGroup={handleSelectGroup}
          {renamingGroupId}
          onRenameComplete={handleRenameComplete}
          {onStudentClick}
        />
      </div>
    {:else}
      <div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            class="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
        </div>
        {#if studentCount === 0}
          <div>
            <p class="text-lg font-medium text-gray-900">Add students to get started</p>
            <p class="mt-1 text-sm text-gray-500">Import your roster, then generate groups.</p>
          </div>
          {#if onImport}
            <button
              type="button"
              onclick={onImport}
              class="min-h-[44px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              Import Roster
            </button>
          {/if}
        {:else}
          {@const basePerGroup = Math.floor(studentCount / effectiveGroupCount)}
          {@const remainder = studentCount - basePerGroup * effectiveGroupCount}
          {@const largeSize = basePerGroup + 1}
          {@const smallSize = basePerGroup}

          <div class="w-full max-w-lg px-8">
            <!-- Header -->
            <div class="mb-6 text-center">
              <p class="text-lg font-medium text-gray-900">Ready to make groups</p>
              <p class="mt-1 text-sm text-gray-500">
                {studentCount}
                {studentCount === 1 ? 'student' : 'students'} in roster
              </p>
            </div>

            <!-- Slider — drives number of groups directly, so every count is reachable -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <label for="group-count-slider" class="text-sm font-medium text-gray-700">Number of groups</label>
                <span class="text-sm font-semibold text-teal-700 tabular-nums">{effectiveGroupCount}</span>
              </div>
              <input
                id="group-count-slider"
                type="range"
                min={minGroups}
                max={maxGroups}
                value={effectiveGroupCount}
                step="1"
                oninput={handleSliderInput}
                disabled={disabled || isGenerating}
                class="w-full h-2 rounded-lg appearance-none cursor-pointer accent-teal-600 bg-gray-200"
              />
              <div class="flex justify-between mt-1 text-xs text-gray-400">
                <span>{minGroups}</span>
                <span>{maxGroups}</span>
              </div>
            </div>

            <!-- Summary -->
            <div class="mb-5 rounded-lg bg-teal-50 border border-teal-100 px-4 py-3 text-center">
              <p class="text-sm text-teal-800">
                {#if remainder === 0}
                  <span class="font-semibold">{effectiveGroupCount}</span>
                  {effectiveGroupCount === 1 ? 'group' : 'groups'} of
                  <span class="font-semibold">{smallSize}</span>
                {:else}
                  <span class="font-semibold">{remainder}</span>
                  {remainder === 1 ? 'group' : 'groups'} of
                  <span class="font-semibold">{largeSize}</span>
                  &nbsp;and&nbsp;
                  <span class="font-semibold">{effectiveGroupCount - remainder}</span>
                  of <span class="font-semibold">{smallSize}</span>
                {/if}
              </p>
            </div>

            <!-- Preview grid -->
            <div class="mb-6 flex flex-wrap justify-center gap-3">
              {#each Array(effectiveGroupCount) as _, i}
                {@const membersInThisGroup = i < remainder ? largeSize : smallSize}
                <div class="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm min-w-[68px]">
                  <span class="text-[11px] font-medium text-gray-500">Group {i + 1}</span>
                  <div class="flex flex-wrap justify-center gap-1">
                    {#each Array(membersInThisGroup) as _}
                      <div class="h-4 w-4 rounded-full bg-teal-200"></div>
                    {/each}
                  </div>
                  <span class="text-[11px] tabular-nums text-gray-400">{membersInThisGroup}</span>
                </div>
              {/each}
            </div>

            <!-- Make Groups button -->
            <div class="text-center">
              <button
                type="button"
                onclick={() => onGenerate(effectiveGroupCount)}
                disabled={disabled || isGenerating}
                class="min-h-[44px] rounded-md bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                Make Groups
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if groupToDelete}
  <DeleteGroupConfirmDialog
    groupName={groupToDelete.name}
    memberCount={groupToDelete.memberCount}
    onConfirm={handleConfirmDelete}
    onCancel={handleCancelDelete}
  />
{/if}

{#if showShuffleConfirm}
  <ShuffleConfirmDialog
    onConfirm={handleConfirmShuffle}
    onCancel={handleCancelShuffle}
  />
{/if}
