<script lang="ts">
        import { page } from '$app/stores';
        import { onMount } from 'svelte';
        import { getStoredScenario } from '$lib/infrastructure/scenarioStorage';
        import type { GroupView, StudentViewData } from '$lib/application/useCases/getStudentView';
        import type { Student } from '$lib/domain';

        let loading = true;
        let error: string | null = null;
        let viewData: StudentViewData | null = null;

        onMount(async () => {
                const scenarioId = $page.params.id;
                if (!scenarioId) {
                        error = 'No scenario ID provided.';
                        loading = false;
                        return;
                }

                // Load from localStorage (stored when scenario was generated)
                const stored = getStoredScenario(scenarioId);
                if (!stored) {
                        error = `Scenario not found: ${scenarioId}. Make sure to generate the scenario first.`;
                        loading = false;
                        return;
                }

                const { scenario, students } = stored;

                // Build a map of students for quick lookup
                const studentsById = new Map<string, Student>();
                for (const s of students) {
                        studentsById.set(s.id, s);
                }

                // Build the view data from stored scenario
                const groups: GroupView[] = scenario.groups.map((group) => ({
                        id: group.id,
                        name: group.name,
                        capacity: group.capacity,
                        members: group.memberIds
                                .map((id) => studentsById.get(id))
                                .filter((s): s is Student => !!s)
                                .map((s) => ({
                                        id: s.id,
                                        firstName: s.firstName,
                                        lastName: s.lastName,
                                        gradeLevel: s.gradeLevel
                                }))
                }));

                viewData = {
                        scenarioId: scenario.id,
                        programId: scenario.programId,
                        groups,
                        highlightedStudentGroups: []
                };

                loading = false;
        });
</script>

<svelte:head>
        <title>Student Groups</title>
</svelte:head>

{#if loading}
        <div class="flex min-h-screen items-center justify-center">
                <p class="text-2xl text-gray-600">Loading groups...</p>
        </div>
{:else if error}
        <div class="flex min-h-screen items-center justify-center">
                <div class="text-center">
                        <p class="text-2xl text-red-600">{error}</p>
                        <a href="/programs" class="mt-4 inline-block text-blue-600 underline">
                                Return to Programs
                        </a>
                </div>
        </div>
{:else if viewData}
        <div class="min-h-screen bg-white p-8">
                <header class="mb-8 text-center">
                        <h1 class="text-4xl font-bold text-gray-900">
                                Student Groups
                        </h1>
                        <p class="mt-2 text-xl text-gray-600">
                                {viewData.groups.length} groups · {viewData.groups.reduce((sum, g) => sum + g.members.length, 0)} students
                        </p>
                </header>

                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {#each viewData.groups as group}
                                <div class="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 shadow-sm">
                                        <h2 class="mb-4 border-b-2 border-gray-300 pb-3 text-2xl font-semibold text-gray-800">
                                                {group.name}
                                        </h2>
                                        <ul class="space-y-3">
                                                {#each group.members as member}
                                                        <li class="text-xl text-gray-700">
                                                                {member.firstName} {member.lastName}
                                                        </li>
                                                {/each}
                                        </ul>
                                        <p class="mt-4 text-sm text-gray-500">
                                                {group.members.length} student{group.members.length !== 1 ? 's' : ''}
                                        </p>
                                </div>
                        {/each}
                </div>

                <footer class="mt-12 text-center text-gray-500 print:hidden">
                        <p class="text-sm">Press Ctrl+P / Cmd+P to print</p>
                </footer>
        </div>
{/if}

<style>
        @media print {
                :global(body) {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                }
        }
</style>
