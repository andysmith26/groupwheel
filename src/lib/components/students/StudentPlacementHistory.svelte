<script lang="ts">
	import type { PlacementWithSession, PlacementHistorySummary } from '$lib/application/useCases/getStudentPlacementHistory';

	const {
		placements = [],
		summary = null,
		isLoading = false
	} = $props<{
		placements?: PlacementWithSession[];
		summary?: PlacementHistorySummary | null;
		isLoading?: boolean;
	}>();

	function formatDate(date: Date | undefined): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}

	function getPreferenceLabel(rank: number | null): string {
		if (rank === null) return 'No preference';
		if (rank === 1) return '1st choice';
		if (rank === 2) return '2nd choice';
		if (rank === 3) return '3rd choice';
		return `${rank}th choice`;
	}

	function getPreferenceBadgeClass(rank: number | null): string {
		if (rank === null) return 'bg-gray-100 text-gray-600';
		if (rank === 1) return 'bg-green-100 text-green-700';
		if (rank === 2) return 'bg-yellow-100 text-yellow-700';
		if (rank === 3) return 'bg-orange-100 text-orange-700';
		return 'bg-red-100 text-red-700';
	}
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<p class="text-gray-500">Loading placement history...</p>
		</div>
	{:else if placements.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
			<p class="text-gray-500">No placement history yet.</p>
			<p class="mt-1 text-sm text-gray-400">
				Placements are recorded when sessions are published.
			</p>
		</div>
	{:else}
		<!-- Summary stats -->
		{#if summary}
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<p class="text-sm text-gray-500">Total Sessions</p>
					<p class="text-2xl font-semibold text-gray-900">{summary.totalPlacements}</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<p class="text-sm text-gray-500">First Choice</p>
					<p class="text-2xl font-semibold text-green-600">{summary.firstChoicePercentage}%</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<p class="text-sm text-gray-500">Avg. Rank</p>
					<p class="text-2xl font-semibold text-gray-900">
						{summary.averagePreferenceRank !== null
							? summary.averagePreferenceRank.toFixed(1)
							: 'N/A'}
					</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4">
					<p class="text-sm text-gray-500">No Preference</p>
					<p class="text-2xl font-semibold text-gray-600">{summary.unrankedCount}</p>
				</div>
			</div>
		{/if}

		<!-- Placement list -->
		<div class="space-y-3">
			<h3 class="text-sm font-medium text-gray-700">Placement History</h3>
			<div class="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
				{#each placements as { placement, session } (placement.id)}
					<div class="flex items-center justify-between p-4">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p class="font-medium text-gray-900">{placement.groupName}</p>
								<span class={`rounded-full px-2 py-0.5 text-xs font-medium ${getPreferenceBadgeClass(placement.preferenceRank)}`}>
									{getPreferenceLabel(placement.preferenceRank)}
								</span>
							</div>
							{#if session}
								<p class="mt-1 text-sm text-gray-500">
									{session.name} &middot; {session.academicYear}
								</p>
							{/if}
						</div>
						<div class="text-right text-sm text-gray-400">
							{formatDate(session?.publishedAt ?? placement.assignedAt)}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
