<script lang="ts">
  import { readFileAsText } from '$lib/utils/activityFile';
  import FileDropzone from './FileDropzone.svelte';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import type { MappedField } from '$lib/domain/import';
  import type { ActivityNewWizardStore } from '$lib/stores/activityNewWizard.svelte';

  let { wizard }: { wizard: ActivityNewWizardStore } = $props();

  async function onFile(file: File) {
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

  <div>
    <label class="block text-sm font-medium text-gray-700" for="an-choices-paste">
      Paste choices
    </label>
    <textarea
      id="an-choices-paste"
      rows="6"
      class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      placeholder="First Name,Last Name,1st Choice,2nd Choice"
      value={wizard.choicesText}
      oninput={(e) => wizard.setChoices(e.currentTarget.value, null)}
    ></textarea>
  </div>

  <FileDropzone
    id="an-choices-file"
    label="Choices file"
    fileName={wizard.choicesFileName}
    {onFile}
    onClear={() => wizard.clearChoices()}
  />

  {#if wizard.choices}
    <SheetPreview
      data={wizard.choices.rawData}
      mappings={wizard.choices.columnMappings}
      maxPreviewRows={8}
      uniformColumnWidth
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
