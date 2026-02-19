<script lang="ts">
	/**
	 * UniquePartnersTable: Shows per-student unique partner counts,
	 * sorted fewest-first (students needing most rotation attention on top).
	 */

	const {
		students,
		initialLimit = 8
	}: {
		students: Array<{ name: string; uniquePartners: number; maxPossible: number }>;
		initialLimit?: number;
	} = $props();

	let showAll = $state(false);

	let sortedStudents = $derived(
		[...students].sort((a, b) => a.uniquePartners - b.uniquePartners)
	);

	let displayedStudents = $derived(
		showAll ? sortedStudents : sortedStudents.slice(0, initialLimit)
	);

	let hasMore = $derived(sortedStudents.length > initialLimit);
</script>

<div>
	<h4 class="mb-3 text-sm font-medium text-gray-700">Unique partners per student</h4>
	<div class="space-y-2">
		{#each displayedStudents as student (student.name)}
			{@const percent = student.maxPossible > 0 ? (student.uniquePartners / student.maxPossible) * 100 : 0}
			<div class="flex items-center gap-3">
				<span class="w-36 truncate text-sm text-gray-900" title={student.name}>
					{student.name}
				</span>
				<span class="w-16 text-right text-xs text-gray-500">
					{student.uniquePartners} of {student.maxPossible}
				</span>
				<div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full bg-teal transition-all"
						style="width: {Math.min(percent, 100)}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	{#if hasMore}
		<button
			type="button"
			class="mt-3 text-sm text-blue-600 hover:underline"
			onclick={() => (showAll = !showAll)}
		>
			{showAll ? 'Show less' : `Show all ${sortedStudents.length} students`}
		</button>
	{/if}
</div>
