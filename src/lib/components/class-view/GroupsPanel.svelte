<script lang="ts">
  /**
   * GroupsPanel — group columns layout with drag-drop editing, "Make Groups" button at top.
   *
   * See: project definition.md — WP5, WP6
   */

  import type { Group, Student } from '$lib/domain';
  import type { KeyboardMoveDirection } from '$lib/components/editing/DraggableStudentCard.svelte';
  import GenerationControls from './GenerationControls.svelte';
  import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';
  import DeleteGroupConfirmDialog from '$lib/components/editing/DeleteGroupConfirmDialog.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { cardSizeStyle } from '$lib/utils/cardSizeTokens';

  interface Props {
    groups: Group[];
    studentsById: Record<string, Student>;
    studentCount: number;
    groupSize: number;
    onGroupSizeChange: (size: number) => void;
    onGenerate: (groupSize: number) => void;
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
    onAlphabetize?: (groupId: string) => void;
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

    // Group reordering
    onReorderGroups?: (payload: { draggedGroupId: string; targetGroupId: string; edge: 'left' | 'right' }) => void;
  }

  let {
    groups,
    studentsById,
    studentCount,
    groupSize,
    onGroupSizeChange,
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
    onAlphabetize,
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
    onReorderGroups
  }: Props = $props();

  function handleGenerate() {
    onGenerate(groupSize);
  }

  const hasEditingCallbacks = $derived(!!onDrop);

  // --- Delete confirmation state ---
  const SKIP_DELETE_CONFIRM_KEY = 'groupwheel:skipDeleteGroupConfirm';

  let groupToDelete = $state<{ id: string; name: string; memberCount: number } | null>(null);
  let skipDeleteConfirm = $state(
    typeof localStorage !== 'undefined' && localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === 'true'
  );

  function handleRequestDelete(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (skipDeleteConfirm) {
      onDeleteGroup?.(groupId);
      return;
    }

    groupToDelete = { id: groupId, name: group.name, memberCount: group.memberIds.length };
  }

  function handleConfirmDelete(dontAskAgain: boolean) {
    if (!groupToDelete) return;
    if (dontAskAgain) {
      skipDeleteConfirm = true;
      try { localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, 'true'); } catch { /* ignore */ }
    }
    onDeleteGroup?.(groupToDelete.id);
    groupToDelete = null;
  }

  function handleCancelDelete() {
    groupToDelete = null;
  }
</script>

<div class="flex h-full flex-col bg-gray-50">
  <!-- Header with Generation Controls -->
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
    <div>
      <h2 class="text-lg font-medium text-gray-900">Groups</h2>
      <p class="text-sm text-gray-500">
        {groups.length > 0 ? `${groups.length} groups generated` : 'No groups generated yet'}
      </p>
    </div>
    <GenerationControls
      {groupSize}
      onGroupSizeChange={(size) => onGroupSizeChange(size)}
      onGenerate={handleGenerate}
      disabled={disabled || studentCount === 0}
      {isGenerating}
      maxGroupSize={studentCount}
    />
  </div>

  <!-- Groups Display -->
  <div class="flex-1 overflow-auto">
    {#if generationError}
      <div class="p-4">
        <div class="rounded-md bg-red-50 p-4" role="alert">
          <div class="flex">
            <div class="shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Failed to generate groups</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{generationError}</p>
              </div>
            </div>
          </div>
        </div>
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
              {unplacedStudentCount} new {unplacedStudentCount === 1 ? 'student' : 'students'} not yet in groups. Tap "Make Groups" to include {unplacedStudentCount === 1 ? 'them' : 'everyone'}.
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
          readonly={!hasEditingCallbacks}
          {draggingId}
          {onDrop}
          {onReorder}
          {onDragStart}
          {onDragEnd}
          {onAlphabetize}
          {flashingIds}
          {onUpdateGroup}
          onDeleteGroup={onDeleteGroup ? handleRequestDelete : undefined}
          {onAddGroup}
          {newGroupId}
          {pickedUpStudentId}
          {onKeyboardPickUp}
          {onKeyboardDrop}
          {onKeyboardCancel}
          {onKeyboardMove}
          {studentPreferenceRanks}
          {studentHasPreferences}
          {onReorderGroups}
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
          <div>
            <p class="text-lg font-medium text-gray-900">Ready to make groups</p>
            <p class="mt-1 text-sm text-gray-500">
              {studentCount}
              {studentCount === 1 ? 'student' : 'students'} in roster. Generate groups to get started.
            </p>
          </div>
          <button
            type="button"
            onclick={handleGenerate}
            disabled={disabled || isGenerating}
            class="min-h-[44px] rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            Make Groups
          </button>
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
