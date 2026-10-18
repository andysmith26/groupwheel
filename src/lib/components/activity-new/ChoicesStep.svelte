<script lang="ts">
  import { readFileAsText } from '$lib/utils/activityFile';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import type { MappedField } from '$lib/domain/import';
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();

  async function onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      wizard.setChoices(await readFileAsText(file), file.name);
    } catch {
      wizard.error = 'Could not read that file.';
    }
  }

  function onMapping(columnIndex: number, field: MappedField | null) {
    const current = wizard.choices?.columnMappings;
    if (!current) return;
    wizard.choicesMappingsOverride = current.map((m) =>
      m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
    );
  }
</script>

<div class="space-y-4">
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Choices (optional)</h2>
    <p class="text-sm text-gray-600">
      Upload a file with student names and their group choices. Not every student needs to appear.
      Skip this step to start with empty groups.
    </p>
  </div>

  <input id="an-choices-file" type="file" accept=".csv,.tsv,.txt" onchange={onFile} aria-label="Choices file" />
  {#if wizard.choicesFileName}
    <p class="text-xs text-gray-500">
      {wizard.choicesFileName}
      <button type="button" class="ml-2 underline" onclick={() => wizard.clearChoices()}>
        Remove
      </button>
    </p>
  {/if}

  {#if wizard.choices}
    <SheetPreview
      data={wizard.choices.rawData}
      mappings={wizard.choices.columnMappings}
      maxPreviewRows={5}
      onMappingChange={onMapping}
    />
    {#if wizard.choices.error}
      <p class="text-sm text-red-600" role="alert">{wizard.choices.error}</p>
    {:else}
      <p class="text-sm text-gray-700">
        Choices for {wizard.choices.coveredCount} of {wizard.students.length} students ·
        {wizard.choices.groupNames.length}
        {wizard.choices.groupNames.length === 1 ? 'group' : 'groups'}
        {#if wizard.choices.groupNames.length > 0}
          ({wizard.choices.groupNames.join(', ')})
        {/if}
      </p>
      {#if wizard.choices.hasPeerRequestColumns}
        <p class="text-sm text-gray-700">
          Peer request columns detected — you'll review name matches after creating.
        </p>
      {/if}
    {/if}
  {/if}
</div>
