<script lang="ts">
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { listPools } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Pool } from '$lib/domain';

	let env: ReturnType<typeof getAppEnvContext> | null = null;
	let pools: Pool[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		env = getAppEnvContext();
		await loadPools();
	});

	async function loadPools() {
		if (!env) return;

		loading = true;
		error = null;

		const result = await listPools(env);

		if (isErr(result)) {
			error = result.error.message;
		} else {
			pools = result.value;
		}

		loading = false;
	}
</script>

<svelte:head>
	<title>Pools | Friend Hat</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<header class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Pools</h1>
			<p class="text-sm text-gray-600">
				Pools are named rosters of students. Create a Pool first, then use it when creating
				Programs.
			</p>
		</div>
		<a
			href="/pools/import"
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Import Roster
		</a>
	</header>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading pools...</p>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else if pools.length === 0}
		<div class="rounded-md border-2 border-dashed border-gray-300 p-8 text-center">
			<h3 class="text-lg font-medium text-gray-900">No pools yet</h3>
			<p class="mt-1 text-sm text-gray-500">Import a roster to create your first Pool.</p>
			<a
				href="/pools/import"
				class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Import Roster
			</a>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each pools as pool (pool.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="font-medium text-gray-900">{pool.name}</h3>
							<p class="text-sm text-gray-500">{pool.type}</p>
						</div>
						<span
							class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
						>
							{pool.memberIds.length} students
						</span>
					</div>
					<div class="mt-3 flex items-center gap-2 text-xs text-gray-400">
						<span class="truncate" title={pool.id}>{pool.id.slice(0, 8)}...</span>
						{#if pool.status === 'ARCHIVED'}
							<span class="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">Archived</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
