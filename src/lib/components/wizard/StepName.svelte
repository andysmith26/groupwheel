<script lang="ts">
	/**
	 * StepName.svelte
	 *
	 * Step 3 of the Create Groups wizard: name the activity and review.
	 * Shows summary of what will be created before final submission.
	 */

	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

	interface Props {
		/** Activity name (bound to parent) */
		activityName: string;

		/** Callback when name changes */
		onNameChange: (name: string) => void;

		/** Students from Step 1 */
		students: ParsedStudent[];

		/** Preferences from Step 2 */
		preferences: ParsedPreference[];

		/** Whether we're reusing an existing roster */
		isReusingRoster: boolean;

		/** Name of reused roster (if applicable) */
		reusedRosterName?: string;
	}

	let {
		activityName,
		onNameChange,
		students,
		preferences,
		isReusingRoster,
		reusedRosterName
	}: Props = $props();

	// Example activity names for placeholder inspiration
	const exampleNames = [
		'Science Fair Teams',
		'Reading Groups Q2',
		'Lab Partners - Week 1',
		'Field Trip Buddies',
		'Project Teams'
	];

	// Pick a random example for the placeholder
	const placeholderExample = exampleNames[Math.floor(Math.random() * exampleNames.length)];

	// Stats for summary
	let stats = $derived({
		studentCount: students.length,
		prefsCount: preferences.length,
		prefsPercent: students.length > 0 ? Math.round((preferences.length / students.length) * 100) : 0
	});
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-medium text-gray-900">Name this activity</h2>
		<p class="mt-1 text-sm text-gray-600">
			What are you grouping students for? This name helps you find it later.
		</p>
	</div>

	<!-- Name input -->
	<div class="space-y-2">
		<label class="block text-sm font-medium text-gray-700" for="activity-name">
			Activity name
		</label>
		<input
			id="activity-name"
			type="text"
			class="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			value={activityName}
			oninput={(e) => onNameChange(e.currentTarget.value)}
			placeholder={placeholderExample}
		/>
		<p class="text-xs text-gray-500">
			Examples: "Science Fair Teams", "Reading Groups Q2", "Lab Partners"
		</p>
	</div>

	<!-- Summary card -->
	<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
		<h3 class="text-sm font-medium text-gray-700">Summary</h3>

		<div class="mt-3 space-y-2">
			<!-- Students -->
			<div class="flex items-center gap-2">
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
					<svg class="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
						></path>
					</svg>
				</span>
				<span class="text-sm text-gray-700">
					<strong>{stats.studentCount}</strong> students
					{#if isReusingRoster && reusedRosterName}
						<span class="text-gray-500">(from "{reusedRosterName}")</span>
					{/if}
				</span>
			</div>

			<!-- Preferences -->
			<div class="flex items-center gap-2">
				<span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100">
					<svg
						class="h-3 w-3 text-purple-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
						></path>
					</svg>
				</span>
				<span class="text-sm text-gray-700">
					{#if stats.prefsCount > 0}
						<strong>{stats.prefsCount}</strong> students with preferences
						<span class="text-gray-500">({stats.prefsPercent}% coverage)</span>
					{:else}
						<span class="text-gray-500">No preferences (random grouping)</span>
					{/if}
				</span>
			</div>
		</div>

		{#if stats.prefsCount === 0}
			<p class="mt-3 text-xs text-gray-500">
				Without preferences, groups will be assigned randomly. You can still generate and adjust
				groups manually.
			</p>
		{/if}
	</div>
</div>
