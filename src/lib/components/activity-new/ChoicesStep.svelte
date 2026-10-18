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
    hasContent={wizard.choicesText.trim().length > 0}
    {onFile}
    onClear={() => wizard.clearChoices()}
  />

  {#if wizard.choices?.matrix}
    {@const matrix = wizard.choices.matrix}
    {@const stats = matrix.stats}
    <div class="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-3">
      <p class="text-sm text-gray-700">
        Google Form grid detected: each column is a group and cells hold ranks like "1st Choice".
      </p>

      <div>
        <label class="block text-sm font-medium text-gray-700" for="an-choices-id-col">
          What is the student ID column?
        </label>
        <select
          id="an-choices-id-col"
          class="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
          value={matrix.idColumnIndex ?? ''}
          onchange={(e) => {
            const v = e.currentTarget.value;
            wizard.choicesIdColumn = v === '' ? undefined : Number(v);
          }}
        >
          {#if matrix.idColumnIndex === null}
            <option value="">Select a column…</option>
          {/if}
          {#each matrix.idColumnOptions as opt (opt.index)}
            <option value={opt.index}>{opt.header}</option>
          {/each}
        </select>
      </div>

      <p class="text-sm text-gray-700" data-testid="choices-match-stats">
        <span class="font-medium">{stats.matchedRows} of {stats.totalRows} rows</span> matched a
        roster student ·
        {stats.unmatchedRows} unmatched · {stats.blankIdRows} blank ID · {stats.noChoiceRows} with no
        choices · {stats.duplicateRows} duplicate {stats.duplicateRows === 1 ? 'row' : 'rows'} ·
        {stats.studentsWithChoices} of {wizard.students.length} roster students have choices
      </p>

      {#if matrix.samples.length > 0}
        <div class="space-y-2">
          <p class="text-sm font-medium text-gray-700">Check a few rows</p>
          {#each matrix.samples as sample (sample.rowIndex)}
            <div
              class="grid gap-2 rounded border border-gray-200 bg-white p-2 text-xs sm:grid-cols-2"
            >
              <div>
                <p class="font-medium text-gray-600">Import row {sample.rowIndex}</p>
                <dl class="mt-1 space-y-0.5">
                  {#each sample.rawCells as cell, i (i)}
                    <div class="flex gap-1">
                      <dt class="shrink-0 text-gray-500">{cell.header}:</dt>
                      <dd class="break-words text-gray-900">{cell.value}</dd>
                    </div>
                  {/each}
                </dl>
              </div>
              <div>
                <p class="font-medium text-gray-600">Parsed</p>
                <p class="mt-1">
                  ID <span class="font-mono">{sample.idValue}</span> →
                  {#if sample.studentName}
                    <span class="font-medium text-green-700">{sample.studentName}</span>
                  {:else}
                    <span class="font-medium text-red-600">no roster match</span>
                  {/if}
                </p>
                {#if sample.choices.length > 0}
                  <ol class="mt-1 list-inside list-decimal">
                    {#each sample.choices as choice, i (i)}
                      <li>{choice}</li>
                    {/each}
                  </ol>
                {:else}
                  <p class="mt-1 text-gray-500">No choices</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if matrix.duplicates.length > 0}
        <div class="space-y-2" data-testid="choices-duplicates">
          <p class="text-sm font-medium text-gray-700">
            Duplicate submissions ({matrix.duplicates.length}
            {matrix.duplicates.length === 1 ? 'student' : 'students'} with multiple rows)
          </p>
          <p class="text-xs text-gray-600">
            Pick which row to use for each student. Latest is the default.
          </p>
          <ul class="space-y-1 text-xs">
            {#each matrix.duplicates as dupe (dupe.studentId)}
              <li class="rounded border border-gray-200 bg-white p-2">
                <span class="font-medium">{dupe.studentName}</span>
                <div
                  class="mt-1 space-y-0.5"
                  role="radiogroup"
                  aria-label="Row to use for {dupe.studentName}"
                >
                  {#each dupe.rows as r (r.rowIndex)}
                    <label
                      class="flex items-start gap-1 {r.used ? 'text-gray-900' : 'text-gray-500'}"
                    >
                      <input
                        type="radio"
                        name="an-choices-dupe-{dupe.studentId}"
                        checked={r.used}
                        onchange={() =>
                          (wizard.choicesDuplicateSelections = {
                            ...wizard.choicesDuplicateSelections,
                            [dupe.studentId]: r.rowIndex
                          })}
                      />
                      <span>
                        Row {r.rowIndex}: {r.choices.map((c, n) => `${n + 1}. ${c}`).join(', ')}
                      </span>
                    </label>
                  {/each}
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  {#if wizard.choices}
    {#if !wizard.choices.matrix}
      <SheetPreview
        data={wizard.choices.rawData}
        mappings={wizard.choices.columnMappings}
        maxPreviewRows={8}
        uniformColumnWidth
        onMappingChange={onMapping}
      />
    {/if}
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
