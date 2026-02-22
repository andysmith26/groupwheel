<script lang="ts">
  /**
   * GroupsPanel — group columns layout, "Make Groups" button at top.
   *
   * See: project definition.md — WP5
   */

  import type { Group, Student } from '$lib/domain';
  import GenerationControls from './GenerationControls.svelte';
  import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';

  interface Props {
    groups: Group[];
    studentsById: Record<string, Student>;
    studentCount: number;
    onGenerate: (groupSize: number) => void;
    onImport?: () => void;
    disabled?: boolean;
    generationError?: string | null;
  }

  let {
    groups,
    studentsById,
    studentCount,
    onGenerate,
    onImport,
    disabled = false,
    generationError = null
  }: Props = $props();

  let groupSize = $state(4);

  function handleGenerate() {
    onGenerate(groupSize);
  }
</script>

<div class="flex h-full flex-col bg-gray-50">
  <!-- Header with Generation Controls -->
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
    <div>
      <h2 class="text-lg font-medium text-gray-900">Groups</h2>
      <p class="text-sm text-gray-500">
        {groups.length > 0 ? `${groups.length} groups generated` : 'No groups generated yet'}
      </p>
    </div>
    <GenerationControls
      {groupSize}
      onGroupSizeChange={(size) => (groupSize = size)}
      onGenerate={handleGenerate}
      disabled={disabled || studentCount === 0}
    />
  </div>

  <!-- Groups Display -->
  <div class="flex-1 overflow-hidden">
    {#if generationError}
      <div class="p-4">
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Failed to generate groups</h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{generationError}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if groups.length > 0}
      <div class="h-full p-6">
        <GroupEditingLayout {groups} {studentsById} layout="masonry" />
      </div>
    {:else}
      <div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            class="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
        </div>
        {#if studentCount === 0}
          <div>
            <p class="text-lg font-medium text-gray-900">Add students to get started</p>
            <p class="mt-1 text-sm text-gray-500">Import your roster, then generate groups.</p>
          </div>
          {#if onImport}
            <button
              type="button"
              onclick={onImport}
              class="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              Import Roster
            </button>
          {/if}
        {:else}
          <div>
            <p class="text-lg font-medium text-gray-900">Ready to make groups</p>
            <p class="mt-1 text-sm text-gray-500">
              {studentCount}
              {studentCount === 1 ? 'student' : 'students'} in roster. Generate groups to get started.
            </p>
          </div>
          <button
            type="button"
            onclick={handleGenerate}
            {disabled}
            class="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            Make Groups
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
