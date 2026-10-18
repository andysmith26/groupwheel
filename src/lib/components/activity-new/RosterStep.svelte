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
      wizard.setRoster(await readFileAsText(file), file.name);
    } catch {
      wizard.error = 'Could not read that file.';
    }
  }

  function onMapping(columnIndex: number, field: MappedField | null) {
    const current = wizard.roster?.columnMappings;
    if (!current) return;
    wizard.rosterMappingsOverride = current.map((m) =>
      m.columnIndex === columnIndex ? { ...m, mappedTo: field } : m
    );
  }
</script>

<div class="space-y-4">
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Roster</h2>
    <p class="text-sm text-gray-600">
      The full list of students. Paste names (one per line) or upload a CSV/TSV file.
    </p>
  </div>

  <label class="block text-sm font-medium text-gray-700" for="an-roster-paste">Paste roster</label>
  <textarea
    id="an-roster-paste"
    rows="8"
    class="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    placeholder="Alice Smith&#10;Bob Jones"
    value={wizard.rosterText}
    oninput={(e) => wizard.setRoster(e.currentTarget.value, null)}
  ></textarea>

  <div>
    <label class="block text-sm font-medium text-gray-700" for="an-roster-file"
      >Or upload a file</label
    >
    <input id="an-roster-file" type="file" accept=".csv,.tsv,.txt" onchange={onFile} />
    {#if wizard.rosterFileName}
      <p class="mt-1 text-xs text-gray-500">{wizard.rosterFileName}</p>
    {/if}
  </div>

  {#if wizard.roster?.rawData && wizard.roster.columnMappings}
    <SheetPreview
      data={wizard.roster.rawData}
      mappings={wizard.roster.columnMappings}
      maxPreviewRows={5}
      onMappingChange={onMapping}
    />
  {/if}

  {#if wizard.roster?.error}
    <p class="text-sm text-red-600" role="alert">{wizard.roster.error}</p>
  {:else if wizard.students.length > 0}
    <p class="text-sm text-gray-700">
      {wizard.students.length}
      {wizard.students.length === 1 ? 'student' : 'students'} found:
      {wizard.students
        .slice(0, 3)
        .map((s) => s.displayName)
        .join(', ')}{wizard.students.length > 3 ? ` +${wizard.students.length - 3} more` : ''}
    </p>
  {/if}
</div>
