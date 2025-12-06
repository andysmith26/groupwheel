<script lang="ts">
	/**
	 * StepSelectRoster.svelte
	 *
	 * Pre-step for returning users: choose to start from an existing roster
	 * or create a new one. This is where the Pool/Program distinction
	 * becomes valuable without being explained.
	 */

	import type { Pool } from '$lib/domain';

	interface RosterOption {
		pool: Pool;
		activityName: string;
		lastUsed: Date;
		studentCount: number;
	}

	interface Props {
		/** Available rosters (derived from existing Pools) */
		existingRosters: RosterOption[];

		/** Currently selected option: null = new roster, string = pool ID */
		selectedRosterId: string | null;

		/** Callback when selection changes */
		onSelect: (poolId: string | null) => void;
	}

	let { existingRosters, selectedRosterId, onSelect }: Props = $props();

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
		return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? 's' : ''} ago`;
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Start from</h2>
		<p class="mt-1 text-sm text-gray-600">
			Create a new activity with fresh students, or reuse an existing class roster.
		</p>
	</div>

	<div class="space-y-2">
		<!-- New students option -->
		<label
			class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors
				{selectedRosterId === null
				? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
				: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
		>
			<input
				type="radio"
				name="roster-choice"
				checked={selectedRosterId === null}
				onchange={() => onSelect(null)}
				class="mt-0.5 h-4 w-4 text-blue-600"
			/>
			<div>
				<span class="font-medium text-gray-900">New students</span>
				<p class="mt-0.5 text-sm text-gray-600">Paste a fresh roster from Google Sheets</p>
			</div>
		</label>

		<!-- Existing rosters -->
		{#each existingRosters as roster (roster.pool.id)}
			<label
				class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors
					{selectedRosterId === roster.pool.id
					? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
					: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
			>
				<input
					type="radio"
					name="roster-choice"
					checked={selectedRosterId === roster.pool.id}
					onchange={() => onSelect(roster.pool.id)}
					class="mt-0.5 h-4 w-4 text-blue-600"
				/>
				<div class="flex-1">
					<div class="flex items-center justify-between">
						<span class="font-medium text-gray-900">
							{roster.activityName} roster
						</span>
						<span class="text-xs text-gray-500">
							{formatRelativeTime(roster.lastUsed)}
						</span>
					</div>
					<p class="mt-0.5 text-sm text-gray-600">
						{roster.studentCount} students
					</p>
				</div>
			</label>
		{/each}
	</div>

	{#if existingRosters.length > 0}
		<p class="text-xs text-gray-500">
			Reusing a roster lets you create different groupings for the same students without re-entering
			their names.
		</p>
	{/if}
</div>
