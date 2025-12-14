<script lang="ts">
	/**
	 * /groups/+page.svelte
	 *
	 * List of grouping activities (Programs in domain terms).
	 * Teachers see this as "my grouping activities" not "my programs."
	 */

	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Pool } from '$lib/domain';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	interface ActivityDisplay {
		program: Program;
		pool: Pool | null;
		studentCount: number;
		hasScenario: boolean;
	}

	let activities = $state<ActivityDisplay[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		env = getAppEnvContext();
		await loadActivities();
	});

	async function loadActivities() {
		if (!env) return;

		loading = true;
		error = null;

		try {
			// Use listAll() on programRepo and poolRepo (these exist)
			const programs = await env.programRepo.listAll();
			const pools = await env.poolRepo.listAll();

			const poolMap = new SvelteMap(pools.map((p) => [p.id, p]));

			// For scenarios, check each program individually
			// since ScenarioRepository only has getByProgramId(), not listAll()
			const scenarioByProgram = new SvelteMap<string, boolean>();
			for (const program of programs) {
				const scenario = await env.scenarioRepo.getByProgramId(program.id);
				scenarioByProgram.set(program.id, scenario !== null);
			}

			activities = programs
				.map((program) => {
					// Program uses primaryPoolId or first poolIds entry
					const poolId = program.primaryPoolId ?? program.poolIds?.[0];
					const pool = poolId ? (poolMap.get(poolId) ?? null) : null;
					return {
						program,
						pool,
						studentCount: pool?.memberIds.length ?? 0,
						hasScenario: scenarioByProgram.get(program.id) ?? false
					};
				})
				.sort((a, b) => a.program.name.localeCompare(b.program.name));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load activities';
		} finally {
			loading = false;
		}
	}

	function getProgramTimeLabel(program: Program): string {
		if ('termLabel' in program.timeSpan) {
			return program.timeSpan.termLabel;
		}
		if ('start' in program.timeSpan && program.timeSpan.start) {
			return program.timeSpan.start.toLocaleDateString();
		}
		return '';
	}
</script>

<svelte:head>
	<title>Activities | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Grouping Activities</h1>
			<p class="text-sm text-gray-600">
				Create and manage student groupings for projects, labs, and activities.
			</p>
		</div>
		<a
			href="/groups/new"
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Create Groups
		</a>
	</header>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading activities...</p>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else if activities.length === 0}
		<!-- Empty state -->
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
				<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					></path>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900">No activities yet</h3>
			<p class="mt-1 text-sm text-gray-500">Create your first grouping activity to get started.</p>
			<a
				href="/groups/new"
				class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Create Groups
			</a>
		</div>
	{:else}
		<!-- Activity cards -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each activities as activity (activity.program.id)}
				<a
					href="/groups/{activity.program.id}"
					class="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
				>
					<div class="flex items-start justify-between">
						<div class="min-w-0 flex-1">
							<h3 class="truncate font-medium text-gray-900 group-hover:text-blue-600">
								{activity.program.name}
							</h3>
							<p class="mt-1 text-sm text-gray-500">
								{activity.studentCount} students
							</p>
						</div>

						<!-- Status badge -->
						{#if activity.hasScenario}
							<span
								class="ml-2 flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
							>
								Groups created
							</span>
						{:else}
							<span
								class="ml-2 flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
							>
								Ready
							</span>
						{/if}
					</div>

					<div class="mt-3 flex items-center justify-between text-xs text-gray-400">
						<span>{getProgramTimeLabel(activity.program)}</span>
						<span class="max-w-[120px] truncate" title={activity.program.id}>
							{activity.program.id.slice(0, 8)}...
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
