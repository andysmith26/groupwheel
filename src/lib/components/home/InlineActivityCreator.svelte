<script lang="ts">
  /**
   * InlineActivityCreator — "+ New Activity" button that expands to a name input.
   *
   * One action, no wizard. On create → navigates to Class View.
   * Roster import happens in Class View, not at creation time.
   *
   * See: project definition.md — WP2 (Inline Activity Creation),
   * Decision 2 (Two-Screen Architecture), Decision 12 (No Tutorial)
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { createActivityInline } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';

  let {
    onCreated
  }: {
    onCreated?: (programId: string) => void;
  } = $props();

  let expanded = $state(false);
  let name = $state('');
  let error = $state<string | null>(null);
  let isCreating = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  const env = getAppEnvContext();

  function expand() {
    expanded = true;
    error = null;
    name = '';
    // Focus the input after DOM update
    requestAnimationFrame(() => {
      inputEl?.focus();
    });
  }

  function collapse() {
    expanded = false;
    name = '';
    error = null;
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      error = 'Enter a name for your activity';
      return;
    }

    isCreating = true;
    error = null;

    const result = await createActivityInline(env, { name: trimmed });

    if (isErr(result)) {
      error = result.error.message;
      isCreating = false;
      return;
    }

    const programId = result.value.program.id;

    isCreating = false;
    expanded = false;

    if (onCreated) {
      onCreated(programId);
    }

    goto(`/activity/${programId}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      collapse();
    }
  }
</script>

{#if expanded}
  <div class="flex items-center gap-2">
    <input
      bind:this={inputEl}
      type="text"
      class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      placeholder="Activity name"
      bind:value={name}
      onkeydown={handleKeydown}
      disabled={isCreating}
    />
    <button
      type="button"
      class="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
      onclick={handleSubmit}
      disabled={isCreating || !name.trim()}
    >
      {isCreating ? 'Creating...' : 'Create'}
    </button>
    <button
      type="button"
      class="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none"
      onclick={collapse}
      disabled={isCreating}
    >
      Cancel
    </button>
  </div>
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
{:else}
  <button
    type="button"
    class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-teal hover:text-teal focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
    onclick={expand}
  >
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
    New Activity
  </button>
{/if}
