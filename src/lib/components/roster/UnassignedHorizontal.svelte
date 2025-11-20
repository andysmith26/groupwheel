<script lang="ts">
	/**
	 * UnassignedHorizontal: Horizontal roster for unassigned students.
	 *
	 * Positioned at top of page, wraps naturally when many students.
	 * Consistent across both horizontal and vertical group layouts.
	 */

	import { droppable, type DropState } from '$lib/utils/pragmatic-dnd';
	import { getAppDataContext } from '$lib/contexts/appData';
	import StudentCard from '$lib/components/student/StudentCard.svelte';
	import type { StudentPreference } from '$lib/types/preferences';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';

	interface Props {
		studentIds?: string[];
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		flashingContainer: string | null;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
	}

	let {
		studentIds = [],
		selectedStudentId,
		currentlyDragging,
		flashingContainer,
		onDrop,
		onDragStart,
		onClick
	}: Props = $props();

	// Access students and preferences from context
	const { studentsById, preferencesById } = getAppDataContext();

	// Determine which students are preferred by the selected student
	const selectedStudentFriendIds = $derived.by(() => {
		if (!selectedStudentId) return new Set<string>();
		const pref: StudentPreference | undefined = preferencesById[selectedStudentId];
		if (!pref) return new Set<string>();
		return new Set(pref.likeStudentIds);
	});
</script>

<div class="unassigned-horizontal">
	<div class="unassigned-header">
		<h3 class="unassigned-title">Unassigned</h3>
		<span class="count">{studentIds.length}</span>
	</div>

	<div
		class="unassigned-roster rendering-isolated"
		class:flash-success={flashingContainer === 'unassigned'}
		use:droppable={{ container: 'unassigned', callbacks: { onDrop } }}
	>
		{#each studentIds as studentId (studentId)}
			{@const student = studentsById[studentId]}
			{#if student}
				<StudentCard
					{student}
					isSelected={selectedStudentId === studentId}
					isDragging={currentlyDragging === studentId}
					isFriendOfSelected={selectedStudentFriendIds.has(studentId)}
					container="unassigned"
					onDragStart={() => onDragStart?.(studentId)}
					onClick={() => onClick?.(studentId)}
				/>
			{:else}
				<div class="error-card">Unknown student: {studentId}</div>
			{/if}
		{/each}

		{#if studentIds.length === 0}
			<div class="empty-state">All students assigned ✓</div>
		{/if}
	</div>
</div>

<style>
	@import '$lib/styles/animations.css';

	.unassigned-horizontal {
		background: white;
		border: 2px dashed #d1d5db;
		border-radius: 8px;
		padding: 12px;
	}

	.unassigned-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 2px dashed #e5e7eb;
	}

	.unassigned-title {
		font-size: 16px;
		font-weight: 600;
		color: #6b7280;
		margin: 0;
	}

	.count {
		font-size: 13px;
		color: #9ca3af;
		font-weight: 500;
	}

	.unassigned-roster {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-height: 60px;
		align-items: flex-start;
		/* Smooth transition for drop feedback */
		transition: background 350ms cubic-bezier(0.15, 1, 0.3, 1);
	}

	/* Success flash animation */
	.unassigned-roster.flash-success {
		animation: flash 700ms ease-in-out;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 60px;
		color: #10b981;
		font-size: 14px;
		font-weight: 500;
	}

	.error-card {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		border-radius: 4px;
		padding: 8px 12px;
		color: #991b1b;
		font-size: 13px;
	}
</style>
