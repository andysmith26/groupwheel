<script lang="ts">
	/**
	 * RotationCoverageCard: Shows rotation coverage as a progress bar with
	 * contextual explanation. Answers: "What percentage of possible pairings
	 * have occurred?"
	 */

	const {
		coveragePercent,
		coveredPairs,
		totalPossiblePairs,
		sessionCount,
		studentCount
	}: {
		coveragePercent: number;
		coveredPairs: number;
		totalPossiblePairs: number;
		sessionCount: number;
		studentCount: number;
	} = $props();

	let explainerText = $derived.by(() => {
		if (sessionCount < studentCount) {
			return `This is normal — full rotation of ${studentCount} students takes roughly ${studentCount} sessions.`;
		}
		if (coveragePercent < 50) {
			return `Coverage builds gradually. Larger groups and more sessions will increase pairing diversity.`;
		}
		return `Good coverage! Most students have worked with a wide variety of partners.`;
	});
</script>

<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
	<!-- Progress bar -->
	<div class="mb-2 flex items-center justify-between">
		<div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
			<div
				class="h-3 rounded-full bg-teal transition-all"
				style="width: {Math.min(coveragePercent, 100)}%"
			></div>
		</div>
		<span class="ml-3 text-lg font-semibold text-gray-900">{coveragePercent}%</span>
	</div>

	<!-- Stats -->
	<p class="text-sm text-gray-600">
		{coveredPairs} of {totalPossiblePairs} possible pairings
	</p>
	<p class="text-sm text-gray-500">
		After {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
	</p>

	<!-- Contextual explainer -->
	<p class="mt-2 text-sm text-gray-500 italic">
		{explainerText}
	</p>
</div>
