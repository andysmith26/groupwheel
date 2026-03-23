<script lang="ts">
  /**
   * ImportRosterCard — File-based import for the home empty state.
   *
   * Accepts two file types:
   * 1. JSON — a previously exported Groupwheel activity file
   * 2. CSV/TSV — a roster with student names and group preference columns
   *
   * For CSV/TSV, headers are fuzzy-matched to detect first name, last name,
   * and 1st–4th choice columns. Groups are created from the unique choice
   * values found in the file.
   */

  import { goto } from '$app/navigation';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import { InlineError } from '$lib/components/ui';
  import {
    createGroupingActivity,
    importActivity
  } from '$lib/services/appEnvUseCases';
  import { parseActivityFile, readFileAsText } from '$lib/utils/activityFile';
  import { parseCsvRoster, looksLikeCsv } from '$lib/utils/csvRosterParser';
  import { isErr } from '$lib/types/result';

  let {
    onCreated
  }: {
    onCreated?: (programId: string) => void;
  } = $props();

  const env = getAppEnvContext();

  let fileInput = $state<HTMLInputElement>();
  let isImporting = $state(false);
  let error = $state<string | null>(null);
  let selectedFile = $state<File | null>(null);

  // Preview state after file is parsed
  let preview = $state<{
    type: 'json';
    name: string;
    studentCount: number;
  } | {
    type: 'csv';
    studentCount: number;
    groupNames: string[];
    choiceColumns: number;
    warnings: string[];
    /** Raw parse result for submission */
    parsed: import('$lib/utils/csvRosterParser').CsvRosterParseResult;
  } | null>(null);

  let activityName = $state('');

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    selectedFile = file;
    error = null;
    preview = null;
    activityName = '';
    parseFile(file);
  }

  async function parseFile(file: File) {
    try {
      const text = await readFileAsText(file);

      // Try JSON first
      if (file.name.endsWith('.json') || text.trimStart().startsWith('{')) {
        const validation = parseActivityFile(text);
        if (validation.valid) {
          activityName = validation.data.activity.name;
          preview = {
            type: 'json',
            name: validation.data.activity.name,
            studentCount: validation.data.roster.students.length
          };
          return;
        }
        // If JSON parse failed, fall through to CSV check
        if (!looksLikeCsv(text)) {
          error = validation.error;
          return;
        }
      }

      // Try CSV/TSV
      const parsed = parseCsvRoster(text);
      const choiceColumns = parsed.columnMatches.filter(
        (m) => m.matchedTo.startsWith('choice')
      ).length;

      // Default activity name from filename without extension
      const baseName = file.name.replace(/\.(csv|tsv|txt)$/i, '').replace(/[-_]/g, ' ');
      activityName = baseName;

      preview = {
        type: 'csv',
        studentCount: parsed.students.length,
        groupNames: parsed.groupNames,
        choiceColumns,
        warnings: parsed.warnings,
        parsed
      };
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not read file.';
    }
  }

  async function handleImport() {
    if (!preview || isImporting) return;

    isImporting = true;
    error = null;

    try {
      if (preview.type === 'json') {
        await handleJsonImport();
      } else {
        await handleCsvImport(preview.parsed);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed.';
    } finally {
      isImporting = false;
    }
  }

  async function handleJsonImport() {
    if (!selectedFile) return;

    const text = await readFileAsText(selectedFile);
    const validation = parseActivityFile(text);
    if (!validation.valid) {
      error = validation.error;
      return;
    }

    const result = await importActivity(env, {
      exportData: validation.data,
      ownerStaffId: 'owner-1'
    });

    if (isErr(result)) {
      error = result.error.message;
      return;
    }

    onCreated?.(result.value.program.id);
    goto(`/activity/${result.value.program.id}`);
  }

  async function handleCsvImport(
    parsed: import('$lib/utils/csvRosterParser').CsvRosterParseResult
  ) {
    const name = activityName.trim() || `Imported Class (${parsed.students.length})`;

    // Build students with generated IDs
    const students = parsed.students.map((s, i) => {
      const namePart = `${s.firstName}${s.lastName}`.toLowerCase().replace(/\s+/g, '-');
      return {
        id: `${namePart}-${i + 1}`,
        firstName: s.firstName,
        lastName: s.lastName,
        displayName: `${s.firstName} ${s.lastName}`.trim()
      };
    });

    // Build preferences: likeGroupIds are the raw group name strings
    // (the system uses group names as IDs for preference-based grouping)
    const preferences = parsed.students
      .filter((s) => s.choices.length > 0)
      .map((s, i) => {
        const namePart = `${s.firstName}${s.lastName}`.toLowerCase().replace(/\s+/g, '-');
        return {
          studentId: `${namePart}-${i + 1}`,
          likeGroupIds: s.choices
        };
      });

    // Fix: preferences studentIds need to match the actual student IDs
    // Rebuild with consistent indexing
    const studentIdMap = new Map<number, string>();
    const builtStudents = parsed.students.map((s, i) => {
      const namePart = `${s.firstName}${s.lastName}`.toLowerCase().replace(/\s+/g, '-');
      const id = `${namePart}-${i + 1}`;
      studentIdMap.set(i, id);
      return {
        id,
        firstName: s.firstName,
        lastName: s.lastName,
        displayName: `${s.firstName} ${s.lastName}`.trim()
      };
    });

    const builtPreferences = parsed.students
      .map((s, i) => ({
        studentId: studentIdMap.get(i)!,
        likeGroupIds: s.choices
      }))
      .filter((p) => p.likeGroupIds.length > 0);

    const result = await createGroupingActivity(env, {
      activityName: name,
      students: builtStudents,
      preferences: builtPreferences,
      ownerStaffId: 'owner-1'
    });

    if (isErr(result)) {
      error = result.error.message;
      return;
    }

    onCreated?.(result.value.program.id);
    goto(`/activity/${result.value.program.id}`);
  }

  function clearFile() {
    selectedFile = null;
    preview = null;
    error = null;
    activityName = '';
    if (fileInput) fileInput.value = '';
  }
</script>

<div class="rounded-xl border-2 border-teal/40 bg-teal-light p-5">
  <div class="flex items-center gap-3">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
    </div>
    <h3 class="text-base font-semibold text-gray-900">Import an activity</h3>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept=".csv,.tsv,.txt,.json"
    class="hidden"
    onchange={handleFileSelect}
  />

  {#if !preview}
    <!-- File picker -->
    <button
      type="button"
      class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-teal/30 bg-white/60 px-4 py-6 text-sm font-medium text-gray-600 transition-colors hover:border-teal hover:bg-white hover:text-teal focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
      onclick={() => fileInput?.click()}
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
      Choose file
    </button>
    <p class="mt-2 text-center text-xs text-gray-400">
      Accepts .csv, .tsv, or .json
    </p>
  {:else}
    <!-- Preview -->
    <div class="mt-4 space-y-3">
      <!-- File info -->
      <div class="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2">
        <div class="flex items-center gap-2 text-sm">
          <svg class="h-4 w-4 text-teal" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span class="font-medium text-gray-700">{selectedFile?.name}</span>
        </div>
        <button
          type="button"
          class="text-xs text-gray-400 hover:text-gray-600"
          onclick={clearFile}
          disabled={isImporting}
        >
          Change
        </button>
      </div>

      {#if preview.type === 'json'}
        <div class="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-600">
          <p><span class="font-medium">Activity:</span> {preview.name}</p>
          <p><span class="font-medium">Students:</span> {preview.studentCount}</p>
        </div>
      {:else}
        <div class="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-600">
          <p><span class="font-medium">Students:</span> {preview.studentCount}</p>
          {#if preview.choiceColumns > 0}
            <p><span class="font-medium">Choice columns:</span> {preview.choiceColumns}</p>
            <p><span class="font-medium">Groups found:</span> {preview.groupNames.length}
              {#if preview.groupNames.length > 0}
                <span class="text-gray-400">({preview.groupNames.slice(0, 4).join(', ')}{preview.groupNames.length > 4 ? `, +${preview.groupNames.length - 4} more` : ''})</span>
              {/if}
            </p>
          {:else}
            <p class="text-gray-400">No choice columns detected — roster only.</p>
          {/if}
          {#if preview.warnings.length > 0}
            <p class="mt-1 text-xs text-amber-600">{preview.warnings.length} warning{preview.warnings.length !== 1 ? 's' : ''} (rows skipped or incomplete)</p>
          {/if}
        </div>

        <!-- Activity name for CSV -->
        <div>
          <label for="ir-name" class="block text-xs font-medium text-gray-700">Activity name</label>
          <input
            id="ir-name"
            type="text"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            placeholder="e.g. 3rd Period Science"
            bind:value={activityName}
            disabled={isImporting}
          />
        </div>
      {/if}

      <button
        type="button"
        class="w-full rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
        onclick={handleImport}
        disabled={isImporting}
      >
        {isImporting ? 'Importing...' : preview.type === 'json' ? 'Restore Activity' : 'Create Activity'}
      </button>
    </div>
  {/if}

  {#if error}
    <div class="mt-3">
      <InlineError message={error} dismissible onDismiss={() => (error = null)} />
    </div>
  {/if}
</div>
