<script lang="ts">
	/**
	 * UnassignedSidebar: Collapsible vertical sidebar for unassigned students.
	 *
	 * Features:
	 * - Collapsible with toggle button (chevron icon)
	 * - 200px width when expanded, 40px when collapsed
	 * - Independent scrolling
	 * - Darker background to differentiate from groups
	 * - Count badge when collapsed
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
		isCollapsed: boolean;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
		onToggleCollapse: () => void;
	}

	let {
		studentIds = [],
		selectedStudentId,
		currentlyDragging,
		flashingContainer,
		isCollapsed,
		onDrop,
		onDragStart,
		onClick,
		onToggleCollapse
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

<div class="unassigned-sidebar" class:collapsed={isCollapsed}>
	<div class="sidebar-header">
		<button
			class="collapse-button"
			on:click={onToggleCollapse}
			aria-label={isCollapsed ? 'Expand unassigned' : 'Collapse unassigned'}
			title={isCollapsed ? 'Expand' : 'Collapse'}
		>
			<svg
				class="chevron-icon"
				class:collapsed={isCollapsed}
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>

		{#if !isCollapsed}
			<h3 class="sidebar-title">Unassigned</h3>
		{/if}

		<span class="count-badge" class:collapsed={isCollapsed}>
			{studentIds.length}
		</span>
	</div>

	{#if !isCollapsed}
		<div
			class="sidebar-roster rendering-isolated"
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
	{/if}
</div>

<style>
	@import '$lib/styles/drag-drop.css';

	.unassigned-sidebar {
		background: #f3f4f6; /* Slightly darker than groups */
		border: 2px solid #d1d5db;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		width: 200px;
		min-width: 200px;
		max-height: calc(100vh - 200px); /* Leave room for header */
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.unassigned-sidebar.collapsed {
		width: 40px;
		min-width: 40px;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		border-bottom: 2px solid #e5e7eb;
		flex-shrink: 0;
		min-height: 48px;
	}

	.collapse-button {
		background: transparent;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: #6b7280;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.collapse-button:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.chevron-icon {
		transition: transform 0.3s ease;
	}

	.chevron-icon.collapsed {
		transform: rotate(180deg);
	}

	.sidebar-title {
		font-size: 14px;
		font-weight: 600;
		color: #6b7280;
		margin: 0;
		white-space: nowrap;
		flex: 1;
	}

	.count-badge {
		font-size: 12px;
		font-weight: 600;
		color: white;
		background: #6b7280;
		padding: 2px 6px;
		border-radius: 10px;
		min-width: 20px;
		text-align: center;
		flex-shrink: 0;
	}

	.count-badge.collapsed {
		background: #3b82f6;
	}

	.sidebar-roster {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		/* Smooth transition for drop feedback */
		transition: background 350ms cubic-bezier(0.15, 1, 0.3, 1);
	}

	/* Success flash animation */
	.sidebar-roster.flash-success {
		animation: flash 700ms ease-in-out;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		color: #10b981;
		font-size: 13px;
		font-weight: 500;
		text-align: center;
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
