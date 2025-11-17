<script lang="ts">
	/**
	 * StudentCard: Draggable card representing a single student.
	 *
	 * Displays: name, ID, optional gender badge, happiness indicator
	 * Happiness shows ratio of friends in same group (e.g., [2/3])
	 */

	import { draggable } from '$lib/utils/pragmatic-dnd';
	import { getAppDataContext } from '$lib/contexts/appData';
	import { commandStore } from '$lib/stores/commands.svelte';
	import { getFriendLocations, resolveFriendNames } from '$lib/utils/friends';
	import type { Student } from '$lib/types';
	import type { StudentPreference } from '$lib/types/preferences';
	import { uiSettings } from '$lib/stores/uiSettings.svelte';

	interface Props {
		student: Student;
		isSelected: boolean;
		isDragging: boolean;
		isFriendOfSelected?: boolean;
		container?: string;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		onClick?: () => void;
	}

	let {
		student,
		isSelected = false,
		isDragging = false,
		isFriendOfSelected = false,
		container,
		onDragStart,
		onDragEnd,
		onClick
	}: Props = $props();

	const { studentsById, preferencesById } = getAppDataContext();
	// Fallback to empty object if preferences are missing in context
	const prefMap = preferencesById ?? {};

	const groups = $derived(commandStore.groups);

	// Derive display values
	const displayName = $derived(`${student.firstName} ${student.lastName}`.trim());

	// Look up preference for this student
	const preference = $derived<StudentPreference>(() => {
		return (
			prefMap[student.id] ?? {
				studentId: student.id,
				likeStudentIds: [],
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: [],
				meta: {}
			}
		);
	});

	const totalFriends = $derived(preference.likeStudentIds.length);
	const hasData = $derived(totalFriends > 0);

	// Calculate happiness: count of preferred friends in same group/container
	const happiness = $derived.by(() => {
		if (!container || !preference.likeStudentIds.length) return 0;

		// Find which group this student is in
		const currentGroup = groups.find((g) => g.id === container);
		if (!currentGroup) return 0;

		// Count how many preferred friends are in the same group
		const groupMemberSet = new Set(currentGroup.memberIds);
		let count = 0;
		for (const friendId of preference.likeStudentIds) {
			if (studentsById[friendId] && groupMemberSet.has(friendId)) {
				count++;
			}
		}
		return count;
	});

	// Happiness ratio (0.0 to 1.0)
	const happinessRatio = $derived(hasData ? happiness / totalFriends : 0);

	// Color and style based on ratio
	const happinessStyle = $derived.by(() => {
		if (!hasData) return null;

		if (happinessRatio === 0) {
			return { bg: '#fee2e2', text: '#991b1b', label: 'unhappy' }; // Red
		} else if (happinessRatio < 0.5) {
			return { bg: '#fef3c7', text: '#92400e', label: 'somewhat happy' }; // Yellow
		} else if (happinessRatio < 1.0) {
			return { bg: '#d1fae5', text: '#065f46', label: 'happy' }; // Light green
		} else {
			return { bg: '#bbf7d0', text: '#14532d', label: 'very happy' }; // Green
		}
	});

	// Gender badge configuration
	const genderBadge = $derived.by(() => {
		if (!uiSettings.showGender || !student.gender) return null;

		const g = student.gender.toUpperCase();
		if (g === 'F') return { label: 'F', color: '#a855f7' }; // Purple
		if (g === 'M') return { label: 'M', color: '#14b8a6' }; // Teal
		if (g === 'N' || g === 'X') return { label: 'N', color: '#f59e0b' }; // Amber
		return null;
	});

	// Tooltip data: preferred friend locations
	const friendDetails = $derived.by(() => {
		if (!hasData) return null;

		const friendsWithNames = resolveFriendNames(preference.likeStudentIds, studentsById);
		const friendLocations = getFriendLocations(preference.likeStudentIds, groups);

		return friendsWithNames.map((friend) => {
			const location = friendLocations.find((loc) => loc.friendId === friend.id);
			return {
				name: friend.name,
				groupName: location?.groupName ?? 'Unknown',
				isInSameGroup: location?.groupId === container
			};
		});
	});

	// Tooltip text
	const tooltipText = $derived.by(() => {
		if (!friendDetails) return '';

		const inGroup = friendDetails.filter((f) => f.isInSameGroup);
		const elsewhere = friendDetails.filter((f) => !f.isInSameGroup);

		const parts: string[] = [];

		if (inGroup.length > 0) {
			parts.push(`With: ${inGroup.map((f) => f.name).join(', ')}`);
		}

		if (elsewhere.length > 0) {
			parts.push(
				`Separated from: ${elsewhere.map((f) => `${f.name} (${f.groupName})`).join(', ')}`
			);
		}

		return parts.join('\n');
	});

	// Determine if student needs assistance (happiness < 2)
	const needsAssistance = $derived(hasData && happiness < 2);
	// Determine if we should show needs-assistance styling
	const shouldHighlightUnhappy = $derived(uiSettings.highlightUnhappy && needsAssistance);
</script>

<div
	class="student-card"
	class:selected={isSelected}
	class:dragging={isDragging}
	class:friend-highlight={isFriendOfSelected}
	class:needs-assistance={shouldHighlightUnhappy}
	use:draggable={{
		dragData: { id: student.id },
		container,
		callbacks: {
			onDragStart,
			onDragEnd
		}
	}}
	onclick={() => onClick?.()}
	role="button"
	tabindex="0"
	aria-label={`${displayName}, happiness ${happiness} of ${totalFriends} friends`}
>
	<div class="card-content">
		<!-- Gender badge (subtle circle) -->
		{#if genderBadge}
			<span
				class="gender-dot"
				style="background-color: {genderBadge.color};"
				title="Gender: {student.gender}"
				aria-label="Gender: {student.gender}"
			>
				{genderBadge.label}
			</span>
		{/if}

		<!-- Name + ID -->
		<span class="student-name">{displayName}</span>
		<span class="student-id">· {student.id}</span>

		<!-- Happiness badge -->
		{#if hasData && happinessStyle}
			<span
				class="happiness-badge"
				style="background-color: {happinessStyle.bg}; color: {happinessStyle.text};"
				title={tooltipText}
				aria-label="{happinessStyle.label}: {happiness} of {totalFriends} friends in group"
			>
				{happiness}/{totalFriends}
			</span>
		{/if}
	</div>
</div>

<style>
	.student-card {
		background: white;
		border: 2px solid transparent;
		border-radius: 6px;
		padding: 6px 10px;
		cursor: grab;
		user-select: none;
		transition: all 0.15s ease;
	}

	.student-card:hover {
		background: #f9fafb;
		border-color: #e5e7eb;
	}

	.student-card:active {
		cursor: grabbing;
	}

	.student-card.selected {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.student-card.friend-highlight {
		border-color: #10b981;
		border-width: 2px; /* Keep same as default - no layout shift */
		background: #d1fae5;
		/* Use box-shadow for visual "thickness" without layout shift */
		box-shadow:
			0 0 0 1px #10b981,
			0 0 0 4px rgba(16, 185, 129, 0.2);
		/* Force GPU compositing to prevent repaint jank */
		transform: translateZ(0);
	}

	.student-card.friend-highlight:hover {
		background: #a7f3d0;
		border-color: #059669;
		box-shadow:
			0 0 0 1px #059669,
			0 0 0 4px rgba(5, 150, 105, 0.3);
	}

	.student-card.dragging {
		opacity: 0.6;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		transform: rotate(2deg);
	}

	.student-card.needs-assistance {
		background: #fef9e7;
		border-color: #fde68a;
	}

	.student-card.needs-assistance:hover {
		background: #fef3c7;
		border-color: #fcd34d;
	}

	.card-content {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: nowrap;
		overflow: hidden;
	}

	.gender-dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		font-size: 9px;
		font-weight: 700;
		color: white;
		flex-shrink: 0;
		opacity: 0.6;
		text-transform: uppercase;
	}

	.student-name {
		font-weight: 500;
		font-size: 14px;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 1;
		min-width: 0;
	}

	.student-id {
		font-size: 11px;
		color: #9ca3af;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.happiness-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		white-space: nowrap;
		flex-shrink: 0;
		cursor: help;
		margin-left: auto;
	}

	.happiness-badge:hover {
		filter: brightness(0.95);
	}
</style>
