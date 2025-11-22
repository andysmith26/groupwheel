<script lang="ts">
        import { onMount } from 'svelte';
        import { getAppEnvContext } from '$lib/contexts/appEnv';
        import type { Program } from '$lib/domain';
        import type { ProgramWithPrimaryPool } from '$lib/application/useCases/listPrograms';
        import { listPrograms } from '$lib/services/appEnvUseCases';
        import { seedDemoData } from '$lib/services/demoData';
        import { isOk } from '$lib/types/result';

        let programsWithPools: ProgramWithPrimaryPool[] = [];
        let isLoading = true;
        let loadError: string | null = null;
        let seedError: string | null = null;
        let seedSuccess: string | null = null;
        let isSeedingDemo = false;
        let env: ReturnType<typeof getAppEnvContext> | null = null;

        onMount(async () => {
                env = getAppEnvContext();
                await loadPrograms();
        });

        async function loadPrograms() {
                if (!env) return;

                try {
                        isLoading = true;
                        loadError = null;

                        const result = await listPrograms(env);
                        if (isOk(result)) {
                                programsWithPools = result.value;
                        } else {
                                loadError = result.error.message;
                        }
                } catch (e) {
                        loadError = e instanceof Error ? e.message : 'Unknown error loading programs';
                } finally {
                        isLoading = false;
                }
        }

        async function handleSeedDemoData() {
                if (!env) return;

                seedError = null;
                seedSuccess = null;
                isSeedingDemo = true;

                try {
                        const result = await seedDemoData(env);
                        seedSuccess = `Loaded ${result.program.name} with ${result.pool.memberIds.length} students.`;
                        await loadPrograms();
                } catch (e) {
                        seedError = e instanceof Error ? e.message : 'Unable to load demo data.';
                } finally {
                        isSeedingDemo = false;
                }
        }

        function getPrimaryPoolName(entry: ProgramWithPrimaryPool): string {
                const primaryPoolId = entry.program.primaryPoolId ?? entry.program.poolIds[0];
                if (entry.primaryPool) return entry.primaryPool.name;
                return primaryPoolId ?? '—';
        }

        function formatTimeSpan(program: Program): string {
                if ('termLabel' in program.timeSpan) {
                        return program.timeSpan.termLabel;
                }
                return `${program.timeSpan.start.toLocaleDateString()}–${program.timeSpan.end.toLocaleDateString()}`;
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

        {#if seedSuccess}
                <p class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {seedSuccess}
                </p>
        {:else if seedError}
                <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{seedError}</p>
        {/if}

        {#if isLoading}
                <p class="text-gray-600">Loading programs…</p>
        {:else if loadError}
                <p class="text-sm text-red-600">{loadError}</p>
        {:else if programsWithPools.length === 0}
                <div class="space-y-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        <p>
                                No programs yet. Click
                                <a href="/programs/new" class="text-blue-600 underline">Import Pool &amp; Create Program</a>
                                to get started, or load demo data to explore the UI without an import.
                        </p>

                        <button
                                class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                on:click|preventDefault={handleSeedDemoData}
                                disabled={isSeedingDemo}
                        >
                                {isSeedingDemo ? 'Loading demo data…' : 'Load demo data'}
                        </button>
                </div>
        {:else}
                <table class="min-w-full divide-y border text-sm">
                        <thead class="bg-gray-50">
                                <tr>
                                        <th class="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                                        <th class="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                                        <th class="px-3 py-2 text-left font-medium text-gray-700">Term</th>
                                        <th class="px-3 py-2 text-left font-medium text-gray-700">Primary Pool</th>
                                        <th class="px-3 py-2 text-left font-medium text-gray-700">Workspace</th>
                                </tr>
                        </thead>
                        <tbody class="divide-y">
                                {#each programsWithPools as entry}
                                        <tr>
                                                <td class="px-3 py-2">
                                                        <a
                                                                class="text-blue-700 underline hover:text-blue-900"
                                                                href={`/programs/${entry.program.id}`}
                                                        >
                                                                {entry.program.name}
                                                        </a>
                                                </td>
                                                <td class="px-3 py-2">{entry.program.type}</td>
                                                <td class="px-3 py-2">{formatTimeSpan(entry.program)}</td>
                                                <td class="px-3 py-2">{getPrimaryPoolName(entry)}</td>
                                                <td class="px-3 py-2">
                                                        <a
                                                                class="rounded-md border px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                                                href={`/programs/${entry.program.id}`}
                                                        >
                                                                Open
                                                        </a>
                                                </td>
                                        </tr>
                                {/each}
                        </tbody>
                </table>
        {/if}
</div>
