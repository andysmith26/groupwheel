<script lang="ts">
  import type { Group, Student } from '$lib/domain';
  import { calculateRowSpan } from '$lib/utils/groups';
  import EditableGroupColumn from './EditableGroupColumn.svelte';
  import AddGroupCard from './AddGroupCard.svelte';
  import HorizontalScrollContainer from '$lib/components/ui/HorizontalScrollContainer.svelte';
  import type { KeyboardMoveDirection } from './DraggableStudentCard.svelte';
  import { uiSettings } from '$lib/stores/uiSettings.svelte';
  import { getGroupColWidthPx } from '$lib/utils/cardSizeTokens';

  export type LayoutMode = 'masonry' | 'row';

  // =============================================================================
  // ROW MODE CONFIGURATION - Reactive based on card size setting
  // =============================================================================
  const rowConfig = $derived({
    itemWidth: getGroupColWidthPx(uiSettings.cardSize),
    itemGap: 12,
    scrollItemCount: 3,
    fadeWidth: 48,
    scrollDebounceMs: 50,
    edgeThreshold: 5
  });

  const {
    groups = [],
    studentsById = {},
    draggingId = null,
    onDrop,
    onReorder,
    onDragStart,
    onDragEnd,
    flashingIds = new Set<string>(),
    onUpdateGroup,
    onDeleteGroup,
    onAddGroup,
    onAlphabetize,
    newGroupId = null,
    selectedStudentPreferences = null,
    layout = 'masonry',
    readonly = false,
    studentPreferenceRanks = new Map<string, number | null>(),
    studentHasPreferences = new Map<string, boolean>(),
    onStudentHoverStart,
    onStudentHoverEnd,
    rowOrderTop = [],
    rowOrderBottom = [],
    pickedUpStudentId = null,
    onKeyboardPickUp,
    onKeyboardDrop,
    onKeyboardCancel,
    onKeyboardMove,
    onStudentClick
  } = $props<{
    groups?: Group[];
    studentsById?: Record<string, Student>;
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
    onAddGroup?: () => void;
    onAlphabetize?: (groupId: string) => void;
    newGroupId?: string | null;
    selectedStudentPreferences?: string[] | null;
    layout?: LayoutMode;
    /** When true, suppresses drag-drop affordances and empty-group placeholder text. */
    readonly?: boolean;
    studentPreferenceRanks?: Map<string, number | null>;
    studentHasPreferences?: Map<string, boolean>;
    onStudentHoverStart?: (studentId: string, x: number, y: number) => void;
    onStudentHoverEnd?: () => void;
    rowOrderTop?: string[];
    rowOrderBottom?: string[];
    pickedUpStudentId?: string | null;
    onKeyboardPickUp?: (studentId: string, container: string, index: number) => void;
    onKeyboardDrop?: () => void;
    onKeyboardCancel?: () => void;
    onKeyboardMove?: (direction: KeyboardMoveDirection) => void;
    onStudentClick?: (studentId: string) => void;
  }>();

  // Helper to get sibling group names for duplicate validation
  function getSiblingNames(groupId: string): string[] {
    return groups.filter((g: Group) => g.id !== groupId).map((g: Group) => g.name);
  }

  // Helper to get preference rank for a group
  function getPreferenceRank(groupId: string): number | null {
    if (!selectedStudentPreferences || selectedStudentPreferences.length === 0) {
      return null;
    }
    const index = selectedStudentPreferences.indexOf(groupId);
    const rank = index >= 0 ? index + 1 : null;
    return rank;
  }
</script>

{#if layout === 'row'}
  <HorizontalScrollContainer
    totalItems={groups.length + (onAddGroup ? 1 : 0)}
    config={rowConfig}
    showProgress={false}
    ariaLabel="Group cards"
  >
    <div class="group-row">
      {#each groups as group, i (`${group.id}-${i}`)}
        <EditableGroupColumn
          {group}
          {studentsById}
          {draggingId}
          rowSpan={1}
          {readonly}
          {onDrop}
          {onReorder}
          {onDragStart}
          {onDragEnd}
          {flashingIds}
          {onUpdateGroup}
          {onDeleteGroup}
          {onAlphabetize}
          focusNameOnMount={group.id === newGroupId}
          siblingGroupNames={getSiblingNames(group.id)}
          preferenceRank={getPreferenceRank(group.id)}
          {studentPreferenceRanks}
          {studentHasPreferences}
          {onStudentHoverStart}
          {onStudentHoverEnd}
          {pickedUpStudentId}
          {onKeyboardPickUp}
          {onKeyboardDrop}
          {onKeyboardCancel}
          {onKeyboardMove}
          {onStudentClick}
          draggedStudentPreferences={selectedStudentPreferences}
        />
      {/each}
    </div>
  </HorizontalScrollContainer>
{:else}
  <div class="group-grid">
    {#each groups as group, i (`${group.id}-${i}`)}
      <EditableGroupColumn
        {group}
        {studentsById}
        {draggingId}
        rowSpan={calculateRowSpan(group)}
        {readonly}
        {onDrop}
        {onReorder}
        {onDragStart}
        {onDragEnd}
        {flashingIds}
        {onUpdateGroup}
        {onDeleteGroup}
        {onAlphabetize}
        focusNameOnMount={group.id === newGroupId}
        siblingGroupNames={getSiblingNames(group.id)}
        preferenceRank={getPreferenceRank(group.id)}
        {studentPreferenceRanks}
        {studentHasPreferences}
        {onStudentHoverStart}
        {onStudentHoverEnd}
        {pickedUpStudentId}
        {onKeyboardPickUp}
        {onKeyboardDrop}
        {onKeyboardCancel}
        {onKeyboardMove}
        {onStudentClick}
        draggedStudentPreferences={selectedStudentPreferences}
      />
    {/each}

    {#if onAddGroup && !readonly}
      <AddGroupCard {onAddGroup} rowSpan={groups.length > 0 ? calculateRowSpan(groups[0]) : 4} />
    {/if}
  </div>
{/if}

<style>
  .group-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }

  .group-grid > :global(*) {
    width: var(--group-col-width, 136px);
    flex-shrink: 0;
  }

  .group-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    justify-content: center;
    gap: 12px;
    width: max-content;
    margin: 0 auto;
  }

  .group-row > :global(*) {
    width: var(--group-col-width, 136px);
    flex-shrink: 0;
  }
</style>
