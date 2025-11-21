<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Pool } from '$lib/domain';

	let programs: Program[] = [];
	let poolsById: Record<string, Pool> = {};
	let isLoading = true;
	let loadError: string | null = null;

	onMount(async () => {
		try {
			const env = getAppEnvContext();
			isLoading = true;
			loadError = null;

			const allPrograms = await env.programRepo.listAll();
			programs = allPrograms;

			// Load all referenced primary pools so we can show names.
			const poolIds = new Set<string>();
			for (const p of allPrograms) {
				const primaryPoolId = p.primaryPoolId ?? p.poolIds[0];
				if (primaryPoolId) {
					poolIds.add(primaryPoolId);
				}
			}

			const loadedPools: Pool[] = [];
			for (const id of poolIds) {
				const pool = await env.poolRepo.getById(id);
				if (pool) loadedPools.push(pool);
			}

			poolsById = Object.fromEntries(loadedPools.map((p) => [p.id, p]));
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Unknown error loading programs';
		} finally {
			isLoading = false;
		}
	});

	function getPrimaryPoolName(program: Program): string {
		const primaryPoolId = program.primaryPoolId ?? program.poolIds[0];
		if (!primaryPoolId) return '—';
		const pool = poolsById[primaryPoolId];
		return pool ? pool.name : primaryPoolId;
	}
</script>

<div class="mx-auto max-w-5xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Programs</h1>
		<a
			href="/programs/new"
			class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Import Pool &amp; Create Program
		</a>
	</header>

	{#if isLoading}
		<p class="text-gray-600">Loading programs…</p>
	{:else if loadError}
		<p class="text-sm text-red-600">{loadError}</p>
	{:else if programs.length === 0}
		<p class="text-sm text-gray-600">
			No programs yet. Click
			<a href="/programs/new" class="text-blue-600 underline">Import Pool &amp; Create Program</a>
			to get started.
		</p>
	{:else}
		<table class="min-w-full divide-y border text-sm">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-3 py-2 text-left font-medium text-gray-700">Name</th>
					<th class="px-3 py-2 text-left font-medium text-gray-700">Type</th>
					<th class="px-3 py-2 text-left font-medium text-gray-700">Term</th>
					<th class="px-3 py-2 text-left font-medium text-gray-700">Primary Pool</th>
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each programs as program}
					<tr>
						<td class="px-3 py-2">{program.name}</td>
						<td class="px-3 py-2">{program.type}</td>
						<td class="px-3 py-2">
							{#if 'termLabel' in program.timeSpan}
								{program.timeSpan.termLabel}
							{:else}
								{program.timeSpan.start.toLocaleDateString()}–{program.timeSpan.end.toLocaleDateString()}
							{/if}
						</td>
						<td class="px-3 py-2">{getPrimaryPoolName(program)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
