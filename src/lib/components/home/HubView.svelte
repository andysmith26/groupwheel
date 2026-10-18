<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { ActivityDisplay } from '$lib/application/useCases/listActivities';
  import { isErr } from '$lib/types/result';
  import { listActivities } from '$lib/services/appEnvUseCases';
  import {
    resolveMostRecentId,
    setLastActiveClubId,
    sortByLastUsed
  } from '$lib/utils/lastActiveClub';
  import { Alert } from '$lib/components/ui';

  const env = getAppEnvContext();
  let activities = $state<ActivityDisplay[]>([]);
  let lastActiveClubId = $state<string | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let activeClub = $derived(
    activities.find((activity) => activity.program.id === lastActiveClubId) ?? null
  );

  onMount(() => {
    void loadActivities();
  });

  async function loadActivities() {
    loading = true;
    error = null;
    const result = await listActivities(env);
    if (isErr(result)) {
      error = result.error.message;
    } else {
      activities = sortByLastUsed(result.value, (activity) => activity.program.id);
      lastActiveClubId = resolveMostRecentId(result.value.map((activity) => activity.program.id));
    }
    loading = false;
  }

  function openActivity(programId: string) {
    setLastActiveClubId(programId);
    void goto(`/activity/${programId}`);
  }
</script>

<svelte:head>
  <title>Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4">
  {#if error}
    <Alert variant="error" dismissible onDismiss={() => (error = null)}>{error}</Alert>
  {/if}

  <div class="grid gap-4 sm:grid-cols-2">
    <section
      aria-labelledby="continue-title"
      class="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white shadow-lg"
    >
      <div>
        <h1 id="continue-title" class="text-sm font-semibold tracking-[0.16em] text-teal-100 uppercase">
          Continue with
        </h1>
        {#if activeClub}
          <p class="mt-3 text-2xl font-bold">{activeClub.program.name}</p>
          <p class="mt-1 text-sm text-teal-100">
            {activeClub.studentCount}
            {activeClub.studentCount === 1 ? 'member' : 'members'}
          </p>
        {:else if loading}
          <p class="mt-3 text-sm text-teal-100">Loading saved activities…</p>
        {:else}
          <p class="mt-3 text-sm text-teal-100">No previous activity yet.</p>
        {/if}
      </div>
      {#if activeClub}
        <button
          type="button"
          class="min-h-12 rounded-lg bg-white px-6 py-3 text-base font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-800"
          onclick={() => openActivity(activeClub.program.id)}
        >
          Open Canvas
        </button>
      {/if}
    </section>

    <section
      aria-labelledby="new-activity-title"
      class="flex flex-col justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 id="new-activity-title" class="text-sm font-semibold tracking-[0.16em] text-gray-500 uppercase">
          New activity
        </h2>
        <p class="mt-3 text-sm text-gray-600">
          Add a roster, optionally add choices, and open the canvas.
        </p>
      </div>
      <button
        type="button"
        class="min-h-12 rounded-lg bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:outline-none"
        onclick={() => goto('/activity/new')}
      >
        New Activity
      </button>
    </section>
  </div>

  <section
    aria-labelledby="club-history-title"
    class="rounded-xl border border-gray-200 bg-white p-5"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 id="club-history-title" class="text-lg font-semibold text-gray-900">
          Recent Activities
        </h2>
        <p class="mt-1 text-sm text-gray-500">Most recently used first.</p>
      </div>
      {#if activities.length > 1}
        <span class="text-sm text-gray-500">{activities.length} activities</span>
      {/if}
    </div>

    {#if activities.length > 0}
      <ul class="mt-4 divide-y divide-gray-100">
        {#each activities as activity (activity.program.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 rounded-md py-3 text-left hover:bg-gray-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              onclick={() => openActivity(activity.program.id)}
            >
              <span class="min-w-0">
                <span class="block truncate font-medium text-gray-900">{activity.program.name}</span
                >
                <span class="mt-0.5 block text-sm text-gray-500">
                  {activity.studentCount}
                  {activity.studentCount === 1 ? 'member' : 'members'}
                </span>
              </span>
              <span class="shrink-0 text-sm font-medium text-teal-700">Open</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-4 rounded-lg bg-gray-50 px-4 py-5 text-center">
        <p class="text-sm text-gray-500">Your saved activities will appear here.</p>
      </div>
    {/if}
  </section>
</div>
