<script lang="ts">
  /**
   * GroupsPanel — group columns layout with drag-drop editing, "Make Groups" button at top.
   *
   * See: project definition.md — WP5, WP6
   */

  import type { Group, Student } from '$lib/domain';
  import type { KeyboardMoveDirection } from '$lib/components/editing/DraggableStudentCard.svelte';
  import { Alert } from '$lib/components/ui';
  import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';
  import DeleteGroupConfirmDialog from '$lib/components/editing/DeleteGroupConfirmDialog.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { cardSizeStyle } from '$lib/utils/cardSizeTokens';

  interface Props {
    groups: Group[];
    studentsById: Record<string, Student>;
    studentCount: number;
    onGenerate: (groupCount?: number) => void;
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

  const hasEditingCallbacks = $derived(!!onDrop);

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

<div class="flex h-full flex-col bg-gray-50">
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

