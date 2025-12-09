<script lang="ts">
	/**
	 * Activity detail page with generate + link to Step 4 editor.
	 *
	 * This intentionally keeps group editing in the dedicated Step 4 UI
	 * (/groups/new?step=4&scenarioId=...) so teachers can drag/drop there.
	 */
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { generateScenario } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import { computeGroupsAnalytics } from '$lib/application/useCases/computeGroupsAnalytics';
	import type {
		Program,
		Pool,
		Scenario,
		Student,
		Preference,
		StudentPreference
	} from '$lib/domain';
	import { extractStudentPreference } from '$lib/domain/preference';
	import type { ScenarioSatisfaction } from '$lib/domain/analytics';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Page data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let preferences = $state<Preference[]>([]);
	let scenario = $state<Scenario | null>(null);

	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- UI state ---
	let showStudentList = $state(false);
	let isGenerating = $state(false);
	let generateError = $state<string | null>(null);
	let isOpeningEditor = $state(false);

	// --- Analytics ---
	let analytics = $state<ScenarioSatisfaction | null>(null);
	let analyticsError = $state<string | null>(null);

	// --- Derived helpers ---
	let preferencesCount = $derived(preferences.length);
	let preferencesPercent = $derived(
		students.length > 0 ? Math.round((preferencesCount / students.length) * 100) : 0
	);
	let preferencesByStudentId = $derived(
		new Map<string, StudentPreference>(
			preferences.map((p) => [p.studentId, extractStudentPreference(p)])
		)
	);

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
			program = await env.programRepo.getById(programId);
			if (!program) {
				loadError = `Activity not found: ${programId}`;
				loading = false;
				return;
			}

			const poolId = program.primaryPoolId ?? program.poolIds?.[0];
			if (poolId) {
				pool = await env.poolRepo.getById(poolId);
			}

			if (pool) {
				students = await env.studentRepo.getByIds(pool.memberIds);
			}

			preferences = await env.preferenceRepo.listByProgramId(programId);

			const existingScenario = await env.scenarioRepo.getByProgramId(programId);
			if (existingScenario) {
				scenario = existingScenario;
				await refreshAnalytics(existingScenario);
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
			generateError = (() => {
				switch (result.error.type) {
					case 'PROGRAM_NOT_FOUND':
						return `Program not found: ${result.error.programId}`;
					case 'POOL_NOT_FOUND':
						return `Pool not found: ${result.error.poolId}`;
					case 'POOL_HAS_NO_MEMBERS':
						return `Pool has no members: ${result.error.poolId}`;
					default:
						return 'Failed to generate scenario';
				}
			})();
			isGenerating = false;
			return;
		}

		scenario = result.value;
		await refreshAnalytics(result.value);
		isGenerating = false;
	}

	async function refreshAnalytics(currentScenario: Scenario) {
		try {
			analyticsError = null;
			analytics = computeGroupsAnalytics({
				groups: currentScenario.groups,
				preferences,
				participantSnapshot: currentScenario.participantSnapshot
			});
		} catch (e) {
			analyticsError = e instanceof Error ? e.message : 'Failed to compute analytics';
		}
	}

	function getStudentName(id: string): string {
		const student = students.find((s) => s.id === id);
		if (!student) return id;
		return `${student.firstName} ${student.lastName}`.trim() || id;
	}

	async function openEditor() {
		if (!env || !program || isOpeningEditor) return;
		isOpeningEditor = true;

		try {
			if (!scenario) {
				await handleGenerateScenario();
			}
			if (scenario) {
				goto(`/groups/new?step=4&scenarioId=${scenario.id}`);
			}
		} finally {
			isOpeningEditor = false;
		}
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
		<header class="flex items-center justify-between gap-4">
			<div>
				<a href="/groups" class="text-sm text-gray-500 hover:text-gray-700">← All activities</a>
				<h1 class="mt-1 text-2xl font-semibold text-gray-900">{program.name}</h1>
			</div>
		</header>

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="space-y-4">
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

			<div class="space-y-4">
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
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
								disabled={isGenerating || isOpeningEditor}
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
							<button
								type="button"
								class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
								disabled={isOpeningEditor}
								onclick={openEditor}
							>
								{isOpeningEditor ? 'Opening…' : 'Edit groups'}
							</button>
						</div>
					</div>

					{#if generateError}
						<p class="mt-3 text-sm text-red-600">{generateError}</p>
					{/if}
				</div>

				{#if scenario}
					<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div class="flex items-center justify-between">
							<h2 class="font-medium text-gray-900">Results</h2>
							{#if analytics}
								<span class="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
									Updated
								</span>
							{/if}
						</div>

						{#if analyticsError}
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
							<div class="mt-4">
								<h3 class="text-sm font-medium text-gray-700">Groups created</h3>
								<div class="mt-2 flex flex-wrap gap-2">
									{#each scenario.groups as group (group.id)}
										<span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
											{group.name} ({group.memberIds.length})
										</span>
									{/each}
								</div>
							</div>
						{:else}
							<p class="mt-3 text-sm text-gray-500">Generate groups to see analytics.</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
