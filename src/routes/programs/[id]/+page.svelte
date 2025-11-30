<script lang="ts">
        import { onMount } from 'svelte';
        import { get } from 'svelte/store';
        import { page } from '$app/stores';
        import { getAppEnvContext } from '$lib/contexts/appEnv';
        import type { Program } from '$lib/domain';
        import type { Pool } from '$lib/domain/pool';
        import type { Scenario } from '$lib/domain/scenario';
        import type { ScenarioSatisfaction } from '$lib/domain/analytics';
        import type { StudentViewData } from '$lib/application/useCases/getStudentView';
        import {
                computeAnalytics,
                generateScenario,
                getProgramWithPools,
                getStudentViewForScenario
        } from '$lib/services/appEnvUseCases';
        import { isOk } from '$lib/types/result';

        let env: ReturnType<typeof getAppEnvContext> | null = null;
        let programId = '';
        let program: Program | null = null;
        let pools: Pool[] = [];
        let isLoadingProgram = true;
        let programLoadError: string | null = null;

        let scenarioResult: Scenario | null = null;
        let scenarioError: string | null = null;
        let isGeneratingScenario = false;

        let analyticsScenarioId = '';
        let analyticsResult: ScenarioSatisfaction | null = null;
        let analyticsError: string | null = null;
        let isComputingAnalytics = false;

        let studentViewScenarioId = '';
        let studentViewStudentId = '';
        let studentViewResult: StudentViewData | null = null;
        let studentViewError: string | null = null;
        let isFetchingStudentView = false;

        onMount(async () => {
                env = getAppEnvContext();
                const currentProgramId = get(page).params.id;
                if (!currentProgramId) {
                        programLoadError = 'Program id is missing from the URL.';
                        isLoadingProgram = false;
                        return;
                }

                programId = currentProgramId;
                await loadProgram(programId);
        });

        async function loadProgram(id: string) {
                if (!env) {
                        programLoadError = 'Application environment is not ready yet.';
                        isLoadingProgram = false;
                        return;
                }

                isLoadingProgram = true;
                programLoadError = null;

                const result = await getProgramWithPools(env, id);
                if (isOk(result)) {
                        program = result.value.program;
                        pools = result.value.pools;
                } else {
                        switch (result.error.type) {
                                case 'PROGRAM_NOT_FOUND':
                                        programLoadError = `Program ${result.error.programId} was not found.`;
                                        break;
                                case 'PROGRAM_LOOKUP_FAILED':
                                case 'POOL_LOOKUP_FAILED':
                                        programLoadError = result.error.message;
                                        break;
                                case 'POOL_NOT_FOUND':
                                        programLoadError = `Pool ${result.error.poolId} was not found for this program.`;
                                        break;
                        }
                }

                isLoadingProgram = false;
        }

        function formatTimeSpan(timeSpan: Program['timeSpan']): string {
                if ('termLabel' in timeSpan) {
                        return timeSpan.termLabel;
                }
                return `${timeSpan.start.toLocaleDateString()}–${timeSpan.end.toLocaleDateString()}`;
        }

        async function handleGenerateScenario() {
                if (!env || !program) {
                        scenarioError = 'Load the program before generating a scenario.';
                        return;
                }

                isGeneratingScenario = true;
                scenarioError = null;
                scenarioResult = null;

                const result = await generateScenario(env, { programId: program.id });
                if (isOk(result)) {
                        scenarioResult = result.value;
                        analyticsScenarioId = result.value.id;
                        studentViewScenarioId = result.value.id;
                } else {
                        switch (result.error.type) {
                                case 'PROGRAM_NOT_FOUND':
                                        scenarioError = `Program ${result.error.programId} does not exist.`;
                                        break;
                                case 'POOL_NOT_FOUND':
                                        scenarioError = `Pool ${result.error.poolId} is missing.`;
                                        break;
                                case 'POOL_HAS_NO_MEMBERS':
                                        scenarioError = `Pool ${result.error.poolId} has no members to place.`;
                                        break;
                                case 'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM':
                                        scenarioError = `Scenario ${result.error.scenarioId} already exists for this program.`;
                                        break;
                                case 'GROUPING_ALGORITHM_FAILED':
                                case 'DOMAIN_VALIDATION_FAILED':
                                case 'INTERNAL_ERROR':
                                        scenarioError = result.error.message;
                                        break;
                        }
                }

                isGeneratingScenario = false;
        }

        async function handleComputeAnalytics() {
                if (!env) {
                        analyticsError = 'Application environment not ready.';
                        return;
                }

                const scenarioId = analyticsScenarioId.trim();
                if (!scenarioId) {
                        analyticsError = 'Enter a scenario ID to compute analytics.';
                        return;
                }

                analyticsError = null;
                analyticsResult = null;
                isComputingAnalytics = true;

                const result = await computeAnalytics(env, { scenarioId });
                if (isOk(result)) {
                        analyticsResult = result.value;
                } else {
                        switch (result.error.type) {
                                case 'SCENARIO_NOT_FOUND':
                                        analyticsError = `Scenario ${result.error.scenarioId} was not found.`;
                                        break;
                                case 'INTERNAL_ERROR':
                                        analyticsError = result.error.message;
                                        break;
                        }
                }

                isComputingAnalytics = false;
        }

        async function handleGetStudentView() {
                if (!env) {
                        studentViewError = 'Application environment not ready.';
                        return;
                }

                const scenarioId = studentViewScenarioId.trim();
                if (!scenarioId) {
                        studentViewError = 'Enter a scenario ID to build the student view.';
                        return;
                }

                studentViewError = null;
                studentViewResult = null;
                isFetchingStudentView = true;

                const result = await getStudentViewForScenario(env, {
                        scenarioId,
                        studentId: studentViewStudentId.trim() || undefined
                });

                if (isOk(result)) {
                        studentViewResult = result.value;
                } else {
                        switch (result.error.type) {
                                case 'SCENARIO_NOT_FOUND':
                                        studentViewError = `Scenario ${result.error.scenarioId} was not found.`;
                                        break;
                                case 'STUDENT_NOT_FOUND':
                                        studentViewError = `Student ${result.error.studentId} is not part of the scenario.`;
                                        break;
                                case 'INTERNAL_ERROR':
                                        studentViewError = result.error.message;
                                        break;
                        }
                }

                isFetchingStudentView = false;
        }
</script>

<div class="mx-auto max-w-5xl space-y-6 p-4">
        <header class="flex items-center justify-between gap-4">
                <div>
                        <p class="text-sm text-gray-600">Program workspace</p>
                        <h1 class="text-2xl font-semibold">{program?.name ?? 'Program'}</h1>
                        {#if program}
                                <p class="text-sm text-gray-600">{program.type} · {formatTimeSpan(program.timeSpan)}</p>
                        {/if}
                </div>
                <a href="/programs" class="rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        ← Back to Programs
                </a>
        </header>

        {#if isLoadingProgram}
                <p class="text-gray-600">Loading program…</p>
        {:else if programLoadError}
                <p class="text-sm text-red-600">{programLoadError}</p>
        {:else if program}
                <section class="rounded-lg border bg-white p-4 shadow-sm">
                        <h2 class="text-lg font-semibold">Pools</h2>
                        {#if pools.length === 0}
                                <p class="text-sm text-gray-600">No pools are linked to this program yet.</p>
                        {:else}
                                <ul class="mt-2 space-y-1 text-sm">
                                        {#each pools as pool}
                                                <li class="flex items-center justify-between rounded border px-3 py-2">
                                                        <span class="font-medium">{pool.name}</span>
                                                        <span class="text-gray-600">{pool.memberIds.length} members</span>
                                                </li>
                                        {/each}
                                </ul>
                        {/if}
                </section>

                <section class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-lg border bg-white p-4 shadow-sm space-y-3">
                                <div class="flex items-center justify-between">
                                        <h3 class="text-lg font-semibold">Generate scenario</h3>
                                        <button
                                                class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                on:click={handleGenerateScenario}
                                                disabled={isGeneratingScenario}
                                        >
                                                {isGeneratingScenario ? 'Generating…' : 'Generate'}
                                        </button>
                                </div>
                                <p class="text-sm text-gray-600">
                                        Runs the grouping algorithm against the program's primary pool.
                                </p>
                                {#if scenarioError}
                                        <p class="text-sm text-red-600">{scenarioError}</p>
                                {/if}
                                {#if scenarioResult}
                                        <div class="space-y-2 text-sm">
                                                <p class="font-medium">Scenario {scenarioResult.id}</p>
                                                <pre class="overflow-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify(scenarioResult, null, 2)}</pre>
                                        </div>
                                {/if}
                        </div>

                        <div class="rounded-lg border bg-white p-4 shadow-sm space-y-3">
                                <div class="flex items-center justify-between">
                                        <h3 class="text-lg font-semibold">Compute analytics</h3>
                                        <button
                                                class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                on:click={handleComputeAnalytics}
                                                disabled={isComputingAnalytics}
                                        >
                                                {isComputingAnalytics ? 'Computing…' : 'Compute'}
                                        </button>
                                </div>
                                <div class="space-y-1 text-sm">
                                        <label class="font-medium" for="analytics-scenario-id">Scenario ID</label>
                                        <input
                                                id="analytics-scenario-id"
                                                class="w-full rounded border p-2"
                                                bind:value={analyticsScenarioId}
                                                placeholder="scenario-id"
                                        />
                                </div>
                                {#if analyticsError}
                                        <p class="text-sm text-red-600">{analyticsError}</p>
                                {/if}
                                {#if analyticsResult}
                                        <div class="space-y-3 rounded-lg bg-gray-50 p-4">
                                                <div class="flex items-center justify-between">
                                                        <span class="text-sm font-medium text-gray-700">Top choice satisfaction</span>
                                                        <span class="text-lg font-semibold text-green-600">
                                                                {analyticsResult.percentAssignedTopChoice.toFixed(1)}%
                                                        </span>
                                                </div>

                                                {#if analyticsResult.percentAssignedTop2 !== undefined}
                                                        <div class="flex items-center justify-between">
                                                                <span class="text-sm font-medium text-gray-700">Top 2 choices satisfaction</span>
                                                                <span class="text-lg font-semibold text-blue-600">
                                                                        {analyticsResult.percentAssignedTop2.toFixed(1)}%
                                                                </span>
                                                        </div>
                                                {/if}

                                                <div class="flex items-center justify-between">
                                                        <span class="text-sm font-medium text-gray-700">Avg. preference rank</span>
                                                        <span class="text-lg font-semibold text-gray-800">
                                                                {Number.isNaN(analyticsResult.averagePreferenceRankAssigned)
                                                                        ? 'N/A'
                                                                        : analyticsResult.averagePreferenceRankAssigned.toFixed(2)}
                                                        </span>
                                                </div>

                                                <p class="text-xs text-gray-500">Lower rank is better (1 = got first choice)</p>
                                        </div>
                                {/if}
                        </div>

                        <div class="rounded-lg border bg-white p-4 shadow-sm space-y-3 md:col-span-2">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                        <h3 class="text-lg font-semibold">Student view</h3>
                                        <button
                                                class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                on:click={handleGetStudentView}
                                                disabled={isFetchingStudentView}
                                        >
                                                {isFetchingStudentView ? 'Loading…' : 'Build view'}
                                        </button>
                                </div>
                                <div class="grid gap-3 md:grid-cols-2">
                                        <div class="space-y-1 text-sm">
                                                <label class="font-medium" for="student-view-scenario-id">Scenario ID</label>
                                                <input
                                                        id="student-view-scenario-id"
                                                        class="w-full rounded border p-2"
                                                        bind:value={studentViewScenarioId}
                                                        placeholder="scenario-id"
                                                />
                                        </div>
                                        <div class="space-y-1 text-sm">
                                                <label class="font-medium" for="student-view-student-id">
                                                        Optional student ID to highlight
                                                </label>
                                                <input
                                                        id="student-view-student-id"
                                                        class="w-full rounded border p-2"
                                                        bind:value={studentViewStudentId}
                                                        placeholder="student-id"
                                                />
                                        </div>
                                </div>
                                {#if studentViewError}
                                        <p class="text-sm text-red-600">{studentViewError}</p>
                                {/if}
                                {#if studentViewResult}
                                        <div class="space-y-2 text-sm">
                                                <p class="font-medium">Groups</p>
                                                <pre class="overflow-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify(studentViewResult, null, 2)}</pre>
                                                <a
                                                        href="/scenarios/{studentViewScenarioId}/student-view"
                                                        class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                                        target="_blank"
                                                        rel="noopener"
                                                >
                                                        Open Projection View ↗
                                                </a>
                                        </div>
                                {/if}
                        </div>
                </section>
        {/if}
</div>
