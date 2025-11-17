<script lang="ts">
	/**
	 * HorizontalGroupLayout: Flexbox-based layout for ≤5 groups
	 *
	 * Uses flexbox with align-items: flex-start to prevent equal-height stretching.
	 * Groups wrap naturally, each with min-width 200px and max-width 280px.
	 */

	import type { Group } from '$lib/types';
	import type { DropState } from '$lib/utils/pragmatic-dnd';
	import GroupColumn from './GroupColumn.svelte';

	interface Props {
		groups: Group[];
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
		onUpdateGroup?: (groupId: string, changes: Partial<Group>) => void;
	}

	let {
		groups,
		selectedStudentId,
		currentlyDragging,
		onDrop,
		onDragStart,
		onClick,
		onUpdateGroup
	}: Props = $props();
</script>

<div class="horizontal-layout">
	{#each groups as group (group.id)}
		<GroupColumn
			{group}
			{selectedStudentId}
			{currentlyDragging}
			{onDrop}
			{onDragStart}
			{onClick}
			{onUpdateGroup}
		/>
	{/each}
</div>

<style>
	.horizontal-layout {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px;
	}

	.horizontal-layout > :global(*) {
		flex: 1 1 200px;
		max-width: 280px;
	}
</style>
