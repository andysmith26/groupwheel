<script lang="ts">
	/**
	 * /activities/[id]/setup/+page.svelte
	 *
	 * Setup Page - Configure groups, roster, and preferences for an activity.
	 * Part of the UX Overhaul (Approach C).
	 *
	 * This is a stub implementation that will be expanded in Phase 4.
	 * For now, it provides basic navigation and a placeholder for future functionality.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getActivityData } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Program, Pool, Scenario, Student } from '$lib/domain';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Derived ---
	let hasGroups = $derived(scenario !== null && scenario.groups.length > 0);
	let studentCount = $derived(students.length);

	onMount(async () => {
		env = getAppEnvContext();
		await loadActivityData();
	});

	async function loadActivityData() {
		if (!env) return;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = `Activity not found`;
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		pool = data.pool;
		scenario = data.scenario;
		students = data.students;

		loading = false;
	}

	function handleGenerateGroups() {
		// TODO: Implement group generation in Phase 4
		// For now, redirect to the old candidates page
		if (program) {
			goto(`/groups/${program.id}/candidates`);
		}
	}
</script>

<svelte:head>
	<title>Setup - {program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6">
			<p class="text-red-700">{loadError}</p>
			<a href="/activities" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
				← Back to activities
			</a>
		</div>
	{:else if program}
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a
					href="/activities/{program.id}"
					class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
				>
					<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</a>
				<h1 class="text-2xl font-semibold text-gray-900">Setup</h1>
			</div>

			{#if hasGroups}
				<a
					href="/activities/{program.id}/workspace"
					class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
				>
					Edit Groups →
				</a>
			{/if}
		</div>

		<!-- Activity info -->
		<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="text-lg font-medium text-gray-900">{program.name}</h2>
			<p class="mt-1 text-sm text-gray-600">{studentCount} students</p>
		</div>

		<!-- Setup sections -->
		<div class="space-y-6">
			<!-- Roster section -->
			<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-medium text-gray-900">Roster</h3>
						<p class="mt-1 text-sm text-gray-600">
							{studentCount} students in this activity
						</p>
					</div>
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						disabled
					>
						Edit Roster
					</button>
				</div>
				<p class="mt-4 text-xs text-gray-400">
					Roster editing will be available in a future update.
				</p>
			</section>

			<!-- Groups section -->
			<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-medium text-gray-900">Groups</h3>
						<p class="mt-1 text-sm text-gray-600">
							{#if hasGroups}
								{scenario?.groups.length} groups configured
							{:else}
								No groups created yet
							{/if}
						</p>
					</div>
					<button
						type="button"
						class="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
						onclick={handleGenerateGroups}
					>
						{hasGroups ? 'Regenerate Groups' : 'Generate Groups'}
					</button>
				</div>
			</section>

			<!-- Preferences section -->
			<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-medium text-gray-900">Preferences</h3>
						<p class="mt-1 text-sm text-gray-600">
							Student preferences for group placement
						</p>
					</div>
					<button
						type="button"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
						disabled
					>
						Import Preferences
					</button>
				</div>
				<p class="mt-4 text-xs text-gray-400">
					Preference import will be available in a future update.
				</p>
			</section>

			<!-- History section (placeholder for sessions) -->
			<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-medium text-gray-900">History</h3>
						<p class="mt-1 text-sm text-gray-600">
							View past grouping sessions
						</p>
					</div>
					<a
						href="/groups/{program.id}/sessions"
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						View History
					</a>
				</div>
			</section>
		</div>
	{/if}
</div>
