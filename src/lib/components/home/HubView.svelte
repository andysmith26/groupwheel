<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { ActivityDisplay } from '$lib/application/useCases/listActivities';
  import { isErr } from '$lib/types/result';
  import { listActivities } from '$lib/services/appEnvUseCases';
  import { Alert } from '$lib/components/ui';
  import {
    getLastActiveClubId,
    getMostRecentlyUsedClubId,
    setLastActiveClubId
  } from '$lib/utils/lastActiveClub';

  const env = getAppEnvContext();
  let activities = $state<ActivityDisplay[]>([]);
  let lastActiveClubId = $state<string | null>(null);
  let loading = $state(true);
  let launching = $state(false);
  let error = $state<string | null>(null);

  function activityTimestamp(activity: ActivityDisplay): number {
    const { timeSpan } = activity.program;
    if ('start' in timeSpan) return timeSpan.start.getTime();
    const timestamp = Date.parse(timeSpan.termLabel);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function sortActivitiesByRecentUse(items: ActivityDisplay[]): ActivityDisplay[] {
    return [...items].sort((a, b) => {
      const lastUsedDiff = (getLastUsedTimestamp(b.program.id) ?? 0) - (getLastUsedTimestamp(a.program.id) ?? 0);
      if (lastUsedDiff !== 0) return lastUsedDiff;

      const timeDiff = activityTimestamp(b) - activityTimestamp(a);
      if (timeDiff !== 0) return timeDiff;

      return a.program.name.localeCompare(b.program.name, undefined, { sensitivity: 'base' });
    });
  }

  function getLastUsedTimestamp(clubId: string): number {
    return getLastUsedClubTimestamp(clubId);
  }

  let sortedActivities = $derived(sortActivitiesByRecentUse(activities));
  let activeClub = $derived(
    sortedActivities.find((activity) => activity.program.id === lastActiveClubId) ??
      sortedActivities[0] ??
      null
  );
  let clubName = $derived(activeClub?.program.name ?? 'No activities yet');
  let memberCount = $derived(activeClub?.studentCount ?? 0);
  let hasActivities = $derived(sortedActivities.length > 0);

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
      activities = result.value;
      const storedLastActiveId = getLastActiveClubId();
      lastActiveClubId =
        result.value.some((activity) => activity.program.id === storedLastActiveId)
          ? storedLastActiveId
          : getMostRecentlyUsedClubId(result.value.map((activity) => activity.program.id));
    }
    loading = false;
  }

  function openActivity(activityId: string) {
    setLastActiveClubId(activityId);
    void goto(`/activity/${activityId}`);
  }
</script>

<svelte:head>
  <title>Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4">
  {#if error}
    <Alert variant="error" dismissible onDismiss={() => (error = null)}>{error}</Alert>
  {/if}

  <section
    aria-labelledby="hub-title"
    class="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-lg"
  >
    <div class="grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
      <div>
        <p class="text-sm font-semibold tracking-[0.16em] text-teal-100 uppercase">
          Your recent activities
        </p>
        <h1 id="hub-title" class="mt-2 text-3xl font-bold tracking-tight">Open Workspace</h1>
        <p class="mt-4 text-xl font-semibold">
          {#if activeClub}
            {clubName}
          {:else}
            No saved activities yet
          {/if}
        </p>
        <p class="mt-1 text-sm text-teal-100">
          {#if activeClub}
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          {:else}
            Create or import a roster to get started.
          {/if}
          {#if loading}<span class="sr-only">, loading saved clubs</span>{/if}
        </p>
      </div>
      <a
        href="#recent-activities"
        class="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-900 focus:outline-none"
      >
        {#if activeClub}
          Open most recent
        {:else}
          Get started
        {/if}
      </a>
    </div>
  </section>

  <section
    id="recent-activities"
    aria-labelledby="club-history-title"
    class="rounded-xl border border-gray-200 bg-white p-5"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 id="club-history-title" class="text-lg font-semibold text-gray-900">
          Previous activities
        </h2>
        <p class="mt-1 text-sm text-gray-500">Sorted by last used, most recent first.</p>
      </div>
      {#if sortedActivities.length > 1}
        <span class="text-sm text-gray-500">{sortedActivities.length} activities</span>
      {/if}
    </div>

    {#if hasActivities}
      <ul class="mt-4 divide-y divide-gray-100">
        {#each sortedActivities as activity (activity.program.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 rounded-md py-3 text-left hover:bg-gray-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              onclick={() => openActivity(activity.program.id)}
            >
              <span class="min-w-0">
                <span class="block truncate font-medium text-gray-900">{activity.program.name}</span>
                <span class="mt-0.5 block text-sm text-gray-500">
                  {activity.studentCount}
                  {activity.studentCount === 1 ? 'member' : 'members'}
                </span>
              </span>
              <span class="shrink-0 text-sm font-medium text-teal-700">
                {activity.program.id === lastActiveClubId ? 'Most recent' : 'Open'}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-4 rounded-lg bg-gray-50 px-4 py-5 text-center">
        <p class="text-sm text-gray-500">
          Import a roster or paste one in the canvas to create your first activity.
        </p>
      </div>
    {/if}
  </section>
</div>
