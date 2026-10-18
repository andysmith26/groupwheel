<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { ActivityDisplay } from '$lib/application/useCases/listActivities';
  import { DEFAULT_DEMO_CLUB } from '$lib/content/defaultDemoClub';
  import { isErr } from '$lib/types/result';
  import {
    createGroupingActivity,
    listActivities,
    quickGenerateGroups,
    quickStartActivity
  } from '$lib/services/appEnvUseCases';
  import { getGenerationErrorMessage } from '$lib/utils/generationErrorMessages';
  import { getLastActiveClubId, setLastActiveClubId } from '$lib/utils/lastActiveClub';
  import { Alert } from '$lib/components/ui';

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

  function mostRecentActivity(items: ActivityDisplay[]): ActivityDisplay | null {
    return items.reduce<ActivityDisplay | null>(
      (mostRecent, activity) =>
        !mostRecent || activityTimestamp(activity) >= activityTimestamp(mostRecent)
          ? activity
          : mostRecent,
      null
    );
  }

  let activeClub = $derived(
    activities.find((activity) => activity.program.id === lastActiveClubId) ??
      mostRecentActivity(activities)
  );
  let isUsingDemoClub = $derived(!activeClub);
  let clubName = $derived(activeClub?.program.name ?? DEFAULT_DEMO_CLUB.name);
  let memberCount = $derived(activeClub?.studentCount ?? DEFAULT_DEMO_CLUB.members.length);

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
      lastActiveClubId = result.value.some((activity) => activity.program.id === storedLastActiveId)
        ? storedLastActiveId
        : (mostRecentActivity(result.value)?.program.id ?? null);
    }
    loading = false;
  }

  async function createDemoClub(): Promise<string | null> {
    const result = await createGroupingActivity(env, {
      activityName: DEFAULT_DEMO_CLUB.name,
      students: DEFAULT_DEMO_CLUB.members.map((member) => ({
        id: env.idGenerator.generateId(),
        ...member,
        displayName: `${member.firstName} ${member.lastName}`
      })),
      ownerStaffId: 'owner-1'
    });
    if (isErr(result)) {
      error = result.error.message;
      return null;
    }

    const programId = result.value.program.id;
    const generated = await quickGenerateGroups(env, {
      programId,
      groupSize: DEFAULT_DEMO_CLUB.groupSize
    });
    if (isErr(generated)) {
      await loadActivities();
      error = getGenerationErrorMessage(generated.error.type);
      return null;
    }

    await loadActivities();
    return programId;
  }

  async function resolvePrimaryClub(): Promise<string | null> {
    if (!isUsingDemoClub) return activeClub?.program.id ?? null;
    return createDemoClub();
  }

  async function launchCanvas() {
    if (launching) return;
    launching = true;
    error = null;

    const clubId = await resolvePrimaryClub();
    if (clubId) {
      setLastActiveClubId(clubId);
      await goto(`/activity/${clubId}`);
    }
    launching = false;
  }

  async function uploadMonthlyRoster() {
    if (launching) return;
    launching = true;
    error = null;

    const clubId = await resolvePrimaryClub();
    if (clubId) {
      setLastActiveClubId(clubId);
      await goto(`/activity/${clubId}?action=import&replaceRoster=true`);
    }
    launching = false;
  }

  async function openScratchpad() {
    if (launching) return;
    launching = true;
    error = null;

    const result = await quickStartActivity(env, {
      studentCount: DEFAULT_DEMO_CLUB.members.length,
      groupSize: DEFAULT_DEMO_CLUB.groupSize,
      activityName: 'Quick Scratchpad'
    });
    if (isErr(result)) {
      error = result.error.message;
      launching = false;
      return;
    }

    const generated = await quickGenerateGroups(env, {
      programId: result.value.programId,
      groupSize: DEFAULT_DEMO_CLUB.groupSize
    });
    if (isErr(generated)) {
      await loadActivities();
      error = getGenerationErrorMessage(generated.error.type);
      launching = false;
      return;
    }

    setLastActiveClubId(result.value.programId);
    await goto(`/activity/${result.value.programId}?mode=scratchpad`);
    launching = false;
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
          Your club workspace
        </p>
        <h1 id="hub-title" class="mt-2 text-3xl font-bold tracking-tight">Open Workspace</h1>
        <p class="mt-4 text-xl font-semibold">{clubName}</p>
        <p class="mt-1 text-sm text-teal-100">
          {memberCount}
          {memberCount === 1 ? 'member' : 'members'}
          {#if loading}<span class="sr-only">, loading saved clubs</span>{/if}
        </p>
      </div>
      <button
        type="button"
        class="min-h-12 rounded-lg bg-white px-6 py-3 text-base font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-800 disabled:cursor-wait disabled:opacity-70"
        onclick={launchCanvas}
        disabled={launching}
      >
        {launching ? 'Opening...' : 'Launch Canvas'}
      </button>
    </div>
  </section>

  <section aria-label="Workspace actions" class="grid gap-4 sm:grid-cols-2">
    <button
      type="button"
      class="group min-h-36 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:opacity-70"
      onclick={uploadMonthlyRoster}
      disabled={launching}
    >
      <span
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          class="h-5 w-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"
          />
        </svg>
      </span>
      <span class="mt-4 block text-lg font-semibold text-gray-900">Upload New Monthly Roster</span>
      <span class="mt-1 block text-sm text-gray-600">
        Replace the current club roster and keep working on the canvas.
      </span>
    </button>

    <button
      type="button"
      class="group min-h-36 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:opacity-70"
      onclick={openScratchpad}
      disabled={launching}
    >
      <span
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          class="h-5 w-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4H14l6 6v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 4v6h6m-11 4h6m-6 3h6" />
        </svg>
      </span>
      <span class="mt-4 block text-lg font-semibold text-gray-900">Quick Scratchpad</span>
      <span class="mt-1 block text-sm text-gray-600">
        Start an ad-hoc grouping with 16 sample students in groups of four.
      </span>
    </button>
  </section>

  <section
    aria-labelledby="club-history-title"
    class="rounded-xl border border-gray-200 bg-white p-5"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 id="club-history-title" class="text-lg font-semibold text-gray-900">Club History</h2>
        <p class="mt-1 text-sm text-gray-500">Return to a saved club workspace.</p>
      </div>
      {#if activities.length > 1}
        <span class="text-sm text-gray-500">{activities.length} clubs</span>
      {/if}
    </div>

    {#if activities.length > 1}
      <ul class="mt-4 divide-y divide-gray-100">
        {#each activities as activity (activity.program.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 rounded-md py-3 text-left hover:bg-gray-50 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              onclick={() => {
                setLastActiveClubId(activity.program.id);
                void goto(`/activity/${activity.program.id}`);
              }}
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
        <p class="text-sm text-gray-500">
          {activities.length === 0
            ? 'Your saved clubs will appear here.'
            : 'Create another club to build your history.'}
        </p>
      </div>
    {/if}
  </section>
</div>
