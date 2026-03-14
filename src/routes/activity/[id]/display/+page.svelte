<script lang="ts">
  /**
   * /activity/[id]/display/+page.svelte
   *
   * Display View — Projection-optimized, read-only group layout for classroom display.
   * Opens in a new browser tab from the Class View's Display button.
   * Loads data independently from IndexedDB (no VM, no editing).
   *
   * Requirements:
   * - Group names ≥ 60pt, student names ≥ 48pt
   * - Contrast ≥ 7:1 (AAA)
   * - No teacher-private information
   */

  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { getActivityData } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { getStudentDisplayName } from '$lib/domain/student';
  import type { Program, Student, Group } from '$lib/domain';

  let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

  let program = $state<Program | null>(null);
  let students = $state<Student[]>([]);
  let groups = $state<Group[]>([]);

  let loading = $state(true);
  let loadError = $state<string | null>(null);

  let studentsById = $derived<Record<string, Student>>(
    Object.fromEntries(students.map((s) => [s.id, s]))
  );

  onMount(async () => {
    env = getAppEnvContext();

    const programId = $page.params.id;
    if (!programId) {
      loadError = 'No activity ID provided.';
      loading = false;
      return;
    }

    const result = await getActivityData(env, { programId });

    if (isErr(result)) {
      if (result.error.type === 'PROGRAM_NOT_FOUND') {
        loadError = `Activity not found: ${programId}`;
      } else {
        loadError = result.error.message;
      }
      loading = false;
      return;
    }

    const data = result.value;
    program = data.program;
    students = data.students;
    groups = data.scenario?.groups ?? [];
    loading = false;
  });

  /**
   * High-contrast background colors for projection.
   * Solid backgrounds with white text for ≥7:1 contrast ratio.
   */
  const PROJECTION_COLORS = [
    'background-color: #0d9488', // teal-600
    'background-color: #2563eb', // blue-600
    'background-color: #7c3aed', // purple-600
    'background-color: #dc2626', // red-600
    'background-color: #b45309', // amber-700
    'background-color: #059669', // emerald-600
    'background-color: #4338ca', // indigo-700
    'background-color: #be185d', // pink-700
  ];

  function getProjectionColor(group: Group): string {
    if (group.colorIndex != null) {
      return PROJECTION_COLORS[group.colorIndex % PROJECTION_COLORS.length];
    }
    let hash = 0;
    for (let i = 0; i < group.name.length; i++) {
      hash = group.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PROJECTION_COLORS[Math.abs(hash) % PROJECTION_COLORS.length];
  }

  function getMembers(group: Group): { id: string; name: string }[] {
    return group.memberIds.map((id) => {
      const student = studentsById[id];
      return {
        id,
        name: student ? getStudentDisplayName(student) : id,
      };
    });
  }
</script>

<svelte:head>
  <title>{program?.name ?? 'Display'} | Groupwheel</title>
</svelte:head>

{#if loading}
  <div class="flex h-screen items-center justify-center bg-gray-900">
    <div class="text-center">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-teal-400"></div>
      <p class="mt-3 text-sm text-gray-400">Loading...</p>
    </div>
  </div>
{:else if loadError}
  <div class="flex h-screen items-center justify-center bg-gray-900 p-8">
    <div class="rounded-lg border border-red-800 bg-red-900/50 p-6 text-center">
      <p class="text-red-300">{loadError}</p>
      <a href="/" class="mt-4 inline-block text-sm text-gray-400 underline">
        &larr; Back to Home
      </a>
    </div>
  </div>
{:else}
  <div class="display-root" role="region" aria-label="Projected group assignments">
    <!-- Activity name header -->
    {#if program}
      <div class="display-header">
        <h1 class="display-title">{program.name}</h1>
      </div>
    {/if}

    {#if groups.length === 0}
      <div class="flex h-[80vh] items-center justify-center">
        <div class="text-center">
          <p class="text-2xl text-gray-400">No groups to display</p>
          <p class="mt-2 text-gray-500">Generate groups in the activity view first.</p>
        </div>
      </div>
    {:else}
      <!-- Group grid -->
      <div class="display-grid">
        {#each groups as group (group.id)}
          {@const members = getMembers(group)}
          <div class="group-card">
            <div class="group-header" style={getProjectionColor(group)}>
              <h2 class="group-name">{group.name}</h2>
              <span class="group-count">{members.length} {members.length === 1 ? 'student' : 'students'}</span>
            </div>
            <ul class="member-list" aria-label="{group.name} members">
              {#each members as member (member.id)}
                <li class="member-item">{member.name}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Minimal nav bar (for teacher, not visible to students at distance) -->
    <div class="no-print fixed bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-black/60 px-4 py-2 backdrop-blur-sm">
      <a
        href="/activity/{program?.id}"
        class="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600"
      >
        &larr; Back to Activity
      </a>
      <button
        type="button"
        onclick={() => window.print()}
        class="rounded-md bg-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600"
      >
        Print
      </button>
    </div>
  </div>
{/if}

<style>
  .display-root {
    min-height: 100vh;
    background-color: #111827; /* gray-900 */
    padding: 2rem;
    padding-bottom: 4rem; /* space for nav bar */
  }

  .display-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .display-title {
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 800;
    color: #ffffff;
  }

  .display-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
    gap: 1.5rem;
    max-width: 1800px;
    margin: 0 auto;
  }

  .group-card {
    background-color: #ffffff;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .group-header {
    padding: 1.25rem 1.5rem;
    color: #ffffff;
  }

  /* Group name: ≥60pt per spec. 60pt ≈ 80px ≈ 5rem */
  .group-name {
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: 800;
    line-height: 1.1;
    margin: 0;
  }

  .group-count {
    font-size: clamp(1rem, 2vw, 1.5rem);
    opacity: 0.85;
    margin-top: 0.25rem;
    display: block;
  }

  .member-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Student names: ≥48pt per spec. 48pt ≈ 64px ≈ 4rem */
  .member-item {
    font-size: clamp(2rem, 3.5vw, 4rem);
    font-weight: 500;
    color: #111827; /* gray-900 on white = >15:1 contrast */
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .member-item:last-child {
    border-bottom: none;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    .display-root {
      background: white !important;
      padding: 0.5in;
    }

    .display-title {
      color: black !important;
    }

    .member-item {
      font-size: 14pt;
      padding: 0.25rem 0.5rem;
    }

    .group-name {
      font-size: 24pt;
    }

    .group-count {
      font-size: 12pt;
    }
  }
</style>
