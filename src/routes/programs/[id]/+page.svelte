<script lang="ts">
        import { onMount } from 'svelte';
        import { get } from 'svelte/store';
        import { page } from '$app/stores';
        import { getAppEnvContext } from '$lib/contexts/appEnv';
        import type { Program } from '$lib/domain';
        import type { Pool } from '$lib/domain/pool';
        import type { Scenario } from '$lib/domain/scenario';
        import { generateScenario, getProgramWithPools } from '$lib/services/appEnvUseCases';
        import { isOk } from '$lib/types/result';
        import { storeScenarioForProjection } from '$lib/infrastructure/scenarioStorage';
        import VerticalGroupLayout from '$lib/components/group/VerticalGroupLayout.svelte';
        import UnassignedSidebar from '$lib/components/roster/UnassignedSidebar.svelte';
        import type { DropState } from '$lib/utils/pragmatic-dnd';
        import type { Group } from '$lib/types';
        import { commandStore } from '$lib/stores/commands.svelte';

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

                const result = await generateScenario(env, { programId: program.id });
                if (isOk(result)) {
                        syncScenario(result.value);

                        // Store scenario and students in localStorage for projection view
                        const students = await env.studentRepo.getByIds(result.value.participantSnapshot);
                        storeScenarioForProjection(result.value, students);
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
                                        {isGeneratingScenario ? 'Running…' : 'Run algorithm again'}
                                </button>
                        </div>

                        {#if scenarioError}
                                <p class="text-sm text-red-600">{scenarioError}</p>
                        {/if}

                        {#if scenarioResult}
                                <div class="rounded-lg border bg-gray-50 p-3 text-xs text-gray-700">
                                        <span class="font-semibold">Scenario:</span> {scenarioResult.id}
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
