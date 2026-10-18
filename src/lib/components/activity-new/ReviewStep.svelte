<script lang="ts">
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();
</script>

<div class="space-y-4">
  <h2 class="text-lg font-semibold text-gray-900">Review</h2>
  <dl class="space-y-2 text-sm text-gray-700">
    <div>
      <dt class="font-medium">Roster</dt>
      <dd>{wizard.students.length} students</dd>
    </div>
    <div>
      <dt class="font-medium">Choices</dt>
      <dd>
        {#if wizard.choices}
          {wizard.choices.coveredCount} of {wizard.students.length} students have choices
        {:else}
          None — groups will start empty
        {/if}
      </dd>
    </div>
    <div>
      <dt class="font-medium">Groups</dt>
      <dd>
        {wizard.groupNames.length > 0
          ? wizard.groupNames.join(', ')
          : `${Math.max(1, Math.ceil(wizard.students.length / 4))} numbered groups (Group 1, Group 2, …)`}
      </dd>
    </div>
    <div>
      <dt class="font-medium">Peer requests</dt>
      <dd>
        {wizard.choices?.hasPeerRequestColumns
          ? 'Will be reviewed after creating'
          : 'None detected'}
      </dd>
    </div>
  </dl>
  {#if wizard.warnings.length > 0}
    <ul class="list-disc pl-5 text-sm text-amber-700">
      {#each wizard.warnings as warning (warning)}
        <li>{warning}</li>
      {/each}
    </ul>
  {/if}
</div>
