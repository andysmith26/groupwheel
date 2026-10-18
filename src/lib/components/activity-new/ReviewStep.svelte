<script lang="ts">
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();

  let withChoices = $derived(wizard.finalPreferences.length);
  let withoutChoices = $derived(wizard.students.length - withChoices);
</script>

<div class="space-y-5">
  <h2 class="text-lg font-semibold text-gray-900">Review</h2>

  <div class="grid gap-6 md:grid-cols-2">
    <section class="space-y-1">
      <h3 class="text-sm font-semibold text-gray-900">Roster</h3>
      <p class="text-sm text-gray-700">
        {wizard.students.length}
        {wizard.students.length === 1 ? 'student' : 'students'}
        {#if wizard.rosterFileName}from {wizard.rosterFileName}{:else}pasted{/if}
      </p>
      <p class="text-xs text-gray-500">
        {wizard.students
          .slice(0, 8)
          .map((s) => s.displayName)
          .join(', ')}{wizard.students.length > 8 ? ` +${wizard.students.length - 8} more` : ''}
      </p>
    </section>

    <section class="space-y-1">
      <h3 class="text-sm font-semibold text-gray-900">Choices</h3>
      {#if wizard.choices}
        <p class="text-sm text-gray-700">
          {withChoices} of {wizard.students.length} students have choices
          {#if wizard.choicesFileName}(from {wizard.choicesFileName}){/if}
        </p>
        <p class="text-xs text-gray-500">
          {withoutChoices} without choices will start unassigned.
          {#if wizard.choices.unmatchedNames.length > 0}
            {wizard.choices.unmatchedNames.length} name{wizard.choices.unmatchedNames.length === 1
              ? ''
              : 's'} in the choices file were not on the roster.
          {/if}
        </p>
      {:else}
        <p class="text-sm text-gray-700">None — students start unassigned.</p>
      {/if}
    </section>

    <section class="space-y-1 md:col-span-2">
      <h3 class="text-sm font-semibold text-gray-900">
        Groups ({wizard.finalGroups.length})
      </h3>
      <ul class="grid gap-x-6 gap-y-1 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
        {#each wizard.finalGroups as group (group.key)}
          <li class="flex justify-between gap-3 border-b border-gray-100 py-1">
            <span class="truncate">{group.name}</span>
            <span class="shrink-0 text-xs text-gray-500">
              {group.capacity === null ? 'no limit' : `max ${group.capacity}`}
              {#if wizard.choices}
                · {wizard.firstChoiceCounts[group.name] ?? 0} first choices
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="space-y-1">
      <h3 class="text-sm font-semibold text-gray-900">Peer requests</h3>
      <p class="text-sm text-gray-700">
        {wizard.choices?.hasPeerRequestColumns
          ? 'Peer request columns found — you will review name matches after creating.'
          : 'None detected.'}
      </p>
    </section>
  </div>

  {#if wizard.warnings.length > 0}
    <section>
      <h3 class="text-sm font-semibold text-amber-800">Warnings ({wizard.warnings.length})</h3>
      <ul class="mt-1 list-disc pl-5 text-sm text-amber-700">
        {#each wizard.warnings as warning (warning)}
          <li>{warning}</li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
