<script lang="ts">
	/**
	 * GroupColumn: Droppable container for a single group.
	 *
	 * Responsibilities:
	 * - Display group name and capacity
	 * - Render StudentCards for members
	 * - Handle drop events via callback
	 *
	 * Data access pattern:
	 * - Uses context to get studentsById and preferencesById (avoiding prop drilling)
	 * - Receives group and UI state via props (explicit flow for reactive data)
	 */

	import { droppable, type DropState } from '$lib/utils/pragmatic-dnd';
	import type { Group } from '$lib/types';
	import { getAppDataContext } from '$lib/contexts/appData';
	import StudentCard from './StudentCard.svelte';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';

	interface Props {
		group: Group;
		selectedStudentId: string | null;
		currentlyDragging: string | null;
		onDrop: (state: DropState) => void;
		onDragStart?: (studentId: string) => void;
		onClick?: (studentId: string) => void;
		onUpdateGroup?: (groupId: string, changes: Partial<Group>) => void;
	}

	let {
		group,
		selectedStudentId,
		currentlyDragging,
		onDrop,
		onDragStart,
		onClick,
		onUpdateGroup
	}: Props = $props();

	const { studentsById, preferencesById } = getAppDataContext();
	const prefMap = preferencesById ?? {};

	// Compute capacity display
	const currentCount = $derived(group.memberIds.length);
	const isFull = $derived(group.capacity !== null && currentCount >= group.capacity);

	// Determine which students are preferred by the selected student
	const selectedStudentFriendIds = $derived.by(() => {
		if (!selectedStudentId) return new Set<string>();
		const preference = prefMap[selectedStudentId];
		if (!preference) return new Set<string>();
		return new Set(preference.likeStudentIds);
	});
</script>

<div class="group-column">
	<div class="group-header">
		<input
			type="text"
			class="group-name-input"
			value={group.name}
			on:input={(e) => onUpdateGroup?.(group.id, { name: e.currentTarget.value })}
			placeholder="Group name"
		/>
		<div class="capacity-controls">
			<span class="capacity-current" class:full={isFull}>{currentCount}</span>
			<span class="capacity-separator">/</span>
			<input
				type="number"
				class="capacity-input"
				class:full={isFull}
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

	<div class="group-members" use:droppable={{ container: group.id, callbacks: { onDrop } }}>
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
				<!-- Defensive: If student ID in group doesn't exist, show error card -->
				<div class="error-card">
					Unknown student: {studentId}
				</div>
			{/if}
		{/each}

		{#if group.memberIds.length === 0}
			<div class="empty-state">Drop students here</div>
		{/if}
	</div>
</div>

<style>
	.group-column {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 10px;
		display: flex;
		flex-direction: column;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid #e5e7eb;
		min-height: 40px;
		gap: 8px;
	}

	.group-name-input {
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

	.group-name-input:hover {
		background: white;
		border-color: #e5e7eb;
	}

	.group-name-input:focus {
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
		transition: color 0.15s ease;
	}
	.capacity-current.full {
		color: #dc2626;
		font-weight: 600;
	}
	.capacity-separator {
		font-size: 13px;
		color: #9ca3af;
	}

	.capacity-input {
		width: 30px;
		max-width: 30px; /* Hard constraint */
		flex-shrink: 0; /* Don't shrink or grow */
		font-size: 13px;
		font-weight: 500;
		color: #6b7280;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 2px 4px; /* Reduced horizontal padding */
		outline: none;
		text-align: left;
		transition: all 0.15s ease;
	}

	/* Hide number input spinner arrows */
	.capacity-input::-webkit-inner-spin-button,
	.capacity-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.capacity-input[type='number'] {
		-moz-appearance: textfield; /* Firefox */
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

	.capacity-input.full {
		color: #dc2626;
		font-weight: 600;
	}

	.capacity-input::placeholder {
		color: #9ca3af;
	}
	.group-members {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 60px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 60px;
		color: #9ca3af;
		font-size: 14px;
		font-style: italic;
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
