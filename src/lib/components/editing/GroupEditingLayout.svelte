<script lang="ts">
	import type { Group, Student } from '$lib/domain';
	import { calculateRowSpan } from '$lib/utils/groups';
	import EditableGroupColumn from './EditableGroupColumn.svelte';
	import AddGroupCard from './AddGroupCard.svelte';
	import HorizontalScrollContainer from '$lib/components/ui/HorizontalScrollContainer.svelte';

	export type LayoutMode = 'masonry' | 'row';

	// =============================================================================
	// ROW MODE CONFIGURATION - Centralized magic numbers
	// =============================================================================
	const ROW_CONFIG = {
		/** Width of each group card in pixels */
		itemWidth: 220,
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
		selectedStudentId = null,
		draggingId = null,
		onDrop,
		onSelect,
		onDragStart,
		onDragEnd,
		flashingIds = new Set<string>(),
		onUpdateGroup,
		onDeleteGroup,
		onAddGroup,
		newGroupId = null,
		selectedStudentPreferences = null,
		layout = 'masonry',
		studentPreferenceRanks = new Map<string, number | null>(),
		onStudentHoverStart,
		onStudentHoverEnd
	} = $props<{
		groups?: Group[];
		studentsById?: Record<string, Student>;
		selectedStudentId?: string | null;
		draggingId?: string | null;
		onDrop?: (payload: { studentId: string; source: string; target: string }) => void;
		onSelect?: (id: string) => void;
		onDragStart?: (id: string) => void;
		onDragEnd?: () => void;
		flashingIds?: Set<string>;
		onUpdateGroup?: (groupId: string, changes: Partial<Pick<Group, 'name' | 'capacity'>>) => void;
		onDeleteGroup?: (groupId: string) => void;
		onAddGroup?: () => void;
		newGroupId?: string | null;
		selectedStudentPreferences?: string[] | null;
		layout?: LayoutMode;
		studentPreferenceRanks?: Map<string, number | null>;
		onStudentHoverStart?: (studentId: string, x: number, y: number) => void;
		onStudentHoverEnd?: () => void;
	}>();

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
		config={ROW_CONFIG}
		showProgress={true}
		progressVariant="fraction"
		ariaLabel="Group cards"
	>
		<div class="group-row">
			{#each groups as group (group.id)}
				<EditableGroupColumn
					{group}
					{studentsById}
					{selectedStudentId}
					{draggingId}
					rowSpan={1}
					{onDrop}
					{onSelect}
					{onDragStart}
					{onDragEnd}
					{flashingIds}
					{onUpdateGroup}
					{onDeleteGroup}
					focusNameOnMount={group.id === newGroupId}
					preferenceRank={getPreferenceRank(group.id)}
					{studentPreferenceRanks}
					{onStudentHoverStart}
					{onStudentHoverEnd}
				/>
			{/each}

			{#if onAddGroup}
				<AddGroupCard rowSpan={1} {onAddGroup} />
			{/if}
		</div>
	</HorizontalScrollContainer>
{:else}
	<div class="group-grid">
		{#each groups as group (group.id)}
			<EditableGroupColumn
				{group}
				{studentsById}
				{selectedStudentId}
				{draggingId}
				rowSpan={calculateRowSpan(group)}
				{onDrop}
				{onSelect}
				{onDragStart}
				{onDragEnd}
				{flashingIds}
				{onUpdateGroup}
				{onDeleteGroup}
				focusNameOnMount={group.id === newGroupId}
				preferenceRank={getPreferenceRank(group.id)}
				{studentPreferenceRanks}
				{onStudentHoverStart}
				{onStudentHoverEnd}
			/>
		{/each}

		{#if onAddGroup}
			<AddGroupCard rowSpan={4} {onAddGroup} />
		{/if}
	</div>
{/if}

<style>
	.group-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		grid-auto-rows: 40px;
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
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 12px;
	}

	.group-row > :global(*) {
		flex: 0 0 auto;
		width: 220px;
	}
</style>
