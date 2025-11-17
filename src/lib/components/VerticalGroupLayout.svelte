<script lang="ts">
	/**
	 * VerticalGroupLayout: Vertical stack layout for 6+ groups
	 *
	 * Each group is a full-width row with:
	 * - Header (name, count, collapse button)
	 * - Members area (students flow horizontally with flex-wrap)
	 * - Collapsible rows tracked in Set<string>
	 */

	import type { Group } from '$lib/types';
	import type { DropState } from '$lib/utils/pragmatic-dnd';
	import { droppable } from '$lib/utils/pragmatic-dnd';
	import { getAppDataContext } from '$lib/contexts/appData';
	import StudentCard from './StudentCard.svelte';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';

	/**
	 * Props accepted by VerticalGroupLayout.
	 *
	 * - `groups`: array of groups to display in order.
	 * - `selectedStudentId`: the student currently selected in the UI (or null).
	 * - `currentlyDragging`: the ID of the student being dragged, if any.
	 * - `collapsedGroups`: set of group IDs that should be collapsed.
	 * - `showGender`: whether to display gender icons on StudentCard.
	 * - `onDrop`: callback when a drop occurs via pragmatic-dnd.
	 * - `onDragStart`: callback when dragging starts.
	 * - `onClick`: callback when a student card is clicked.
	 * - `onUpdateGroup`: callback to update group metadata (name/capacity).
	 * - `onToggleCollapse`: callback to collapse/expand a group.
	 */
	interface Props {
		groups: Group[];
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		collapsedGroups: Set<string>;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
		onUpdateGroup?: (groupId: string, changes: Partial<Group>) => void;
		onToggleCollapse: (groupId: string) => void;
	}

	let {
		groups,
		selectedStudentId,
		currentlyDragging,
		collapsedGroups,
		onDrop,
		onDragStart,
		onClick,
		onUpdateGroup,
		onToggleCollapse
	}: Props = $props();

	// Access app data: student roster and preferences. We destructure both for use below.
	const { studentsById, preferencesById } = getAppDataContext();

	// Compute a Set of friend IDs for the currently selected student.
	// If no student is selected, or there is no preference data, the Set remains empty.
	const selectedStudentFriendIds = $derived.by(() => {
		if (!selectedStudentId) return new Set<string>();
		const preference = preferencesById[selectedStudentId];
		if (!preference) return new Set<string>();
		return new Set(preference.likeStudentIds ?? []);
	});

	/**
	 * Determine whether a given group is collapsed.
	 */
	function isCollapsed(groupId: string): boolean {
		return collapsedGroups.has(groupId);
	}
</script>

<div class="vertical-layout">
	<!-- Group rows -->
	{#each groups as group (group.id)}
		<div class="group-row" class:collapsed={isCollapsed(group.id)}>
			<div class="group-row-header">
				<button
					class="collapse-button"
					on:click={() => onToggleCollapse(group.id)}
					aria-label={isCollapsed(group.id) ? `Expand ${group.name}` : `Collapse ${group.name}`}
					title={isCollapsed(group.id) ? 'Expand' : 'Collapse'}
				>
					<span class="collapse-icon" class:collapsed={isCollapsed(group.id)}>▼</span>
				</button>

				<input
					type="text"
					class="group-row-name-input"
					value={group.name}
					on:input={(e) => onUpdateGroup?.(group.id, { name: e.currentTarget.value })}
					placeholder="Group name"
				/>

				<div class="capacity-controls">
					<span class="capacity-current">{group.memberIds.length}</span>
					<span class="capacity-separator">/</span>
					<input
						type="number"
						class="capacity-input"
						value={group.capacity ?? ''}
						min="1"
						placeholder="∞"
						on:input={(e) => {
							const val = e.currentTarget.value;
							const num = parseInt(val, 10);
							const newCapacity = val === '' || isNaN(num) || num <= 0 ? null : num;
							onUpdateGroup?.(group.id, { capacity: newCapacity });
						}}
					/>
				</div>
			</div>

			{#if !isCollapsed(group.id)}
				<div
					class="group-row-members"
					use:droppable={{ container: group.id, callbacks: { onDrop } }}
				>
					{#each group.memberIds as studentId (studentId)}
						{@const student = studentsById[studentId]}
						{#if student}
							<StudentCard
								{student}
								isSelected={selectedStudentId === studentId}
								isDragging={currentlyDragging === studentId}
								isFriendOfSelected={selectedStudentFriendIds.has(studentId)}
								container={group.id}
								onDragStart={() => onDragStart?.(studentId)}
								onClick={() => onClick?.(studentId)}
							/>
						{:else}
							<div class="error-card">Unknown student: {studentId}</div>
						{/if}
					{/each}

					{#if group.memberIds.length === 0}
						<div class="empty-state">Drop students here</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.vertical-layout {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.group-row {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 10px;
		width: 100%;
	}

	.group-row.collapsed {
		padding-bottom: 10px;
	}

	.group-row-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid #e5e7eb;
		min-height: 36px;
	}

	.group-row.collapsed .group-row-header {
		border-bottom: none;
		padding-bottom: 0;
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
	}

	.collapse-button:hover {
		background: #e5e7eb;
		color: #111827;
	}

	.collapse-icon {
		display: inline-block;
		font-size: 12px;
		transition: transform 0.2s ease;
	}

	.collapse-icon.collapsed {
		transform: rotate(-90deg);
	}

	.group-row-name-input {
		flex: 1;
		font-size: 16px;
		font-weight: 600;
		color: #111827;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 4px 6px;
		outline: none;
		transition: all 0.15s ease;
	}

	.group-row-name-input:hover {
		background: white;
		border-color: #e5e7eb;
	}

	.group-row-name-input:focus {
		background: white;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.capacity-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.capacity-current {
		font-size: 13px;
		color: #6b7280;
		font-weight: 500;
	}

	.capacity-separator {
		font-size: 13px;
		color: #9ca3af;
	}

	.capacity-input {
		width: 30px;
		max-width: 30px;
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 500;
		color: #6b7280;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 2px 4px;
		outline: none;
		text-align: left;
		transition: all 0.15s ease;
	}

	.capacity-input::-webkit-inner-spin-button,
	.capacity-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.capacity-input[type='number'] {
		-moz-appearance: textfield;
	}

	.capacity-input:hover {
		background: white;
		border-color: #e5e7eb;
	}

	.capacity-input:focus {
		background: white;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.capacity-input::placeholder {
		color: #9ca3af;
	}

	.group-row-members {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
		min-height: 60px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 60px;
		color: #9ca3af;
		font-size: 14px;
		font-style: italic;
	}

	.error-card {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		border-radius: 4px;
		padding: 6px 10px;
		color: #991b1b;
		font-size: 13px;
	}
</style>
