<script lang="ts">
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();

  let fromChoices = $derived(wizard.groupNames.length > 0);

  let duplicateNames = $derived.by(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const g of wizard.groups) {
      const name = g.name.trim().toLowerCase();
      if (seen.has(name)) dupes.add(name);
      seen.add(name);
    }
    return dupes;
  });

  function parseCapacity(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }
</script>

<div class="space-y-4">
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Groups</h2>
    <p class="text-sm text-gray-600">
      {#if fromChoices}
        These groups came from your choices file. Rename, remove or add groups, and optionally set a
        max size.
      {:else}
        How many groups do you want? Rename them in place and optionally set a max size.
      {/if}
    </p>
  </div>

  {#if !fromChoices}
    <div class="flex items-center gap-3">
      <label class="text-sm font-medium text-gray-700" for="an-group-count">Number of groups</label>
      <input
        id="an-group-count"
        type="number"
        min="1"
        max={Math.max(wizard.students.length, 1)}
        class="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        value={wizard.groups.length}
        onchange={(e) => {
          wizard.setGroupCount(Number(e.currentTarget.value));
          e.currentTarget.value = String(wizard.groups.length);
        }}
      />
      <span class="text-xs text-gray-500">for {wizard.students.length} students</span>
    </div>
  {/if}

  <ul class="space-y-2">
    <li
      class="hidden grid-cols-[1fr_8rem_6rem_2rem] gap-3 text-xs font-medium text-gray-500 sm:grid"
    >
      <span>Group name</span>
      <span>Max size</span>
      {#if fromChoices}<span>1st choices</span>{:else}<span></span>{/if}
      <span></span>
    </li>
    {#each wizard.groups as group, i (group.key)}
      <li class="grid grid-cols-[1fr_8rem_6rem_2rem] items-center gap-3">
        <input
          type="text"
          aria-label={`Name of group ${i + 1}`}
          class="rounded-md border px-3 py-1.5 text-sm {!group.name.trim() ||
          duplicateNames.has(group.name.trim().toLowerCase())
            ? 'border-red-400'
            : 'border-gray-300'}"
          bind:value={group.name}
        />
        <input
          type="number"
          min="1"
          placeholder="No limit"
          aria-label={`Max size of ${group.name || `group ${i + 1}`}`}
          class="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          value={group.capacity ?? ''}
          oninput={(e) => (group.capacity = parseCapacity(e.currentTarget.value))}
        />
        <span class="text-sm text-gray-500 tabular-nums">
          {#if fromChoices}{wizard.firstChoiceCounts[group.name.trim()] ?? 0}{/if}
        </span>
        <button
          type="button"
          class="text-gray-400 hover:text-red-600 disabled:opacity-30"
          aria-label={`Remove ${group.name || `group ${i + 1}`}`}
          disabled={wizard.groups.length <= 1}
          onclick={() => wizard.removeGroup(group.key)}
        >
          ✕
        </button>
      </li>
    {/each}
  </ul>

  <button
    type="button"
    class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    onclick={() => wizard.addGroup()}
  >
    + Add group
  </button>

  {#if !wizard.groupsValid}
    <p class="text-sm text-red-600" role="alert">
      Every group needs a unique name, and max sizes must be whole numbers of 1 or more.
    </p>
  {:else if wizard.totalCapacity !== null && wizard.totalCapacity < wizard.students.length}
    <p class="text-sm text-amber-700">
      Max sizes total {wizard.totalCapacity}, which is fewer than your {wizard.students.length} students.
    </p>
  {/if}
</div>
