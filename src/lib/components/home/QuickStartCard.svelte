<script lang="ts">
  /**
   * QuickStartCard — Zero-data grouping for new users.
   *
   * Enter student count + group size → instant groups with placeholder names.
   * Eliminates the cold-start barrier entirely. A new teacher sees GroupWheel's
   * value in under 15 seconds, before committing any real data.
   *
   * See: project definition.md — Decision 5 (Zero-Data Quick Start),
   * Decision 12 (No Tutorial), WP3
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { InlineError } from '$lib/components/ui';
  import { quickStartActivity, quickGenerateGroups } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';

  let {
    onCreated,
    compact = false
  }: {
    onCreated?: (programId: string) => void;
    compact?: boolean;
  } = $props();

  const env = getAppEnvContext();

  let studentCount = $state(24);
  let groupSize = $state(4);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  let groupCount = $derived(
    studentCount > 0 && groupSize > 0 ? Math.ceil(studentCount / groupSize) : 0
  );

  let isValid = $derived(
    studentCount >= 2 &&
      studentCount <= 200 &&
      groupSize >= 2 &&
      groupSize <= 20 &&
      groupSize <= studentCount
  );

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;

    isSubmitting = true;
    error = null;

    // Step 1: Create activity with placeholder students
    const createResult = await quickStartActivity(env, {
      studentCount,
      groupSize
    });

    if (isErr(createResult)) {
      error = createResult.error.message;
      isSubmitting = false;
      return;
    }

    const { programId } = createResult.value;

    // Step 2: Generate groups immediately
    const generateResult = await quickGenerateGroups(env, {
      programId,
      groupSize
    });

    if (isErr(generateResult)) {
      // Graceful degradation (P14): activity created, generation failed.
      // Navigate to Class View anyway — groups can be generated from there.
      onCreated?.(programId);
      goto(`/activity/${programId}`);
      isSubmitting = false;
      return;
    }

    // Step 3: Navigate to Class View with groups already generated
    onCreated?.(programId);
    goto(`/activity/${programId}`);
    isSubmitting = false;
  }

  function clampStudentCount() {
    if (studentCount < 2) studentCount = 2;
    if (studentCount > 200) studentCount = 200;
    if (groupSize > studentCount) groupSize = studentCount;
  }

  function clampGroupSize() {
    if (groupSize < 2) groupSize = 2;
    if (groupSize > 20) groupSize = 20;
    if (groupSize > studentCount) groupSize = studentCount;
  }
</script>

<div class={compact ? '' : 'rounded-xl border border-teal/30 bg-teal-light p-5'}>
  {#if !compact}
    <h3 class="text-base font-semibold text-gray-900">Try it now</h3>
  {/if}

  <div class={compact ? 'flex items-end gap-3' : 'mt-4 flex items-end gap-3'}>
    <div class="flex-1">
      <label for="qs-students" class="block text-xs font-medium text-gray-700"> Students </label>
      <input
        id="qs-students"
        type="number"
        min="2"
        max="200"
        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
        bind:value={studentCount}
        onblur={clampStudentCount}
        disabled={isSubmitting}
      />
    </div>
    <div class="flex-1">
      <label for="qs-group-size" class="block text-xs font-medium text-gray-700"> Per group </label>
      <input
        id="qs-group-size"
        type="number"
        min="2"
        max="20"
        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
        bind:value={groupSize}
        onblur={clampGroupSize}
        disabled={isSubmitting}
      />
    </div>
    <button
      type="button"
      class="rounded-md bg-teal px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
      onclick={handleSubmit}
      disabled={!isValid || isSubmitting}
    >
      {isSubmitting ? 'Creating...' : 'Go'}
    </button>
  </div>

  {#if isValid && groupCount > 0}
    <p class="mt-2 text-xs text-gray-500">
      {groupCount} group{groupCount !== 1 ? 's' : ''} of ~{groupSize}
    </p>
  {/if}

  {#if error}
    <div class="mt-2">
      <InlineError message={error} dismissible onDismiss={() => (error = null)} />
    </div>
  {/if}
</div>
