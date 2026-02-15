<script lang="ts">
	/**
	 * /activities/[id]/analytics/+page.svelte
	 *
	 * Per-activity analytics dashboard showing:
	 * - Summary stats (sessions, students, observations)
	 * - Pairing patterns
	 * - Student satisfaction stats
	 * - Observation summaries
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program } from '$lib/domain';
	import {
		getProgramPairingStats,
		getObservationSummary,
		listStudentStats,
		getActivityData
	} from '$lib/services/appEnvUseCases';
	import type { ProgramPairingStatsResult } from '$lib/application/useCases/getProgramPairingStats';
	import type { ObservationSummaryResult } from '$lib/application/useCases/getObservationSummary';
	import type { ListStudentStatsResult } from '$lib/application/useCases/listStudentStats';
	import { isOk } from '$lib/types/result';
	import CollapsibleSection from '$lib/components/setup/CollapsibleSection.svelte';
	import PairingStatsPanel from '$lib/components/analytics/PairingStatsPanel.svelte';
	import StudentStatsTable from '$lib/components/analytics/StudentStatsTable.svelte';
	import ObservationSummaryCard from '$lib/components/analytics/ObservationSummaryCard.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let pairingStats = $state<ProgramPairingStatsResult | null>(null);
	let observationSummary = $state<ObservationSummaryResult | null>(null);
	let studentStats = $state<ListStudentStatsResult | null>(null);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let loadingPairing = $state(true);
	let loadingObservations = $state(true);
	let loadingStudents = $state(true);

	// --- Section expansion states ---
	let pairingExpanded = $state(true);
	let studentsExpanded = $state(true);
	let observationsExpanded = $state(true);

	// --- Derived ---
	let activityId = $derived($page.params.id);

	let totalSessions = $derived(pairingStats?.totalSessions ?? studentStats?.totalSessions ?? 0);
	let totalStudents = $derived(studentStats?.students.length ?? 0);
	let totalObservations = $derived(observationSummary?.totalObservations ?? 0);

	// --- Load data ---
	onMount(async () => {
		env = getAppEnvContext();
		if (!env) {
			loadError = 'Application environment not available';
			loading = false;
			return;
		}

		const programId = activityId;
		if (!programId) {
			loadError = 'Activity ID is required';
			loading = false;
			return;
		}

		// Load activity data first
		const activityResult = await getActivityData(env, { programId });
		if (!isOk(activityResult)) {
			loadError = 'Activity not found';
			loading = false;
			return;
		}

		program = activityResult.value.program;
		loading = false;

		// Load analytics data in parallel
		loadAnalyticsData(programId);
	});

	async function loadAnalyticsData(programId: string) {
		if (!env) return;

		// Load all analytics in parallel
		const [pairingResult, observationResult, studentResult] = await Promise.all([
			getProgramPairingStats(env, { programId }),
			getObservationSummary(env, { programId }),
			listStudentStats(env, { programId })
		]);

		if (isOk(pairingResult)) {
			pairingStats = pairingResult.value;
		}
		loadingPairing = false;

		if (isOk(observationResult)) {
			observationSummary = observationResult.value;
		}
		loadingObservations = false;

		if (isOk(studentResult)) {
			studentStats = studentResult.value;
		}
		loadingStudents = false;
	}

	function handleBack() {
		goto(`/activities/${activityId}`);
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} Analytics | Groupwheel</title>
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
						Back
					</button>
					<div>
						<h1 class="text-xl font-semibold text-gray-900">
							{#if loading}
								Loading...
							{:else if program}
								{program.name}
							{:else}
								Activity
							{/if}
						</h1>
						<p class="text-sm text-gray-500">Analytics Dashboard</p>
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
				<p class="text-gray-500">Loading activity...</p>
			</div>
		{:else}
			<!-- Summary stats -->
			<div class="mb-6 grid grid-cols-3 gap-4">
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalSessions}</p>
					<p class="text-sm text-gray-500">Published Sessions</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalStudents}</p>
					<p class="text-sm text-gray-500">Students</p>
				</div>
				<div class="rounded-lg border border-gray-200 bg-white p-4 text-center">
					<p class="text-2xl font-semibold text-gray-900">{totalObservations}</p>
					<p class="text-sm text-gray-500">Observations</p>
				</div>
			</div>

			<!-- Empty state if no sessions -->
			{#if totalSessions === 0}
				<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
					<h3 class="mt-4 text-lg font-medium text-gray-900">No published sessions yet</h3>
					<p class="mt-2 text-sm text-gray-500">
						Analytics data is generated when you publish sessions.
						Go to the workspace to create and publish a grouping.
					</p>
					<button
						type="button"
						class="mt-4 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
						onclick={() => goto(`/activities/${activityId}/workspace`)}
					>
						Go to Workspace
					</button>
				</div>
			{:else}
				<!-- Analytics sections -->
				<div class="space-y-4">
					<!-- Pairing Patterns -->
					<CollapsibleSection
						title="Pairing Patterns"
						summary={pairingStats ? `${pairingStats.pairs.length} unique pairs` : ''}
						isExpanded={pairingExpanded}
						onToggle={(expanded) => (pairingExpanded = expanded)}
					>
						<PairingStatsPanel
							pairs={pairingStats?.pairs ?? []}
							totalSessions={pairingStats?.totalSessions ?? 0}
							isLoading={loadingPairing}
						/>
					</CollapsibleSection>

					<!-- Student Stats -->
					<CollapsibleSection
						title="Student Statistics"
						summary={studentStats ? `${studentStats.students.length} students` : ''}
						isExpanded={studentsExpanded}
						onToggle={(expanded) => (studentsExpanded = expanded)}
					>
						<StudentStatsTable
							students={studentStats?.students ?? []}
							totalSessions={studentStats?.totalSessions ?? 0}
							isLoading={loadingStudents}
						/>
					</CollapsibleSection>

					<!-- Observations -->
					<CollapsibleSection
						title="Observations"
						summary={observationSummary ? `${observationSummary.totalObservations} notes` : ''}
						isExpanded={observationsExpanded}
						onToggle={(expanded) => (observationsExpanded = expanded)}
					>
						<ObservationSummaryCard
							totalObservations={observationSummary?.totalObservations ?? 0}
							sentimentCounts={observationSummary?.sentimentCounts ?? { positive: 0, neutral: 0, negative: 0, unspecified: 0 }}
							topTags={observationSummary?.topTags ?? []}
							recentObservations={observationSummary?.recentObservations ?? []}
							isLoading={loadingObservations}
						/>
					</CollapsibleSection>
				</div>
			{/if}
		{/if}
	</main>
</div>
