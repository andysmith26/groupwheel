<script lang="ts">
	/**
	 * /analytics/+page.svelte
	 *
	 * Global analytics overview showing all activities with summary stats.
	 * Click an activity to drill into its detailed analytics.
	 */

	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { listActivities, getObservationSummary, listSessions } from '$lib/services/appEnvUseCases';
	import type { ActivityDisplay } from '$lib/application/useCases/listActivities';
	import { isOk } from '$lib/types/result';
	import ActivityAnalyticsCard from '$lib/components/analytics/ActivityAnalyticsCard.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	interface ActivityWithStats extends ActivityDisplay {
		sessionCount: number;
		sentimentCounts?: {
			positive: number;
			neutral: number;
			negative: number;
		};
	}

	let activities = $state<ActivityWithStats[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Derived totals ---
	let totalActivities = $derived(activities.length);
	let totalSessions = $derived(activities.reduce((sum, a) => sum + a.sessionCount, 0));
	let totalStudents = $derived(activities.reduce((sum, a) => sum + a.studentCount, 0));

	// --- Load data ---
	onMount(async () => {
		env = getAppEnvContext();
		if (!env) {
			loadError = 'Application environment not available';
			loading = false;
			return;
		}

		// Load activities
		const activitiesResult = await listActivities(env);
		if (!isOk(activitiesResult)) {
			loadError = 'Failed to load activities';
			loading = false;
			return;
		}

		// Enrich each activity with session count and observation summary
		const enrichedActivities: ActivityWithStats[] = [];

		for (const activity of activitiesResult.value) {
			// Get session count
			const sessionsResult = await listSessions(env, { programId: activity.program.id });
			const publishedSessions = isOk(sessionsResult)
				? sessionsResult.value.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
				: [];

			// Get observation summary
			const observationResult = await getObservationSummary(env, {
				programId: activity.program.id
			});

			enrichedActivities.push({
				...activity,
				sessionCount: publishedSessions.length,
				sentimentCounts: isOk(observationResult)
					? {
							positive: observationResult.value.sentimentCounts.positive,
							neutral: observationResult.value.sentimentCounts.neutral,
							negative: observationResult.value.sentimentCounts.negative
						}
					: undefined
			});
		}

		// Sort by session count (most active first), then by name
		enrichedActivities.sort((a, b) => {
			if (b.sessionCount !== a.sessionCount) {
				return b.sessionCount - a.sessionCount;
			}
			return a.program.name.localeCompare(b.program.name);
		});

		activities = enrichedActivities;
		loading = false;
	});

	function handleActivityClick(programId: string) {
		goto(`/activities/${programId}/analytics`);
	}

	function handleBack() {
		goto('/activities');
	}
</script>

<svelte:head>
	<title>Analytics | Groupwheel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						type="button"
						class="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
						onclick={handleBack}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Activities
					</button>
					<div>
						<h1 class="text-xl font-semibold text-gray-900">Analytics Overview</h1>
						<p class="text-sm text-gray-500">Cross-activity insights</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loadError}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
				<p class="text-red-700">{loadError}</p>
				<button
					type="button"
					class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
					onclick={() => goto('/activities')}
				>
					Return to activities
				</button>
			</div>
		{:else if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading analytics...</p>
			</div>
		{:else if activities.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<h3 class="mt-4 text-lg font-medium text-gray-900">No activities yet</h3>
				<p class="mt-2 text-sm text-gray-500">
					Create an activity to start tracking analytics.
				</p>
				<button
					type="button"
					class="mt-4 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
					onclick={() => goto('/activities/new')}
				>
					Create Activity
				</button>
			</div>
		{:else}
			<!-- Summary stats -->
			<div class="mb-6 grid grid-cols-3 gap-4">
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalActivities}</p>
					<p class="text-sm text-gray-500">Activities</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalSessions}</p>
					<p class="text-sm text-gray-500">Saved Sessions</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalStudents}</p>
					<p class="text-sm text-gray-500">Total Students</p>
				</div>
			</div>

			<!-- Activity cards -->
			<div class="space-y-3">
				<h2 class="text-sm font-medium text-gray-700">Activities</h2>
				{#each activities as activity (activity.program.id)}
					<ActivityAnalyticsCard
						programId={activity.program.id}
						name={activity.program.name}
						sessionCount={activity.sessionCount}
						studentCount={activity.studentCount}
						sentimentCounts={activity.sentimentCounts}
						onclick={() => handleActivityClick(activity.program.id)}
					/>
				{/each}
			</div>
		{/if}
	</main>
</div>
