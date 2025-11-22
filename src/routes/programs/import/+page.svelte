<script lang="ts">
        import { goto } from '$app/navigation';
        import { onMount } from 'svelte';
        import type { PoolType } from '$lib/domain';
        import { getAppEnvContext } from '$lib/contexts/appEnv';
        import { importRoster } from '$lib/services/appEnvUseCases';
        import { isErr } from '$lib/types/result';

        let env: ReturnType<typeof getAppEnvContext> | null = null;

        onMount(() => {
                env = getAppEnvContext();
        });

        let pastedText = '';
        let poolName = '';
        let poolType: PoolType = 'CLASS';
        let ownerStaffId = 'owner-1';
        let schoolId = '';

        let errorMessage = '';
        let successMessage = '';
        let isSubmitting = false;

        async function handleImport() {
                errorMessage = '';
                successMessage = '';

                if (!env) {
                        errorMessage = 'Application environment not ready yet. Please try again in a moment.';
                        return;
                }

                if (!pastedText.trim()) {
                        errorMessage = 'Please paste roster text before importing.';
                        return;
                }

                const effectivePoolName = poolName.trim() || 'Imported Pool';

                isSubmitting = true;
                const result = await importRoster(env, {
                        pastedText,
                        poolName: effectivePoolName,
                        poolType,
                        ownerStaffId,
                        schoolId: schoolId.trim() || undefined
                });
                isSubmitting = false;

                if (isErr(result)) {
                        switch (result.error.type) {
                                case 'PARSE_ERROR':
                                        errorMessage = result.error.message;
                                        break;
                                case 'OWNER_STAFF_NOT_FOUND':
                                        errorMessage = `Owner staff not found: ${result.error.staffId}`;
                                        break;
                                case 'NO_STUDENTS_IN_ROSTER':
                                case 'DOMAIN_VALIDATION_FAILED':
                                case 'INTERNAL_ERROR':
                                        errorMessage = result.error.message;
                                        break;
                                default:
                                        errorMessage = 'Unknown error importing roster.';
                        }
                        return;
                }

                successMessage = `Imported ${result.value.name} with ${result.value.memberIds.length} students. Redirecting to Programs...`;
                await goto('/programs');
        }
</script>

<div class="mx-auto max-w-4xl space-y-6 p-4">
        <header class="space-y-2">
                <p class="text-sm text-gray-600">Roster import</p>
                <h1 class="text-2xl font-semibold">Paste a roster to build a Pool</h1>
                <p class="text-sm text-gray-600">
                        Paste CSV/TSV roster data. We will parse it, create Students, and save them into a Pool you can use
                        when creating Programs.
                </p>
        </header>

        <form class="space-y-4" on:submit|preventDefault={handleImport}>
                <div class="space-y-2">
                        <label class="block text-sm font-medium">Roster paste</label>
                        <textarea
                                class="h-48 w-full rounded-md border p-2 font-mono text-sm"
                                bind:value={pastedText}
                                placeholder="Headers required: display name | name, id, friend 1 id, friend 2 id, ..."
                        />
                        <p class="text-xs text-gray-500">
                                Required columns: <code>display name</code> (or <code>name</code>) and <code>id</code>. Any
                                number of <code>friend N id</code> columns are supported.
                        </p>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-1">
                                <label class="block text-sm font-medium">Pool name</label>
                                <input
                                        class="w-full rounded-md border p-2 text-sm"
                                        bind:value={poolName}
                                        placeholder="Imported Pool"
                                />
                                <p class="text-xs text-gray-500">Defaults to “Imported Pool” if left blank.</p>
                        </div>

                        <div class="space-y-1">
                                <label class="block text-sm font-medium">Pool type</label>
                                <select class="w-full rounded-md border p-2 text-sm" bind:value={poolType}>
                                        <option value="CLASS">Class</option>
                                        <option value="GRADE">Grade</option>
                                        <option value="CAMP">Camp</option>
                                        <option value="ACTIVITY">Activity</option>
                                </select>
                        </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-1">
                                <label class="block text-sm font-medium">Owner staff id</label>
                                <input
                                        class="w-full rounded-md border p-2 text-sm"
                                        bind:value={ownerStaffId}
                                        placeholder="owner-1"
                                />
                        </div>

                        <div class="space-y-1">
                                <label class="block text-sm font-medium">School id (optional)</label>
                                <input class="w-full rounded-md border p-2 text-sm" bind:value={schoolId} placeholder="SCH-001" />
                        </div>
                </div>

                <div class="flex items-center gap-3">
                        <button
                                class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                type="submit"
                                disabled={isSubmitting}
                        >
                                {isSubmitting ? 'Importing…' : 'Import roster'}
                        </button>
                        <a class="text-sm text-blue-600 underline" href="/programs">Back to Programs</a>
                </div>
        </form>

        {#if errorMessage}
                <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        {/if}

        {#if successMessage}
                <p class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        {successMessage}
                </p>
        {/if}
</div>
