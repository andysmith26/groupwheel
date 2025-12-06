<script lang="ts">
	/**
	 * /groups/[id]/+page.svelte
	 *
	 * Activity detail page. Shows students, preferences, and allows
	 * generating/viewing grouping scenarios.
	 *
	 * This replaces /programs/[id] with teacher-friendly language.
	 * Internally still works with Program/Pool/Scenario domain objects.
	 */

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { generateScenario, computeAnalytics } from '$lib/services/appEnvUseCases';
	import { isOk, isErr } from '$lib/types/result';
	import { storeScenarioForProjection } from '$lib/infrastructure/scenarioStorage';
	import type { Program, Pool, Scenario, Student } from '$lib/domain';
	import type { StudentPreference } from '$lib/domain/preference';
	import type { ScenarioSatisfaction } from '$lib/application/useCases/computeScenarioAnalytics';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Page data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<StudentPreference[]>([]);

	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Scenario state ---
	let scenario = $state<Scenario | null>(null);
	let isGenerating = $state(false);
	let generateError = $state<string | null>(null);

	// --- Analytics state ---
	let analytics = $state<ScenarioSatisfaction | null>(null);
	let isComputingAnalytics = $state(false);
	let analyticsError = $state<string | null>(null);

	// --- UI state ---
	let showStudentList = $state(false);

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

		try {
			// Load program
			program = await env.programRepo.getById(programId);
			if (!program) {
				loadError = `Activity not found: ${programId}`;
				loading = false;
				return;
			}

			// Load associated pool (use primaryPoolId or first poolId)
			const poolId = program.primaryPoolId ?? program.poolIds?.[0];
			if (poolId) {
				pool = await env.poolRepo.getById(poolId);
			}

			// Load students
			if (pool) {
				students = await env.studentRepo.getByIds(pool.memberIds);
			}

			// Load preferences
			preferences = await env.preferenceRepo.listByProgramId(programId);

			// Check for existing scenario (MVP: single scenario per program)
			const existingScenario = await env.scenarioRepo.getByProgramId(programId);
			if (existingScenario) {
				scenario = existingScenario;
				await refreshAnalytics(scenario.id);
			}
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load activity data';
		} finally {
			loading = false;
		}
	}

	async function handleGenerateScenario() {
		if (!env || !program) return;

		isGenerating = true;
		generateError = null;

		const result = await generateScenario(env, { programId: program.id });

		if (isErr(result)) {
			generateError = result.error.message;
			isGenerating = false;
			return;
		}

		scenario = result.value;

		// Store for student view projection
		storeScenarioForProjection(scenario, students);

		// Compute analytics
		await refreshAnalytics(scenario.id);

		isGenerating = false;
	}

	async function refreshAnalytics(scenarioId: string) {
		if (!env) return;

		isComputingAnalytics = true;
		analyticsError = null;

		const result = await computeAnalytics(env, { scenarioId });

		if (isOk(result)) {
			analytics = result.value;
		} else {
			analyticsError = result.error.message;
		}

		isComputingAnalytics = false;
	}

	// --- Derived data ---
	let preferencesCount = $derived(preferences.length);
	let preferencesPercent = $derived(
		students.length > 0 ? Math.round((preferencesCount / students.length) * 100) : 0
	);

	// Build preferences lookup
	let preferencesByStudentId = $derived(new Map(preferences.map((p) => [p.studentId, p])));

	// Helper to get student display name
	function getStudentName(id: string): string {
		const student = students.find((s) => s.id === id);
		if (!student) return id;
		return `${student.firstName} ${student.lastName}`.trim() || id;
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Friend Hat</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading activity...</p>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<p class="text-red-700">{loadError}</p>
			<a href="/groups" class="mt-2 inline-block text-sm text-blue-600 underline">
				← Back to activities
			</a>
		</div>
	{:else if program}
		<!-- Header -->
		<header class="flex items-center justify-between gap-4">
			<div>
				<a href="/groups" class="text-sm text-gray-500 hover:text-gray-700">← All activities</a>
				<h1 class="mt-1 text-2xl font-semibold text-gray-900">{program.name}</h1>
			</div>
		</header>

		<!-- Main content grid -->
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Left column: Students & Preferences -->
			<div class="space-y-4">
				<!-- Students card -->
				<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
					<button
						type="button"
						class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
						onclick={() => (showStudentList = !showStudentList)}
					>
						<div>
							<h2 class="font-medium text-gray-900">Students</h2>
							<p class="text-sm text-gray-500">
								{students.length} students · {preferencesCount} with preferences ({preferencesPercent}%)
							</p>
						</div>
						<span class="text-gray-400">{showStudentList ? '▼' : '▸'}</span>
					</button>

					{#if showStudentList}
						<div class="border-t border-gray-200">
							<div class="max-h-80 divide-y divide-gray-100 overflow-y-auto">
								{#each students as student (student.id)}
									{@const pref = preferencesByStudentId.get(student.id)}
									<div class="px-4 py-3">
										<div class="flex items-center justify-between">
											<span class="font-medium text-gray-900">
												{student.firstName}
												{student.lastName}
											</span>
											{#if pref && pref.likeStudentIds.length > 0}
												<span
													class="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700"
												>
													{pref.likeStudentIds.length} preferences
												</span>
											{/if}
										</div>
										{#if pref && pref.likeStudentIds.length > 0}
											<p class="mt-1 text-sm text-gray-500">
												Wants to work with: {pref.likeStudentIds.map(getStudentName).join(', ')}
											</p>
										{:else}
											<p class="mt-1 text-sm text-gray-400">No preferences</p>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Right column: Generate & Results -->
			<div class="space-y-4">
				<!-- Generate groups card -->
				<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="font-medium text-gray-900">Generate Groups</h2>
							<p class="text-sm text-gray-500">
								{#if preferencesCount > 0}
									Create groups based on {preferencesCount} student preferences
								{:else}
									Create random groups (no preferences loaded)
								{/if}
							</p>
						</div>
						<button
							type="button"
							class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
							disabled={isGenerating}
							onclick={handleGenerateScenario}
						>
							{#if isGenerating}
								Generating...
							{:else if scenario}
								Regenerate
							{:else}
								Generate Groups
							{/if}
						</button>
					</div>

					{#if generateError}
						<p class="mt-3 text-sm text-red-600">{generateError}</p>
					{/if}
				</div>

				<!-- Results card (only shown after generation) -->
				{#if scenario}
					<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div class="flex items-center justify-between">
							<h2 class="font-medium text-gray-900">Results</h2>
							<a
								href="/scenarios/{scenario.id}/student-view"
								class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
								target="_blank"
								rel="noopener"
							>
								View for class ↗
							</a>
						</div>

						<!-- Analytics -->
						{#if isComputingAnalytics}
							<p class="mt-3 text-sm text-gray-500">Computing satisfaction...</p>
						{:else if analyticsError}
							<p class="mt-3 text-sm text-red-600">{analyticsError}</p>
						{:else if analytics}
							<div class="mt-4 grid gap-3 sm:grid-cols-2">
								<div class="rounded-lg bg-green-50 p-3">
									<p class="text-xs text-green-700">Top choice satisfied</p>
									<p class="text-2xl font-bold text-green-800">
										{analytics.percentAssignedTopChoice.toFixed(0)}%
									</p>
								</div>
								{#if analytics.percentAssignedTop2 !== undefined}
									<div class="rounded-lg bg-blue-50 p-3">
										<p class="text-xs text-blue-700">Top 2 choices satisfied</p>
										<p class="text-2xl font-bold text-blue-800">
											{analytics.percentAssignedTop2.toFixed(0)}%
										</p>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Group preview -->
						<div class="mt-4">
							<h3 class="text-sm font-medium text-gray-700">Groups created</h3>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each scenario.groups as group}
									<span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
										{group.name} ({group.memberIds.length})
									</span>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
