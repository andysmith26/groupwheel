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
    confirmPeerRequestMatches,
    createGroupingActivity,
    importActivity,
    importPeerRequestsFromMapping,
    matchPeerRequests,
    resolveOrCreateTags,
    savePeerRequests
  } from '$lib/services/appEnvUseCases';
  import type { SeedingStrategy } from '$lib/services/appEnvUseCases';
  import type { ColumnMapping, MappedField, RawSheetData } from '$lib/domain/import';
  import {
    generateStudentId,
    hasRequiredMappings,
    isPeerRequestField,
    validateMappedData
  } from '$lib/domain/import';
  import type { Student } from '$lib/domain';
  import { getStudentLongName } from '$lib/domain/student';
  import { parseActivityFile, readFileAsText } from '$lib/utils/activityFile';
  import { looksLikeCsv } from '$lib/utils/csvRosterParser';
  import { parseCsvToSheetData } from '$lib/services/googleSheets';
  import { createImportColumnMappings } from '$lib/services/importFieldMatching';
  import { isErr } from '$lib/types/result';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import PeerRequestMatchingReview from '$lib/components/import/PeerRequestMatchingReview.svelte';

  let {
    onCreated,
    compact = false
  }: {
    onCreated?: (programId: string) => void;
    compact?: boolean;
  } = $props();

  const env = getAppEnvContext();

  let fileInput = $state<HTMLInputElement>();
  let isImporting = $state(false);
  let error = $state<string | null>(null);
  let selectedFile = $state<File | null>(null);

  // Preview state after file is parsed
  let preview = $state<
    | {
        type: 'json';
        name: string;
        studentCount: number;
        studentNames: string[];
        groupCount: number;
        groupNames: string[];
        /** Full validated data for submission */
        data: import('$lib/utils/activityFile').ActivityExportData;
      }
    | {
        type: 'csv';
        rawData: RawSheetData;
        columnMappings: ColumnMapping[];
      }
    | null
  >(null);

  let activityName = $state('');
  let seedingStrategy = $state<SeedingStrategy>('top-choice');
  let importWarnings = $state<string[]>([]);
  let isReviewingPeerRequests = $state(false);
  let pendingPeerReview = $state<
    import('$lib/application/useCases/matchPeerRequests').MatchPeerRequestsOutput | null
  >(null);
  let pendingProgramId = $state<string | null>(null);
  let pendingReviewStudents = $state<Student[]>([]);

  // Derived preview summaries for the confirmation screen
  let previewStudentNames = $derived(
    preview?.type === 'json'
      ? preview.studentNames
      : preview?.type === 'csv'
        ? (validateMappedData(preview.rawData, preview.columnMappings)
            .validRows.map((row) => (row.student ? getStudentLongName(row.student) : ''))
            .filter(Boolean) as string[])
        : []
  );
  let previewGroupNames = $derived(
    preview?.type === 'json'
      ? preview.groupNames
      : preview?.type === 'csv'
        ? Array.from(
            new Set(
              validateMappedData(preview.rawData, preview.columnMappings).validRows.flatMap(
                (row) => row.choices ?? []
              )
            )
          ).sort()
        : []
  );
  let previewGroupCount = $derived(
    preview?.type === 'json'
      ? preview.groupCount
      : preview?.type === 'csv'
        ? previewGroupNames.length
        : 0
  );
  let previewStudentCount = $derived(
    preview?.type === 'json'
      ? preview.studentCount
      : preview?.type === 'csv'
        ? validateMappedData(preview.rawData, preview.columnMappings).summary.validCount
        : 0
  );

  let csvValidationPreview = $derived(
    preview?.type === 'csv' ? validateMappedData(preview.rawData, preview.columnMappings) : null
  );

  let csvChoiceColumns = $derived(
    preview?.type === 'csv'
      ? preview.columnMappings.filter((mapping) => mapping.mappedTo?.startsWith('choice')).length
      : 0
  );

  let csvHasPeerRequestMappings = $derived(
    preview?.type === 'csv'
      ? preview.columnMappings.some(
          (mapping) => mapping.mappedTo !== null && isPeerRequestField(mapping.mappedTo)
        )
      : false
  );

  function initializeMappings(data: RawSheetData): ColumnMapping[] {
    return createImportColumnMappings(data);
  }

  function handleCsvMappingChange(columnIndex: number, field: MappedField | null) {
    if (!preview || preview.type !== 'csv') return;

    preview = {
      ...preview,
      columnMappings: preview.columnMappings.map((mapping) =>
        mapping.columnIndex === columnIndex ? { ...mapping, mappedTo: field } : mapping
      )
    };
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    selectedFile = file;
    error = null;
    preview = null;
    activityName = '';
    importWarnings = [];
    pendingPeerReview = null;
    pendingProgramId = null;
    pendingReviewStudents = [];
    isReviewingPeerRequests = false;
    parseFile(file);
  }

  async function parseFile(file: File) {
    try {
      const text = await readFileAsText(file);

      // Try JSON first
      if (file.name.endsWith('.json') || text.trimStart().startsWith('{')) {
        const validation = parseActivityFile(text);
        if (validation.valid) {
          const d = validation.data;
          activityName = d.activity.name;
          const students = d.roster.students;
          const groups = d.scenario?.groups ?? [];
          preview = {
            type: 'json',
            name: d.activity.name,
            studentCount: students.length,
            studentNames: students.map((s) => getStudentLongName(s)),
            groupCount: groups.length,
            groupNames: groups.map((g) => g.name),
            data: d
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
      const rawData = parseCsvToSheetData(text);
      if (rawData.headers.length === 0 || rawData.rows.length === 0) {
        throw new Error('File must have a header row and at least one data row.');
      }

      // Default activity name from filename without extension
      const baseName = file.name.replace(/\.(csv|tsv|txt)$/i, '').replace(/[-_]/g, ' ');
      activityName = baseName;

      preview = {
        type: 'csv',
        rawData,
        columnMappings: initializeMappings(rawData)
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
        await handleCsvImport(preview.rawData, preview.columnMappings);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed.';
    } finally {
      isImporting = false;
    }
  }

  async function handleJsonImport() {
    if (!preview || preview.type !== 'json') return;

    // Apply any name changes the user made
    const exportData = {
      ...preview.data,
      activity: {
        ...preview.data.activity,
        name: activityName.trim() || preview.data.activity.name
      }
    };

    const result = await importActivity(env, {
      exportData,
      ownerStaffId: 'owner-1'
    });

    if (isErr(result)) {
      error = result.error.message;
      return;
    }

    onCreated?.(result.value.program.id);
    goto(`/activity/${result.value.program.id}`);
  }

  async function handleCsvImport(rawData: RawSheetData, columnMappings: ColumnMapping[]) {
    if (!hasRequiredMappings(columnMappings)) {
      throw new Error('Map a First Name or Display Name column before importing.');
    }

    const validation = validateMappedData(rawData, columnMappings);
    if (validation.validRows.length === 0) {
      throw new Error('No valid student rows found in the file.');
    }

    const name = activityName.trim() || `Imported Class (${validation.validRows.length})`;
    const programId = env.idGenerator.generateId();
    const builtStudents = validation.validRows
      .filter((row) => row.student)
      .map((row) => {
        const student = row.student!;
        const id = generateStudentId(student.firstName, student.lastName, row.rowIndex);
        return {
          id,
          firstName: student.firstName,
          preferredName: student.preferredName,
          lastName: student.lastName ?? '',
          rawTags: student.tags,
          tagIds: [] as string[],
          displayName: getStudentLongName(student)
        };
      });

    for (const student of builtStudents) {
      const resolvedTags = await resolveOrCreateTags(env, {
        programId,
        rawTagNames: student.rawTags
      });
      if (isErr(resolvedTags)) {
        throw new Error(`Failed to resolve tags for "${student.displayName}": ${resolvedTags.error.message}`);
      }
      student.tagIds = resolvedTags.value;
    }

    const rowStudentLinks = validation.validRows
      .filter((row) => row.student)
      .map((row) => ({
        rowIndex: row.rowIndex,
        studentId: generateStudentId(row.student!.firstName, row.student!.lastName, row.rowIndex)
      }));

    const builtPreferences = validation.validRows
      .filter((row) => row.student && row.choices && row.choices.length > 0)
      .map((row) => ({
        studentId: generateStudentId(row.student!.firstName, row.student!.lastName, row.rowIndex),
        likeGroupIds: row.choices ?? []
      }));

    const groupNames = Array.from(
      new Set(validation.validRows.flatMap((row) => row.choices ?? []))
    ).sort();

    importWarnings = validation.invalidRows.map(
      (row) => `Row ${row.rowIndex}: ${row.errors.join(', ')}`
    );

    const result = await createGroupingActivity(env, {
      activityName: name,
      programId,
      students: builtStudents,
      preferences: builtPreferences,
      groupNames: groupNames.length > 0 ? groupNames : undefined,
      seedingStrategy: groupNames.length > 0 ? seedingStrategy : undefined,
      ownerStaffId: 'owner-1'
    });

    if (isErr(result)) {
      error = result.error.message;
      return;
    }

    importWarnings = [...importWarnings, ...result.value.warnings];

    const builtStudentEntities: Student[] = builtStudents.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      preferredName: student.preferredName,
      lastName: student.lastName || undefined,
      tagIds: student.tagIds
    }));

    if (
      !columnMappings.some((mapping) => mapping.mappedTo && isPeerRequestField(mapping.mappedTo))
    ) {
      onCreated?.(result.value.program.id);
      goto(`/activity/${result.value.program.id}`);
      return;
    }

    const extractionResult = await importPeerRequestsFromMapping(env, {
      programId: result.value.program.id,
      rawData,
      columnMappings,
      rowStudentLinks
    });

    if (isErr(extractionResult)) {
      error = extractionResult.error.message;
      return;
    }

    importWarnings = [...importWarnings, ...extractionResult.value.warnings];

    if (extractionResult.value.entries.length === 0) {
      onCreated?.(result.value.program.id);
      goto(`/activity/${result.value.program.id}`);
      return;
    }

    const matchResult = await matchPeerRequests(env, {
      requests: extractionResult.value.entries,
      students: builtStudentEntities
    });

    if (isErr(matchResult)) {
      error = 'Unable to match peer requests.';
      return;
    }

    pendingPeerReview = matchResult.value;
    pendingProgramId = result.value.program.id;
    pendingReviewStudents = builtStudentEntities;
    isReviewingPeerRequests = true;

    return;
  }

  async function handlePeerRequestConfirm(
    decisions: import('$lib/application/useCases/confirmPeerRequestMatches').PeerRequestReviewDecision[]
  ) {
    if (!pendingPeerReview || !pendingProgramId) return;

    isImporting = true;
    error = null;

    const confirmationResult = await confirmPeerRequestMatches(env, {
      requests: pendingPeerReview.updatedRequests,
      decisions
    });

    if (isErr(confirmationResult)) {
      error = confirmationResult.error.type;
      isImporting = false;
      return;
    }

    const saveResult = await savePeerRequests(env, {
      programId: pendingProgramId,
      entries: confirmationResult.value.updatedRequests
    });

    if (isErr(saveResult)) {
      error = saveResult.error.message;
      isImporting = false;
      return;
    }

    const programId = pendingProgramId;
    pendingPeerReview = null;
    pendingProgramId = null;
    pendingReviewStudents = [];
    isReviewingPeerRequests = false;
    onCreated?.(programId);
    goto(`/activity/${programId}`);
  }

  function clearFile() {
    selectedFile = null;
    preview = null;
    error = null;
    activityName = '';
    seedingStrategy = 'top-choice';
    importWarnings = [];
    pendingPeerReview = null;
    pendingProgramId = null;
    pendingReviewStudents = [];
    isReviewingPeerRequests = false;
    if (fileInput) fileInput.value = '';
  }
</script>

<div class={compact ? '' : 'rounded-xl border-2 border-teal/40 bg-teal-light p-5'}>
  {#if !compact}
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-900">Import an activity</h3>
    </div>
  {/if}

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
      class="{compact
        ? ''
        : 'mt-4'} flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-teal/30 bg-white/60 px-4 py-6 text-sm font-medium text-gray-600 transition-colors hover:border-teal hover:bg-white hover:text-teal focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none"
      onclick={() => fileInput?.click()}
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      Choose file
    </button>
    <p class="{compact ? 'mt-1' : 'mt-2'} text-center text-xs text-gray-400">
      Accepts .csv, .tsv, or .json
    </p>
  {:else if isReviewingPeerRequests && pendingPeerReview}
    <div class={compact ? '' : 'mt-5'}>
      <div class="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
        <div class="flex min-w-0 items-center gap-2 text-xs text-gray-500">
          <svg
            class="h-3.5 w-3.5 shrink-0 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span class="truncate">{selectedFile?.name}</span>
        </div>
      </div>

      <div class="mt-4">
        <PeerRequestMatchingReview
          readyToConfirm={pendingPeerReview.readyToConfirm}
          needsReview={pendingPeerReview.needsReview}
          noMatch={pendingPeerReview.noMatch}
          invalid={pendingPeerReview.invalid}
          students={pendingReviewStudents}
          warnings={importWarnings}
          busy={isImporting}
          {compact}
          confirmLabel="Save requests & open activity"
          onConfirm={handlePeerRequestConfirm}
        />
      </div>
    </div>
  {:else}
    <!-- Preview / Confirmation -->
    <div class={compact ? '' : 'mt-5'}>
      <!-- 1. File status — small, muted, out of the way -->
      <div class="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
        <div class="flex min-w-0 items-center gap-2 text-xs text-gray-500">
          <svg
            class="h-3.5 w-3.5 shrink-0 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span class="truncate">{selectedFile?.name}</span>
        </div>
        <button
          type="button"
          class="shrink-0 text-xs text-gray-400 hover:text-gray-600"
          onclick={clearFile}
          disabled={isImporting}
        >
          Change
        </button>
      </div>

      <!-- 2. Activity name — the primary input -->
      <div class="mt-5">
        <label
          for={compact ? 'ir-name-modal' : 'ir-name'}
          class="block text-xs font-medium text-gray-700">Activity name</label
        >
        <input
          id={compact ? 'ir-name-modal' : 'ir-name'}
          type="text"
          class="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
          placeholder="e.g. 3rd Period Science"
          bind:value={activityName}
          disabled={isImporting}
        />
      </div>

      <!-- 3. Data summary — what's inside the file -->
      <div class="mt-5 space-y-1.5">
        <div class="rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
          <span class="text-sm font-medium text-gray-700">
            {previewStudentCount}
            {previewStudentCount === 1 ? 'student' : 'students'}
          </span>
          {#if previewStudentNames.length > 0}
            <p class="mt-0.5 text-xs leading-relaxed text-gray-400">
              {previewStudentNames.slice(0, 3).join(', ')}{previewStudentNames.length > 3
                ? ` +${previewStudentNames.length - 3} more`
                : ''}
            </p>
          {/if}
        </div>

        {#if previewGroupCount > 0}
          <div class="rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
            <span class="text-sm font-medium text-gray-700">
              {previewGroupCount}
              {previewGroupCount === 1 ? 'group' : 'groups'}
            </span>
            {#if previewGroupNames.length > 0}
              <p class="mt-0.5 text-xs leading-relaxed text-gray-400">
                {previewGroupNames.slice(0, 3).join(', ')}{previewGroupNames.length > 3
                  ? ` +${previewGroupNames.length - 3} more`
                  : ''}
              </p>
            {/if}
          </div>
        {/if}

        {#if preview.type === 'csv' && csvChoiceColumns === 0}
          <p class="px-1 pt-0.5 text-xs text-gray-400">
            Roster only — no group preferences detected.
          </p>
        {/if}

        {#if preview.type === 'csv' && csvValidationPreview && csvValidationPreview.summary.invalidCount > 0}
          <p class="px-1 pt-0.5 text-xs text-amber-600">
            {csvValidationPreview.summary.invalidCount} warning{csvValidationPreview.summary
              .invalidCount !== 1
              ? 's'
              : ''} (rows skipped or incomplete)
          </p>
        {/if}
      </div>

      <!-- 4. Seeding strategy (CSV with groups only) -->
      {#if preview.type === 'csv'}
        <div class="mt-5 space-y-3">
          <div class="rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
            <p class="text-xs font-medium text-gray-700">Column mapping</p>
            <p class="mt-0.5 text-xs text-gray-500">
              Review the detected columns before importing. Peer request columns are optional.
            </p>
            <div class="mt-3">
              <SheetPreview
                data={preview.rawData}
                mappings={preview.columnMappings}
                maxPreviewRows={6}
                onMappingChange={handleCsvMappingChange}
              />
            </div>
          </div>

          {#if csvValidationPreview}
            <div
              class="rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 text-xs text-gray-600"
            >
              <p>
                {csvValidationPreview.summary.validCount} valid row{csvValidationPreview.summary
                  .validCount === 1
                  ? ''
                  : 's'}
                {#if csvHasPeerRequestMappings}
                  • peer requests will be reviewed before opening the activity
                {/if}
              </p>
            </div>
          {/if}
        </div>
      {/if}

      {#if preview.type === 'csv' && csvChoiceColumns > 0 && previewGroupNames.length > 0}
        <fieldset class="mt-5 space-y-1.5" disabled={isImporting}>
          <legend class="block text-xs font-medium text-gray-700">Initial group assignments</legend>
          <label
            class="mt-1.5 flex cursor-pointer items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 transition-colors hover:bg-gray-50"
          >
            <input
              type="radio"
              name={compact ? 'seeding-modal' : 'seeding'}
              value="top-choice"
              bind:group={seedingStrategy}
              class="mt-0.5 accent-teal"
            />
            <div>
              <span class="text-sm font-medium text-gray-700">Top choice</span>
              <p class="text-xs text-gray-500">Place each student in their 1st choice group</p>
            </div>
          </label>
          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 transition-colors hover:bg-gray-50"
          >
            <input
              type="radio"
              name={compact ? 'seeding-modal' : 'seeding'}
              value="none"
              bind:group={seedingStrategy}
              class="mt-0.5 accent-teal"
            />
            <div>
              <span class="text-sm font-medium text-gray-700">Empty groups</span>
              <p class="text-xs text-gray-500">Create groups with no students assigned yet</p>
            </div>
          </label>
        </fieldset>
      {/if}

      <!-- 5. Action — visually separated from content above -->
      <div class="mt-6">
        <button
          type="button"
          class="w-full rounded-md bg-teal px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-dark focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          onclick={handleImport}
          disabled={isImporting ||
            (preview.type === 'csv' && !hasRequiredMappings(preview.columnMappings))}
        >
          {isImporting ? 'Importing...' : 'Import Activity'}
        </button>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="mt-3">
      <InlineError message={error} dismissible onDismiss={() => (error = null)} />
    </div>
  {/if}
</div>
