<script lang="ts">
	import type { Student } from '$lib/domain';
	import type { StudentPreference } from '$lib/domain/preference';

	const {
		student,
		preferences = null,
		currentGroupName = null,
		preferenceRank = null,
		x = 0,
		y = 0,
		visible = false
	} = $props<{
		student: Student;
		preferences?: StudentPreference | null;
		currentGroupName?: string | null;
		preferenceRank?: number | null;
		x?: number;
		y?: number;
		visible?: boolean;
	}>();

	const fullName = $derived(
		`${student.firstName} ${student.lastName ?? ''}`.trim() || student.id
	);

	const hasPreferences = $derived(
		preferences && preferences.likeGroupIds && preferences.likeGroupIds.length > 0
	);

	// Format preference list with ordinals (show first 3, then "and X more")
	const MAX_PREFS_SHOWN = 3;
	const preferenceList = $derived.by(() => {
		if (!preferences?.likeGroupIds?.length) return [];
		const ordinals = ['1st', '2nd', '3rd'];
		return preferences.likeGroupIds.slice(0, MAX_PREFS_SHOWN).map((groupName: string, i: number) => ({
			groupName,
			ordinal: ordinals[i] ?? `${i + 1}th`
		}));
	});

	const remainingPrefsCount = $derived(
		preferences?.likeGroupIds?.length
			? Math.max(0, preferences.likeGroupIds.length - MAX_PREFS_SHOWN)
			: 0
	);

	// Satisfaction message
	const satisfactionMessage = $derived.by(() => {
		if (preferenceRank === null || preferenceRank === undefined) {
			if (!hasPreferences) return null;
			return 'No preference match';
		}
		if (preferenceRank === 1) return '✓ Got 1st choice';
		if (preferenceRank === 2) return 'Got 2nd choice';
		if (preferenceRank === 3) return 'Got 3rd choice';
		return `Got ${preferenceRank}th choice`;
	});

	const satisfactionClass = $derived.by(() => {
		if (preferenceRank === 1) return 'text-green-600';
		if (preferenceRank === 2) return 'text-teal-600';
		if (preferenceRank === 3) return 'text-yellow-600';
		if (preferenceRank !== null) return 'text-orange-600';
		return 'text-gray-500';
	});

	// Position the tooltip to avoid going off-screen
	const tooltipStyle = $derived.by(() => {
		// Offset from cursor
		const offsetX = 12;
		const offsetY = 12;

		// Rough tooltip dimensions
		const tooltipWidth = 220;
		const tooltipHeight = 120;

		// Check if tooltip would go off-screen
		const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
		const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

		let left = x + offsetX;
		let top = y + offsetY;

		// Flip horizontally if needed
		if (left + tooltipWidth > windowWidth - 20) {
			left = x - tooltipWidth - offsetX;
		}

		// Flip vertically if needed
		if (top + tooltipHeight > windowHeight - 20) {
			top = y - tooltipHeight - offsetY;
		}

		return `left: ${left}px; top: ${top}px;`;
	});
</script>

{#if visible}
	<div
		class="pointer-events-none fixed z-50 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
		style={tooltipStyle}
		role="tooltip"
	>
		<!-- Student name -->
		<div class="mb-2 font-semibold text-gray-900">{fullName}</div>

		<!-- Current group (if assigned) -->
		{#if currentGroupName}
			<div class="mb-2 text-sm text-gray-600">
				In: <span class="font-medium">{currentGroupName}</span>
			</div>
		{/if}

		<!-- Preferences -->
		{#if hasPreferences}
			<div class="mb-2">
				<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
					Requested
				</div>
				<div class="text-sm text-gray-700">
					{#each preferenceList as pref, i}
						<span class="inline-block">
							{pref.groupName}
							<span class="text-gray-400">({pref.ordinal})</span>{#if i < preferenceList.length - 1 || remainingPrefsCount > 0},
							{/if}
						</span>
					{/each}
					{#if remainingPrefsCount > 0}
						<span class="text-gray-500">and {remainingPrefsCount} more</span>
					{/if}
				</div>
			</div>
		{:else}
			<div class="mb-2 text-sm text-gray-500 italic">No preferences submitted</div>
		{/if}

		<!-- Satisfaction status -->
		{#if satisfactionMessage}
			<div class="text-sm font-medium {satisfactionClass}">
				{satisfactionMessage}
			</div>
		{/if}
	</div>
{/if}
