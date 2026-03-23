<script lang="ts">
  /**
   * PasteRosterCard — Create an activity by typing or pasting student names.
   *
   * A lightweight "start from scratch" option. Teacher types/pastes names,
   * one per line, and an activity is created with those students.
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { InlineError } from '$lib/components/ui';
  import { createActivityInline, addStudentToPool } from '$lib/services/appEnvUseCases';
  import { detectSimpleNameList } from '$lib/utils/pasteDetection';
  import { isErr } from '$lib/types/result';

  let {
    onCreated
  }: {
    onCreated?: (programId: string) => void;
  } = $props();

  const env = getAppEnvContext();

  let activityName = $state('');
  let pasteText = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  let lineCount = $derived(
    pasteText
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length
  );

  function parseName(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return { firstName: '', lastName: '' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    const name = activityName.trim();
    if (!name) {
      error = 'Enter a name for your activity.';
      return;
    }

    isSubmitting = true;
    error = null;

    // Create the activity
    const createResult = await createActivityInline(env, { name });
    if (isErr(createResult)) {
      error = createResult.error.message;
      isSubmitting = false;
      return;
    }

    const { program, pool } = createResult.value;

    // If paste text provided, import students
    const trimmedPaste = pasteText.trim();
    if (trimmedPaste) {
      const detection = detectSimpleNameList(trimmedPaste);
      if (detection.isSimpleNameList) {
        const parsedStudents = detection.names.map((n) => parseName(n));
        for (const { firstName, lastName } of parsedStudents) {
          await addStudentToPool(env, { poolId: pool.id, firstName, lastName });
        }
      }
    }

    onCreated?.(program.id);
    goto(`/activity/${program.id}`);
    isSubmitting = false;
  }
</script>

<div class="space-y-3">
  <div>
    <label for="ps-name" class="block text-xs font-medium text-gray-700">Activity name</label>
    <input
      id="ps-name"
      type="text"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      placeholder="e.g. 3rd Period Science"
      bind:value={activityName}
      onkeydown={(e) => { if (e.key === 'Enter' && !pasteText.trim()) handleSubmit(); }}
      disabled={isSubmitting}
    />
  </div>

  <div>
    <label for="ps-paste" class="block text-xs font-medium text-gray-700">
      Student names <span class="font-normal text-gray-400">(optional)</span>
    </label>
    <textarea
      id="ps-paste"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      rows="3"
      placeholder={'Alex Johnson\nJamie Smith\n...'}
      bind:value={pasteText}
      disabled={isSubmitting}
    ></textarea>
    {#if lineCount > 0}
      <p class="mt-1 text-xs text-gray-500">
        {lineCount} {lineCount === 1 ? 'student' : 'students'} detected
      </p>
    {/if}
  </div>

  <button
    type="button"
    class="w-full rounded-md bg-teal px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
    onclick={handleSubmit}
    disabled={!activityName.trim() || isSubmitting}
  >
    {isSubmitting ? 'Creating...' : 'Create Activity'}
  </button>

  {#if error}
    <InlineError message={error} dismissible onDismiss={() => (error = null)} />
  {/if}
</div>
