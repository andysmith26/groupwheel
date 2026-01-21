<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { calculateRowSpan } from '$lib/utils/groups';
	import EditableGroupColumn from './EditableGroupColumn.svelte';
	import HorizontalScrollContainer from '$lib/components/ui/HorizontalScrollContainer.svelte';
	import type { KeyboardMoveDirection } from './DraggableStudentCard.svelte';

	export type LayoutMode = 'masonry' | 'row';

	// =============================================================================
	// ROW MODE CONFIGURATION - Centralized magic numbers
	// =============================================================================
	const ROW_CONFIG = {
		/** Width of each group card in pixels */
		itemWidth: 136,
		/** Gap between cards in pixels */
		itemGap: 12,
		/** Number of cards to scroll per button click */
		scrollItemCount: 3,
		/** Width of edge fade gradients in pixels */
		fadeWidth: 48,
		/** Debounce delay for scroll events in ms */
		scrollDebounceMs: 50,
		/** Threshold to consider "at edge" in pixels */
		edgeThreshold: 5
	} as const;

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
		onKeyboardMove
	} = $props<{
		groups?: Group[];
		studentsById?: Record<string, Student>;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string; targetIndex?: number }) => void;
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
	}>();

	type RowLayoutItem = { type: 'group'; group: Group } | { type: 'spacer'; key: string };

	const rowLayoutItems = $derived.by((): RowLayoutItem[] => {
		if (layout !== 'row') return [];
		if (groups.length === 0) return [];

		const groupsById = new Map(groups.map((group: Group) => [group.id, group] as const));
		const hasCustomRowLayout = rowOrderTop.length > 0 || rowOrderBottom.length > 0;
		const topRow = hasCustomRowLayout
			? (rowOrderTop.map((id: string) => groupsById.get(id)).filter(Boolean) as Group[])
			: groups;
		const bottomRow = hasCustomRowLayout
			? (rowOrderBottom.map((id: string) => groupsById.get(id)).filter(Boolean) as Group[])
			: [];

		const columns = Math.max(topRow.length, bottomRow.length);
		const items: RowLayoutItem[] = [];

		for (let i = 0; i < columns; i += 1) {
			if (topRow[i]) {
				items.push({
					type: 'group',
					group: topRow[i]
				});
			} else {
				items.push({ type: 'spacer', key: `spacer-top-${i}` });
			}

			if (bottomRow[i]) {
				items.push({
					type: 'group',
					group: bottomRow[i]
				});
			}
		}

		return items;
	});

	const rowColumnCount = $derived.by(() => {
		if (layout !== 'row') return groups.length;
		const count = Math.max(rowOrderTop.length, rowOrderBottom.length);
		return count > 0 ? count : groups.length;
	});

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
		totalItems={rowColumnCount + (onAddGroup ? 1 : 0)}
		config={ROW_CONFIG}
		showProgress={false}
		ariaLabel="Group cards"
	>
		<div class="group-row">
			{#each rowLayoutItems as item, i (item.type === 'group' ? `${item.group.id}-${i}` : item.key)}
				{#if item.type === 'group'}
					<EditableGroupColumn
						group={item.group}
						{studentsById}
						{draggingId}
						rowSpan={1}
						{onDrop}
						{onReorder}
						{onDragStart}
						{onDragEnd}
						{flashingIds}
						{onUpdateGroup}
						{onDeleteGroup}
						{onAlphabetize}
						focusNameOnMount={item.group.id === newGroupId}
						preferenceRank={getPreferenceRank(item.group.id)}
						{studentPreferenceRanks}
						{studentHasPreferences}
						{onStudentHoverStart}
						{onStudentHoverEnd}
						{pickedUpStudentId}
						{onKeyboardPickUp}
						{onKeyboardDrop}
						{onKeyboardCancel}
						{onKeyboardMove}
					/>
				{:else}
					<div class="group-spacer" aria-hidden="true"></div>
				{/if}
			{/each}

			<!-- Add Group card removed for compact view -->
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
				{onDrop}
				{onReorder}
				{onDragStart}
				{onDragEnd}
				{flashingIds}
				{onUpdateGroup}
				{onDeleteGroup}
				{onAlphabetize}
				focusNameOnMount={group.id === newGroupId}
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
			/>
		{/each}

		<!-- Add Group card removed for compact view -->
	</div>
{/if}

<style>
	.group-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		grid-auto-rows: min-content;
		grid-auto-flow: dense;
		gap: 16px;
	}

	@media (min-width: 768px) {
		.group-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.group-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.group-row {
		display: grid;
		grid-auto-flow: column;
		grid-template-rows: repeat(2, auto);
		align-items: stretch;
		justify-content: center;
		gap: 12px;
		width: max-content;
		margin: 0 auto;
	}

	.group-row > :global(*) {
		width: 136px;
	}

	.group-spacer {
		width: 136px;
	}
</style>
