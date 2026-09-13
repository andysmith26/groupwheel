<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { getAppEnvContext } from '$lib/contexts/appEnv';
  import type { MatchPeerRequestsOutput } from '$lib/application/useCases/matchPeerRequests';
  import { getSourceStudentId, type Student } from '$lib/domain';
  import type {
    ColumnMapping,
    MappedField,
    RawSheetData,
    StudentIdRowLink,
    UnmatchedStudentIdRow
  } from '$lib/domain/import';
  import { reconcileRowsByStudentId } from '$lib/domain/import';
  import { createPeerRequestColumnMappings } from '$lib/services/importFieldMatching';
  import SheetPreview from '$lib/components/import/SheetPreview.svelte';
  import PeerRequestMatchingReview from '$lib/components/import/PeerRequestMatchingReview.svelte';
  import { Button, InlineError } from '$lib/components/ui';
  import {
    prepareUnmatchedPeerRequestRows,
    type PreparedUnmatchedPeerRequestRow,
    validatePeerRequestImportMappings
  } from '$lib/application/useCases/preparePeerRequestImportForExistingActivity';
  import {
    suggestStudentMatchesForRows,
    type RowMatchSuggestion
  } from '$lib/application/useCases/suggestStudentMatchesForRows';
  import { parseCsvToSheetData } from '$lib/services/googleSheets';
  import {
    confirmPeerRequestMatches,
    importPeerRequestsFromMapping,
    matchPeerRequests,
    savePeerRequests
  } from '$lib/services/appEnvUseCases';
  import { isErr } from '$lib/types/result';
  import { readFileAsText } from '$lib/utils/activityFile';

  interface ImportPeerRequestsComplete {
    savedCount: number;
    unresolvedCount: number;
    manualRemapCount: number;
    skippedUnmatchedRowCount: number;
    warnings: string[];
  }

  interface Props {
    activityName: string;
    programId: string;
    students: Student[];
    onClose: () => void;
    onComplete: (summary: ImportPeerRequestsComplete) => void | Promise<void>;
  }

  type Step = 'mapping' | 'unmatched' | 'review';
  type ReviewedUnmatchedRow = PreparedUnmatchedPeerRequestRow;
  type UnmatchedSuggestionBucket = RowMatchSuggestion['bucket'];

  const peerRequestFields: MappedField[] = [
    'studentId',
    'displayName',
    'firstName',
    'lastName',
    'peerRequest1',
    'peerRequest2',
    'peerRequest3',
    'peerRequest4',
    'peerRequest5'
  ];

  let { activityName, programId, students, onClose, onComplete }: Props = $props();

  const env = getAppEnvContext();

  let currentStep = $state<Step>('mapping');
  let sourceMode = $state<'paste' | 'file'>('paste');
  let pasteText = $state('');
  let fileInput = $state<HTMLInputElement>();
  let selectedFileName = $state('');
  let rawData = $state<RawSheetData | null>(null);
  let columnMappings = $state<ColumnMapping[]>([]);
  let importError = $state('');
  let warnings = $state<string[]>([]);
  let isBusy = $state(false);
  let matchedRowLinks = $state<StudentIdRowLink[]>([]);
  let unmatchedRows = $state<ReviewedUnmatchedRow[]>([]);
  let unmatchedSuggestions = $state<Record<number, RowMatchSuggestion>>({});
  let unmatchedSelections = $state<Record<number, string>>({});
  let pendingPeerReview = $state<MatchPeerRequestsOutput | null>(null);
  let manualRemapCount = $state(0);
  let skippedUnmatchedRowCount = $state(0);

  let matchedRowCount = $derived(matchedRowLinks.length);
  let pasteRowCount = $derived(rawData && sourceMode === 'paste' ? rawData.rows.length : 0);
  let highConfidenceUnmatchedRows = $derived(
    unmatchedRows.filter((row) => unmatchedSuggestions[row.rowIndex]?.bucket === 'HIGH_CONFIDENCE')
  );
  let needsReviewUnmatchedRows = $derived(
    unmatchedRows.filter((row) => unmatchedSuggestions[row.rowIndex]?.bucket === 'NEEDS_REVIEW')
  );
  let noMatchUnmatchedRows = $derived(
    unmatchedRows.filter((row) => unmatchedSuggestions[row.rowIndex]?.bucket === 'NO_MATCH')
  );
  let studentOptions = $derived(
    [...students].sort((left, right) => {
      const leftName = `${left.preferredName?.trim() || left.firstName} ${left.lastName ?? ''}`
        .trim()
        .toLowerCase();
      const rightName = `${right.preferredName?.trim() || right.firstName} ${right.lastName ?? ''}`
        .trim()
        .toLowerCase();
      return leftName.localeCompare(rightName);
    })
  );

  function formatStudentName(student: Student): string {
    return (
      [student.preferredName?.trim() || student.firstName, student.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || student.id
    );
  }

  function initializeMappings(data: RawSheetData): void {
    columnMappings = createPeerRequestColumnMappings(data);
  }

  function handleModeSwitch(mode: 'paste' | 'file'): void {
    if (mode === sourceMode) return;
    sourceMode = mode;
    rawData = null;
    pasteText = '';
    selectedFileName = '';
    columnMappings = [];
    unmatchedSuggestions = {};
    importError = '';
  }

  function handlePasteInput(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    pasteText = text;
    const trimmed = text.trim();
    if (!trimmed) {
      rawData = null;
      columnMappings = [];
      return;
    }
    try {
      const parsed = parseCsvToSheetData(trimmed);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        rawData = null;
        return;
      }
      const headersChanged =
        !rawData ||
        parsed.headers.length !== rawData.headers.length ||
        parsed.headers.some((h, i) => h !== rawData!.headers[i]);
      rawData = parsed;
      if (headersChanged) {
        initializeMappings(parsed);
      }
    } catch {
      rawData = null;
    }
  }

  async function handleFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importError = '';
    warnings = [];
    currentStep = 'mapping';
    matchedRowLinks = [];
    unmatchedRows = [];
    unmatchedSuggestions = {};
    unmatchedSelections = {};

    try {
      const text = await readFileAsText(file);
      const parsed = parseCsvToSheetData(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        importError = 'File must include a header row and at least one data row.';
        return;
      }

      rawData = parsed;
      selectedFileName = file.name;
      initializeMappings(parsed);
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Could not read file.';
    } finally {
      input.value = '';
    }
  }

  function handleMappingChange(columnIndex: number, field: MappedField | null): void {
    columnMappings = columnMappings.map((mapping) =>
      mapping.columnIndex === columnIndex ? { ...mapping, mappedTo: field } : mapping
    );
  }

  function getMappingError(): string | null {
    if (!rawData) {
      return sourceMode === 'paste'
        ? 'Paste CSV or TSV data first.'
        : 'Choose a CSV or TSV file first.';
    }

    return validatePeerRequestImportMappings(columnMappings);
  }

  function setUnmatchedSelection(rowIndex: number, studentId: string): void {
    unmatchedSelections = {
      ...unmatchedSelections,
      [rowIndex]: studentId
    };
  }

  function getUnmatchedSuggestion(rowIndex: number): RowMatchSuggestion | undefined {
    return unmatchedSuggestions[rowIndex];
  }

  function getBestSuggestedStudentId(rowIndex: number): string | undefined {
    return getUnmatchedSuggestion(rowIndex)?.bestCandidate?.studentId;
  }

  function isHighConfidenceSelectionEnabled(rowIndex: number): boolean {
    const bestCandidateStudentId = getBestSuggestedStudentId(rowIndex);
    return !!bestCandidateStudentId && unmatchedSelections[rowIndex] === bestCandidateStudentId;
  }

  function setHighConfidenceSelection(rowIndex: number, enabled: boolean): void {
    setUnmatchedSelection(rowIndex, enabled ? (getBestSuggestedStudentId(rowIndex) ?? '') : '');
  }

  function confirmAllHighConfidenceRows(): void {
    const nextSelections = { ...unmatchedSelections };
    for (const row of highConfidenceUnmatchedRows) {
      const suggestedStudentId = getBestSuggestedStudentId(row.rowIndex);
      if (suggestedStudentId) {
        nextSelections[row.rowIndex] = suggestedStudentId;
      }
    }
    unmatchedSelections = nextSelections;
  }

  function clearAllHighConfidenceRows(): void {
    const nextSelections = { ...unmatchedSelections };
    for (const row of highConfidenceUnmatchedRows) {
      nextSelections[row.rowIndex] = '';
    }
    unmatchedSelections = nextSelections;
  }

  async function beginPeerRequestReview(
    rowStudentLinks: StudentIdRowLink[],
    nextManualRemapCount: number,
    nextSkippedUnmatchedRowCount: number
  ): Promise<void> {
    if (!rawData) return;

    isBusy = true;
    importError = '';

    const extractionResult = await importPeerRequestsFromMapping(env, {
      programId,
      rawData,
      columnMappings,
      rowStudentLinks
    });

    if (isErr(extractionResult)) {
      importError = extractionResult.error.message;
      isBusy = false;
      return;
    }

    warnings = extractionResult.value.warnings;
    manualRemapCount = nextManualRemapCount;
    skippedUnmatchedRowCount = nextSkippedUnmatchedRowCount;

    if (extractionResult.value.entries.length === 0) {
      importError =
        'No peer requests were found after applying the current mappings and row review.';
      isBusy = false;
      return;
    }

    const matchResult = await matchPeerRequests(env, {
      requests: extractionResult.value.entries,
      students
    });

    if (isErr(matchResult)) {
      importError = 'Unable to match peer requests.';
      isBusy = false;
      return;
    }

    pendingPeerReview = matchResult.value;
    currentStep = 'review';
    isBusy = false;
  }

  async function handlePrepareImport(): Promise<void> {
    const mappingError = getMappingError();
    if (mappingError) {
      importError = mappingError;
      return;
    }

    if (!rawData) return;

    const reconciliation = reconcileRowsByStudentId(
      rawData,
      columnMappings,
      students.map((student) => ({
        studentId: student.id,
        sourceStudentId: getSourceStudentId(student)
      }))
    );

    matchedRowLinks = reconciliation.matched;
    unmatchedRows = prepareUnmatchedPeerRequestRows(
      rawData,
      columnMappings,
      reconciliation.unmatched
    );
    const rowSuggestions = suggestStudentMatchesForRows({
      rows: unmatchedRows.map((row) => ({
        rowIndex: row.rowIndex,
        name: row.matchName
      })),
      students
    });
    unmatchedSuggestions = Object.fromEntries(
      rowSuggestions.map((suggestion) => [suggestion.rowIndex, suggestion])
    );
    unmatchedSelections = Object.fromEntries(
      rowSuggestions
        .filter(
          (suggestion) =>
            suggestion.bucket === 'HIGH_CONFIDENCE' && suggestion.bestCandidate !== undefined
        )
        .map((suggestion) => [suggestion.rowIndex, suggestion.bestCandidate!.studentId])
    );
    importError = '';

    if (unmatchedRows.length > 0) {
      currentStep = 'unmatched';
      return;
    }

    if (reconciliation.matched.length === 0) {
      importError = 'No imported rows matched students in this activity roster.';
      return;
    }

    await beginPeerRequestReview(reconciliation.matched, 0, 0);
  }

  async function handleContinueFromUnmatched(): Promise<void> {
    const reviewedLinks = [...matchedRowLinks];
    let nextManualRemapCount = 0;
    let nextSkippedUnmatchedRowCount = 0;

    for (const row of unmatchedRows) {
      const selectedStudentId = unmatchedSelections[row.rowIndex]?.trim();
      const suggestedStudentId = getBestSuggestedStudentId(row.rowIndex);
      if (selectedStudentId) {
        reviewedLinks.push({
          rowIndex: row.rowIndex,
          studentId: selectedStudentId
        });
        if (selectedStudentId !== suggestedStudentId) {
          nextManualRemapCount += 1;
        }
      } else {
        nextSkippedUnmatchedRowCount += 1;
      }
    }

    if (reviewedLinks.length === 0) {
      importError = 'Every unmatched row is currently skipped, so there is nothing to import.';
      return;
    }

    await beginPeerRequestReview(reviewedLinks, nextManualRemapCount, nextSkippedUnmatchedRowCount);
  }

  async function handlePeerRequestConfirm(
    decisions: import('$lib/application/useCases/confirmPeerRequestMatches').PeerRequestReviewDecision[]
  ): Promise<void> {
    if (!pendingPeerReview) return;

    isBusy = true;
    importError = '';

    const confirmationResult = await confirmPeerRequestMatches(env, {
      requests: pendingPeerReview.updatedRequests,
      decisions
    });

    if (isErr(confirmationResult)) {
      importError = confirmationResult.error.type;
      isBusy = false;
      return;
    }

    const saveResult = await savePeerRequests(env, {
      programId,
      entries: confirmationResult.value.updatedRequests
    });

    if (isErr(saveResult)) {
      importError = saveResult.error.message;
      isBusy = false;
      return;
    }

    const unresolvedCount = confirmationResult.value.updatedRequests.filter(
      (request) => request.status === 'UNRESOLVED'
    ).length;

    await onComplete({
      savedCount: saveResult.value.savedCount,
      unresolvedCount,
      manualRemapCount,
      skippedUnmatchedRowCount,
      warnings
    });

    isBusy = false;
    onClose();
  }

  function handleClose(): void {
    if (isBusy) return;
    onClose();
  }

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-label="Import peer requests"
  onclick={handleOverlayClick}
  onkeydown={handleKeydown}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
    transition:scale={{ duration: 150, start: 0.97 }}
    onclick={(event) => event.stopPropagation()}
  >
    <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Import Peer Requests</h2>
        <p class="mt-1 text-sm text-gray-600">
          Import peer requests into <span class="font-medium text-gray-900">{activityName}</span>
          by matching source rows to the existing roster with a Student ID column.
        </p>
      </div>
      <button
        type="button"
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={handleClose}
        aria-label="Close"
      >
        <svg
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {#if importError}
      <div class="px-6 pt-4">
        <InlineError message={importError} dismissible onDismiss={() => (importError = '')} />
      </div>
    {/if}

    {#if currentStep === 'mapping'}
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <!-- Source mode tabs -->
        <div
          class="flex items-center gap-1 self-start rounded-lg border border-gray-200 bg-gray-100 p-1"
        >
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {sourceMode ===
            'paste'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'}"
            onclick={() => handleModeSwitch('paste')}
            disabled={isBusy}
          >
            Paste
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {sourceMode ===
            'file'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'}"
            onclick={() => handleModeSwitch('file')}
            disabled={isBusy}
          >
            Upload File
          </button>
        </div>

        <p class="mt-3 text-sm text-gray-600">
          Map one <strong>Student ID</strong> column and one or more <strong>Peer Request</strong>
          columns. Optional <strong>Name</strong>, <strong>First Name</strong>, and
          <strong>Last Name</strong> columns are used only for matching suggestions and are never
          imported as roster data.
        </p>

        {#if sourceMode === 'paste'}
          {#if !rawData}
            <!-- Paste textarea — shown until data is detected -->
            <div class="mt-4 flex flex-1 flex-col">
              <textarea
                class="min-h-[180px] w-full flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm placeholder:text-gray-400 focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
                placeholder={'Student ID\tPeer Request 1\tPeer Request 2\nstu-1\tAlex Johnson\tMia Chen\nstu-2\tJordan Smith\t'}
                value={pasteText}
                oninput={handlePasteInput}
                disabled={isBusy}
                spellcheck={false}
              ></textarea>
              <p class="mt-1.5 text-xs text-gray-500">
                Paste a tab-separated or comma-separated table. The first row must be a header row.
              </p>
            </div>
          {:else}
            <!-- Data detected from paste — show row count and SheetPreview -->
            <div class="mt-3 flex items-center gap-3">
              <span class="text-sm text-gray-600"
                >{pasteRowCount} {pasteRowCount === 1 ? 'row' : 'rows'} detected</span
              >
              <button
                type="button"
                class="text-sm text-gray-500 underline hover:text-gray-700"
                onclick={() => {
                  rawData = null;
                  columnMappings = [];
                  importError = '';
                }}
                disabled={isBusy}
              >
                Clear
              </button>
            </div>
            <div class="mt-4 min-h-0 flex-1 overflow-hidden">
              <SheetPreview
                data={rawData}
                mappings={columnMappings}
                allowedFields={peerRequestFields}
                uniformColumnWidth
                onMappingChange={handleMappingChange}
              />
            </div>
          {/if}
        {:else}
          <!-- File upload mode -->
          <div class="mt-4 flex items-center gap-3">
            <input
              bind:this={fileInput}
              type="file"
              accept=".csv,.tsv,.txt"
              class="hidden"
              onchange={handleFileChange}
            />
            <Button variant="ghost" onclick={() => fileInput?.click()} disabled={isBusy}>
              {rawData ? 'Choose Another File' : 'Choose File'}
            </Button>
            {#if selectedFileName}
              <span class="text-sm text-gray-500">{selectedFileName}</span>
            {/if}
          </div>

          {#if rawData}
            <div class="mt-4 min-h-0 flex-1 overflow-hidden">
              <SheetPreview
                data={rawData}
                mappings={columnMappings}
                allowedFields={peerRequestFields}
                uniformColumnWidth
                onMappingChange={handleMappingChange}
              />
            </div>
          {:else}
            <div
              class="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600"
            >
              Upload a CSV or TSV file to preview its columns.
            </div>
          {/if}
        {/if}
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <Button variant="ghost" onclick={handleClose} disabled={isBusy}>Cancel</Button>
        <Button variant="secondary" onclick={handlePrepareImport} disabled={isBusy || !rawData}>
          Review Rows
        </Button>
      </div>
    {:else if currentStep === 'unmatched'}
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p class="font-medium">Some rows could not be matched by Student ID.</p>
          <p class="mt-1">
            Student ID matching still runs first. For rows it cannot reconcile, name-based
            suggestions are offered below so you can confirm or override them before continuing.
          </p>
        </div>

        <div class="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>{matchedRowCount} rows matched automatically</span>
          <span>{unmatchedRows.length} rows need review</span>
        </div>

        <div class="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section class="rounded-xl border border-green-200 bg-green-50/40 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-green-900">High-confidence matches</h3>
                <p class="mt-1 text-sm text-green-700">
                  These rows are preselected so you can accept them with zero extra clicks.
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span
                  class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800"
                >
                  {highConfidenceUnmatchedRows.length}
                </span>
                {#if highConfidenceUnmatchedRows.length > 0}
                  <div class="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      class="text-green-800 underline hover:text-green-900"
                      onclick={confirmAllHighConfidenceRows}
                    >
                      Confirm all
                    </button>
                    <button
                      type="button"
                      class="text-green-800 underline hover:text-green-900"
                      onclick={clearAllHighConfidenceRows}
                    >
                      Clear all
                    </button>
                  </div>
                {/if}
              </div>
            </div>

            <div class="mt-4 space-y-3">
              {#each highConfidenceUnmatchedRows as row (row.rowIndex)}
                {@const suggestion = getUnmatchedSuggestion(row.rowIndex)}
                {@const bestCandidateStudentId = suggestion?.bestCandidate?.studentId}
                <div class="rounded-xl border border-green-100 bg-white p-4">
                  <label class="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      class="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={isHighConfidenceSelectionEnabled(row.rowIndex)}
                      onchange={(event) =>
                        setHighConfidenceSelection(
                          row.rowIndex,
                          (event.target as HTMLInputElement).checked
                        )}
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900">
                        {row.matchName || `Row ${row.rowIndex}`} →
                        {formatStudentName(
                          studentOptions.find((student) => student.id === bestCandidateStudentId) ?? {
                            id: bestCandidateStudentId ?? 'unmatched',
                            firstName: bestCandidateStudentId ?? 'Unmatched'
                          }
                        )}
                      </p>
                      <p class="mt-1 text-sm text-gray-600">
                        Row {row.rowIndex} · Source Student ID:
                        <span class="font-medium text-gray-900">{row.sourceStudentId || 'Blank'}</span>
                      </p>
                    </div>
                  </label>

                  {#if row.peerRequestTexts.length > 0}
                    <p class="mt-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                      Parsed peer request values
                    </p>
                    <ul class="mt-1 space-y-1 text-sm text-gray-700">
                      {#each row.peerRequestTexts as value}
                        <li>{value}</li>
                      {/each}
                    </ul>
                  {/if}

                  {#if !isHighConfidenceSelectionEnabled(row.rowIndex)}
                    <div class="mt-3">
                      <label
                        class="block text-xs font-medium tracking-wide text-gray-500 uppercase"
                        for={`high-confidence-row-${row.rowIndex}`}
                      >
                        Choose a different student or skip
                      </label>
                      <select
                        id={`high-confidence-row-${row.rowIndex}`}
                        class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
                        value={unmatchedSelections[row.rowIndex] ?? ''}
                        onchange={(event) =>
                          setUnmatchedSelection(
                            row.rowIndex,
                            (event.target as HTMLSelectElement).value
                          )}
                      >
                        <option value="">Skip this row</option>
                        {#each studentOptions as student (student.id)}
                          <option value={student.id}>{formatStudentName(student)}</option>
                        {/each}
                      </select>
                    </div>
                  {/if}
                </div>
              {:else}
                <p class="text-sm text-gray-500">No high-confidence name suggestions were found.</p>
              {/each}
            </div>
          </section>

          <section class="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-amber-900">Needs review</h3>
                <p class="mt-1 text-sm text-amber-700">
                  Review suggested students, then fall back to a manual selection if needed.
                </p>
              </div>
              <span
                class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
              >
                {needsReviewUnmatchedRows.length}
              </span>
            </div>

            <div class="mt-4 space-y-3">
              {#each needsReviewUnmatchedRows as row (row.rowIndex)}
                {@const suggestion = getUnmatchedSuggestion(row.rowIndex)}
                <div class="rounded-xl border border-amber-100 bg-white p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">
                        {row.matchName || `Row ${row.rowIndex}`}
                      </p>
                      <p class="mt-1 text-sm text-gray-600">
                        Row {row.rowIndex} · Source Student ID:
                        <span class="font-medium text-gray-900">{row.sourceStudentId || 'Blank'}</span>
                      </p>
                    </div>
                    <span
                      class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {row.peerRequestTexts.length} peer request{row.peerRequestTexts.length === 1
                        ? ''
                        : 's'}
                    </span>
                  </div>

                  {#if suggestion && suggestion.candidates.length > 0}
                    <div class="mt-3 space-y-2">
                      <p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
                        Suggestions
                      </p>
                      {#each suggestion.candidates as candidate (candidate.studentId)}
                        <button
                          type="button"
                          class="flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal-50 {unmatchedSelections[
                            row.rowIndex
                          ] === candidate.studentId
                            ? 'border-teal bg-teal-50'
                            : 'border-gray-200'}"
                          onclick={() => setUnmatchedSelection(row.rowIndex, candidate.studentId)}
                        >
                          <span class="font-medium text-gray-900">
                            {formatStudentName(
                              studentOptions.find((student) => student.id === candidate.studentId) ?? {
                                id: candidate.studentId,
                                firstName: candidate.studentId
                              }
                            )}
                          </span>
                          <span class="text-xs font-medium text-gray-500">{candidate.score}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}

                  <div class="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div>
                      <p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
                        Parsed peer request values
                      </p>
                      {#if row.peerRequestTexts.length > 0}
                        <ul class="mt-2 space-y-1 text-sm text-gray-700">
                          {#each row.peerRequestTexts as value}
                            <li>{value}</li>
                          {/each}
                        </ul>
                      {:else}
                        <p class="mt-2 text-sm text-gray-500">
                          No peer request values were found on this row.
                        </p>
                      {/if}
                    </div>

                    <div>
                      <label
                        class="block text-xs font-medium tracking-wide text-gray-500 uppercase"
                        for={`needs-review-row-${row.rowIndex}`}
                      >
                        Manual remap
                      </label>
                      <select
                        id={`needs-review-row-${row.rowIndex}`}
                        class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
                        value={unmatchedSelections[row.rowIndex] ?? ''}
                        onchange={(event) =>
                          setUnmatchedSelection(
                            row.rowIndex,
                            (event.target as HTMLSelectElement).value
                          )}
                      >
                        <option value="">Skip this row</option>
                        {#each studentOptions as student (student.id)}
                          <option value={student.id}>{formatStudentName(student)}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                </div>
              {:else}
                <p class="text-sm text-gray-500">No rows currently need extra review.</p>
              {/each}
            </div>
          </section>

          <section class="rounded-xl border border-gray-200 bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">No match</h3>
                <p class="mt-1 text-sm text-gray-600">
                  No plausible name suggestion was found, so these rows still need a manual choice.
                </p>
              </div>
              <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {noMatchUnmatchedRows.length}
              </span>
            </div>

            <div class="mt-4 space-y-3">
              {#each noMatchUnmatchedRows as row (row.rowIndex)}
                <div class="rounded-xl border border-gray-200 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">Row {row.rowIndex}</p>
                      <p class="mt-1 text-sm text-gray-600">
                        Source Student ID:
                        <span class="font-medium text-gray-900">{row.sourceStudentId || 'Blank'}</span>
                      </p>
                      {#if row.matchName}
                        <p class="mt-1 text-sm text-gray-600">
                          Name used for matching:
                          <span class="font-medium text-gray-900">{row.matchName}</span>
                        </p>
                      {/if}
                    </div>
                    <span
                      class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {row.peerRequestTexts.length} peer request{row.peerRequestTexts.length === 1
                        ? ''
                        : 's'}
                    </span>
                  </div>

                  <div class="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div>
                      <p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
                        Parsed peer request values
                      </p>
                      {#if row.peerRequestTexts.length > 0}
                        <ul class="mt-2 space-y-1 text-sm text-gray-700">
                          {#each row.peerRequestTexts as value}
                            <li>{value}</li>
                          {/each}
                        </ul>
                      {:else}
                        <p class="mt-2 text-sm text-gray-500">
                          No peer request values were found on this row.
                        </p>
                      {/if}
                    </div>

                    <div>
                      <label
                        class="block text-xs font-medium tracking-wide text-gray-500 uppercase"
                        for={`no-match-row-${row.rowIndex}`}
                      >
                        Manual remap
                      </label>
                      <select
                        id={`no-match-row-${row.rowIndex}`}
                        class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
                        value={unmatchedSelections[row.rowIndex] ?? ''}
                        onchange={(event) =>
                          setUnmatchedSelection(
                            row.rowIndex,
                            (event.target as HTMLSelectElement).value
                          )}
                      >
                        <option value="">Skip this row</option>
                        {#each studentOptions as student (student.id)}
                          <option value={student.id}>{formatStudentName(student)}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                </div>
              {:else}
                <p class="text-sm text-gray-500">Every unmatched row has at least one suggestion.</p>
              {/each}
            </div>
          </section>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <Button variant="ghost" onclick={() => (currentStep = 'mapping')} disabled={isBusy}
          >Back</Button
        >
        <Button
          variant="secondary"
          onclick={handleContinueFromUnmatched}
          loading={isBusy}
          disabled={isBusy}
        >
          Match Peer Requests
        </Button>
      </div>
    {:else if pendingPeerReview}
      <div class="min-h-0 flex-1 overflow-hidden p-6">
        <PeerRequestMatchingReview
          readyToConfirm={pendingPeerReview.readyToConfirm}
          needsReview={pendingPeerReview.needsReview}
          noMatch={pendingPeerReview.noMatch}
          invalid={pendingPeerReview.invalid}
          {students}
          onConfirm={handlePeerRequestConfirm}
          confirmLabel="Save Peer Requests"
          busy={isBusy}
          {warnings}
        />
      </div>
    {/if}
  </div>
</div>
