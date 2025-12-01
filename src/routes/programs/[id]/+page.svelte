<script lang="ts">
        import { onMount } from 'svelte';
        import { get } from 'svelte/store';
        import { page } from '$app/stores';
        import { getAppEnvContext } from '$lib/contexts/appEnv';
        import { setAppDataContext } from '$lib/contexts/appData';
        import type { Program } from '$lib/domain';
        import type { Pool } from '$lib/domain/pool';
        import type { Scenario } from '$lib/domain/scenario';
        import { generateScenario, getProgramWithPools, computeAnalytics } from '$lib/services/appEnvUseCases';
        import { isOk } from '$lib/types/result';
        import { storeScenarioForProjection } from '$lib/infrastructure/scenarioStorage';
        import VerticalGroupLayout from '$lib/components/group/VerticalGroupLayout.svelte';
        import UnassignedSidebar from '$lib/components/roster/UnassignedSidebar.svelte';
        import type { DropState } from '$lib/utils/pragmatic-dnd';
        import type { Group } from '$lib/types';
        import type { StudentPreference } from '$lib/types/preferences';
        import { commandStore } from '$lib/stores/commands.svelte';
        import type { ScenarioSatisfaction } from '$lib/domain/analytics';
        import { createScenario } from '$lib/domain/scenario';

        const appDataContext = { studentsById: {}, preferencesById: {} } satisfies {
                studentsById: Record<string, import('$lib/types').Student>;
                preferencesById: Record<string, StudentPreference>;
        };
        setAppDataContext(appDataContext);

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

        let selectedStudentId: string | null = null;
        let currentlyDragging: string | null = null;
        let flashingContainer: string | null = null;
        let collapsedGroups: Set<string> = new Set();
        let unassignedCollapsed = false;

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

        function syncScenario(nextScenario: Scenario) {
                scenarioResult = nextScenario;
                analyticsScenarioId = nextScenario.id;
                studentViewScenarioId = nextScenario.id;
                commandStore.initializeGroups(nextScenario.groups);
                collapsedGroups = new Set();
                selectedStudentId = null;
                currentlyDragging = null;
                flashingContainer = null;
        }

        function setScenarioGroups(nextGroups: Group[]) {
                if (!scenarioResult) return;
                scenarioResult = { ...scenarioResult, groups: nextGroups };
        }

        $: unassignedStudentIds = scenarioResult
                ? scenarioResult.participantSnapshot.filter((id) =>
                                !scenarioResult?.groups.some((group) => group.memberIds.includes(id))
                        )
                : [];

        function handleDragStart(studentId: string) {
                currentlyDragging = studentId;
                selectedStudentId = studentId;
        }

        function handleStudentClick(studentId: string) {
                selectedStudentId = selectedStudentId === studentId ? null : studentId;
        }

        function triggerFlash(containerId: string) {
                flashingContainer = containerId;
                setTimeout(() => {
                        if (flashingContainer === containerId) {
                                flashingContainer = null;
                        }
                }, 700);
        }

        function handleDrop(state: DropState) {
                if (!scenarioResult) return;

                const { draggedItem, sourceContainer, targetContainer } = state;
                const studentId = draggedItem.id;

                if (!targetContainer || targetContainer === sourceContainer) {
                        currentlyDragging = null;
                        return;
                }

                if (targetContainer !== 'unassigned') {
                        const targetGroup = commandStore.groups.find((g) => g.id === targetContainer);
                        if (targetGroup) {
                                const currentCount = targetGroup.memberIds.length;
                                if (targetGroup.capacity != null && currentCount >= targetGroup.capacity) {
                                        currentlyDragging = null;
                                        return;
                                }
                        }
                }

                if (collapsedGroups.has(targetContainer)) {
                        const next = new Set(collapsedGroups);
                        next.delete(targetContainer);
                        collapsedGroups = next;
                }

                if (targetContainer === 'unassigned') {
                        if (!sourceContainer) {
                                currentlyDragging = null;
                                return;
                        }

                        commandStore.dispatch({
                                type: 'UNASSIGN_STUDENT',
                                studentId,
                                previousGroupId: sourceContainer
                        });
                } else {
                        commandStore.dispatch({
                                type: 'ASSIGN_STUDENT',
                                studentId,
                                groupId: targetContainer,
                                previousGroupId: sourceContainer ?? undefined
                        });
                }

                setScenarioGroups(commandStore.groups);
                triggerFlash(targetContainer);
                currentlyDragging = null;
        }

        function handleUpdateGroup(groupId: string, changes: Partial<Group>) {
                if (!scenarioResult) return;
                commandStore.updateGroup(groupId, changes);
                setScenarioGroups(commandStore.groups);
        }

        function handleToggleCollapse(groupId: string) {
                const next = new Set(collapsedGroups);
                if (next.has(groupId)) {
                        next.delete(groupId);
                } else {
                        next.add(groupId);
                }
                collapsedGroups = next;
        }

        async function handleGenerateScenario() {
                if (!env || !program) {
                        scenarioError = 'Load the program before generating a scenario.';
                        return;
                }

                isGeneratingScenario = true;
                scenarioError = null;
                scenarioResult = null;
                analyticsResult = null;
                analyticsError = null;

                const existingScenario = await env.scenarioRepo.getByProgramId(program.id);

                if (existingScenario) {
                        const poolId = program.primaryPoolId ?? program.poolIds[0];
                        if (!poolId) {
                                scenarioError = 'No pool configured for this program.';
                                isGeneratingScenario = false;
                                return;
                        }

                        const pool = await env.poolRepo.getById(poolId);
                        if (!pool) {
                                scenarioError = `Pool ${poolId} is missing.`;
                                isGeneratingScenario = false;
                                return;
                        }
                        if (!pool.memberIds.length) {
                                scenarioError = `Pool ${poolId} has no members to place.`;
                                isGeneratingScenario = false;
                                return;
                        }

                        const groupingResult = await env.groupingAlgorithm.generateGroups({
                                programId: program.id,
                                studentIds: pool.memberIds
                        });

                        if (!groupingResult.success) {
                                scenarioError = groupingResult.message;
                                isGeneratingScenario = false;
                                return;
                        }

                        const refreshedScenario = createScenario({
                                id: existingScenario.id,
                                programId: program.id,
                                groups: groupingResult.groups.map((g) => ({
                                        id: g.id,
                                        name: g.name,
                                        capacity: g.capacity,
                                        memberIds: g.memberIds
                                })),
                                participantIds: pool.memberIds,
                                createdAt: existingScenario.createdAt,
                                createdByStaffId: existingScenario.createdByStaffId,
                                algorithmConfig: existingScenario.algorithmConfig
                        });

                        await env.scenarioRepo.update(refreshedScenario);
                        await hydrateScenario(refreshedScenario);
                } else {
                        const result = await generateScenario(env, { programId: program.id });
                        if (isOk(result)) {
                                await hydrateScenario(result.value);
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
                }

                isGeneratingScenario = false;
        }

        async function hydrateScenario(nextScenario: Scenario) {
                if (!env || !program) return;

                await loadAppDataContext(nextScenario.participantSnapshot, program.id);
                syncScenario(nextScenario);
                await refreshAnalytics(nextScenario.id);

                const students = await env.studentRepo.getByIds(nextScenario.participantSnapshot);
                storeScenarioForProjection(nextScenario, students);
        }

        async function loadAppDataContext(studentIds: string[], programId: string) {
                if (!env) return;

                const [students, preferences] = await Promise.all([
                        env.studentRepo.getByIds(studentIds),
                        env.preferenceRepo.listByProgramId(programId)
                ]);

                appDataContext.studentsById = Object.fromEntries(
                        students.map((student) => [student.id, student])
                );
                const preferencesById: Record<string, StudentPreference> = {};

                for (const pref of preferences) {
                        if (studentIds.includes(pref.studentId)) {
                                preferencesById[pref.studentId] = parsePreferencePayload(pref.payload, pref.studentId);
                        }
                }

                for (const studentId of studentIds) {
                        if (!preferencesById[studentId]) {
                                preferencesById[studentId] = createEmptyPreference(studentId);
                        }
                }

                appDataContext.preferencesById = preferencesById;
        }

        function parsePreferencePayload(payload: unknown, studentId: string): StudentPreference {
                if (!payload || typeof payload !== 'object') {
                        return createEmptyPreference(studentId);
                }

                const pref = payload as Partial<StudentPreference>;

                return {
                        studentId: pref.studentId ?? studentId,
                        likeStudentIds: Array.isArray(pref.likeStudentIds) ? pref.likeStudentIds : [],
                        avoidStudentIds: Array.isArray(pref.avoidStudentIds) ? pref.avoidStudentIds : [],
                        likeGroupIds: Array.isArray(pref.likeGroupIds) ? pref.likeGroupIds : [],
                        avoidGroupIds: Array.isArray(pref.avoidGroupIds) ? pref.avoidGroupIds : [],
                        meta: pref.meta
                };
        }

        function createEmptyPreference(studentId: string): StudentPreference {
                return {
                        studentId,
                        likeStudentIds: [],
                        avoidStudentIds: [],
                        likeGroupIds: [],
                        avoidGroupIds: []
                };
        }

        async function refreshAnalytics(scenarioId: string) {
                if (!env) return;

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

                <section class="rounded-lg border bg-white p-4 shadow-sm space-y-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                        <h3 class="text-lg font-semibold">Grouping board</h3>
                                        <p class="text-sm text-gray-600">Generate a scenario and adjust assignments inline.</p>
                                </div>
                                <button
                                        class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        on:click={handleGenerateScenario}
                                        disabled={isGeneratingScenario}
                                >
                                        {#if isGeneratingScenario}
                                                Running…
                                        {:else if scenarioResult}
                                                Run algorithm again
                                        {:else}
                                                Run algorithm
                                        {/if}
                                </button>
                        </div>

                        {#if scenarioError}
                                <p class="text-sm text-red-600">{scenarioError}</p>
                        {/if}

                        {#if scenarioResult}
                                <div class="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700 space-y-2">
                                        <div class="flex flex-wrap items-center justify-between gap-3">
                                                <div class="space-y-1">
                                                        <p class="text-xs uppercase tracking-wide text-gray-500">Scenario</p>
                                                        <p class="text-base font-semibold text-gray-900">{scenarioResult.id}</p>
                                                </div>
                                                <a
                                                        href={`/scenarios/${scenarioResult.id}/student-view`}
                                                        class="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                                                        target="_blank"
                                                        rel="noopener"
                                                >
                                                        Printable student view ↗
                                                </a>
                                        </div>

                                        {#if isComputingAnalytics}
                                                <p class="text-xs text-gray-600">Computing stats…</p>
                                        {:else if analyticsResult}
                                                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                        <div class="rounded-md bg-white p-3 shadow-sm">
                                                                <p class="text-xs text-gray-500">Top choice satisfaction</p>
                                                                <p class="text-lg font-semibold text-green-700">
                                                                        {analyticsResult.percentAssignedTopChoice.toFixed(1)}%
                                                                </p>
                                                        </div>

                                                        {#if analyticsResult.percentAssignedTop2 !== undefined}
                                                                <div class="rounded-md bg-white p-3 shadow-sm">
                                                                        <p class="text-xs text-gray-500">Top 2 choices satisfaction</p>
                                                                        <p class="text-lg font-semibold text-blue-700">
                                                                                {analyticsResult.percentAssignedTop2.toFixed(1)}%
                                                                        </p>
                                                                </div>
                                                        {/if}

                                                        <div class="rounded-md bg-white p-3 shadow-sm">
                                                                <p class="text-xs text-gray-500">Avg. preference rank</p>
                                                                <p class="text-lg font-semibold text-gray-800">
                                                                        {Number.isNaN(analyticsResult.averagePreferenceRankAssigned)
                                                                                ? 'N/A'
                                                                                : analyticsResult.averagePreferenceRankAssigned.toFixed(2)}
                                                                </p>
                                                                <p class="text-[11px] text-gray-500">Lower is better (1 = first choice)</p>
                                                        </div>
                                                </div>
                                        {:else if analyticsError}
                                                <p class="text-xs text-red-600">{analyticsError}</p>
                                        {:else}
                                                <p class="text-xs text-gray-600">Stats will appear after running the algorithm.</p>
                                        {/if}
                                </div>

                                <div class="flex gap-4">
                                        <UnassignedSidebar
                                                studentIds={unassignedStudentIds}
                                                {selectedStudentId}
                                                {currentlyDragging}
                                                {flashingContainer}
                                                isCollapsed={unassignedCollapsed}
                                                onDrop={handleDrop}
                                                onDragStart={handleDragStart}
                                                onClick={handleStudentClick}
                                                onToggleCollapse={() => (unassignedCollapsed = !unassignedCollapsed)}
                                        />

                                        <div class="w-full overflow-x-auto">
                                                <VerticalGroupLayout
                                                        groups={commandStore.groups}
                                                        {selectedStudentId}
                                                        {currentlyDragging}
                                                        {collapsedGroups}
                                                        {flashingContainer}
                                                        onDrop={handleDrop}
                                                        onDragStart={handleDragStart}
                                                        onClick={handleStudentClick}
                                                        onUpdateGroup={handleUpdateGroup}
                                                        onToggleCollapse={handleToggleCollapse}
                                                />
                                        </div>
                                </div>
                        {:else}
                                <p class="text-sm text-gray-700">
                                        Run the algorithm to load a scenario and start arranging students.
                                </p>
                        {/if}
                </section>
        {/if}
</div>
