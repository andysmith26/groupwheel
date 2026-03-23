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
    onAddGroup,
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
    onStudentClick,
    selectedGroupId = null,
    onSelectGroup,
    renamingGroupId = null,
    onRenameComplete,
    clickedStudentId = null
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
    onAddGroup?: () => void;
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
    /** ID of the currently selected group (for toolbar actions). */
    selectedGroupId?: string | null;
    /** Called when a group header is clicked to select/deselect. */
    onSelectGroup?: (groupId: string) => void;
    /** When set, triggers inline rename on the matching group column. */
    renamingGroupId?: string | null;
    /** Called when rename completes or is cancelled. */
    onRenameComplete?: () => void;
    /** ID of the click-selected student (for blue border highlight). */
    clickedStudentId?: string | null;
  }>();

  // Helper to get sibling group names for duplicate validation
  function getSiblingNames(groupId: string): string[] {
    return groups.filter((g: Group) => g.id !== groupId).map((g: Group) => g.name);
  }

  /**
   * Resolve a preference entry (ID or name) to a group ID.
   * Returns null if the preference doesn't match any existing group.
   */
  function resolveToGroupId(choice: string): string | null {
    // Direct ID match
    const byId = groups.find((g: Group) => g.id === choice);
    if (byId) return byId.id;
    // Fallback: case-insensitive name match
    const lower = choice.toLowerCase();
    const byName = groups.find((g: Group) => g.name.toLowerCase() === lower);
    return byName ? byName.id : null;
  }

  /**
   * Sanitized preferences: resolve to group IDs, drop non-existent groups,
   * skip blanks, and deduplicate (keep first occurrence only).
   */
  const cleanedPreferences = $derived.by(() => {
    if (!selectedStudentPreferences || selectedStudentPreferences.length === 0) return null;
    const seen = new Set<string>();
    const result: string[] = [];
    for (const choice of selectedStudentPreferences) {
      if (!choice) continue; // skip empty/blank entries
      const gid = resolveToGroupId(choice);
      if (!gid || seen.has(gid)) continue; // skip unknown groups & duplicates
      seen.add(gid);
      result.push(gid);
    }
    return result.length > 0 ? result : null;
  });

  // Helper to get preference rank for a group using cleaned preferences
  function getPreferenceRank(group: Group): number | null {
    if (!cleanedPreferences) return null;
    const index = cleanedPreferences.indexOf(group.id);
    return index >= 0 ? index + 1 : null;
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
          focusNameOnMount={group.id === newGroupId}
          siblingGroupNames={getSiblingNames(group.id)}
          preferenceRank={getPreferenceRank(group)}
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
          draggedStudentPreferences={cleanedPreferences}
          selected={selectedGroupId === group.id}
          onSelect={onSelectGroup}
          {renamingGroupId}
          {onRenameComplete}
          {clickedStudentId}
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
        focusNameOnMount={group.id === newGroupId}
        siblingGroupNames={getSiblingNames(group.id)}
        preferenceRank={getPreferenceRank(group)}
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
        draggedStudentPreferences={cleanedPreferences}
        selected={selectedGroupId === group.id}
        onSelect={onSelectGroup}
        {renamingGroupId}
        {onRenameComplete}
        {clickedStudentId}
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
