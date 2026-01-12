<script lang="ts">
	import type { Student } from '$lib/domain';
	import type { StudentPreference } from '$lib/domain/preference';

	const {
		student,
		preferences = null,
		x = 0,
		y = 0,
		visible = false
	} = $props<{
		student: Student;
		preferences?: StudentPreference | null;
		x?: number;
		y?: number;
		visible?: boolean;
	}>();

	const fullName = $derived(
		`${student.firstName} ${student.lastName ?? ''}`.trim() || student.id
	);

	const firstChoice = $derived(preferences?.likeGroupIds?.[0] ?? null);
	const secondChoice = $derived(preferences?.likeGroupIds?.[1] ?? null);

	// Position the tooltip to avoid going off-screen
	const tooltipStyle = $derived.by(() => {
		// Offset from cursor
		const offsetX = 12;
		const offsetY = 12;

		// Rough tooltip dimensions
		const tooltipWidth = 220;
		const tooltipHeight = 96;

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
		<div class="text-sm text-gray-700">
			<div>1st Choice: {firstChoice ?? '—'}</div>
			<div>2nd Choice: {secondChoice ?? '—'}</div>
		</div>
	</div>
{/if}
