<script lang="ts">
  import type { MatchResult, MatchCandidate } from '$lib/application/useCases/findMatchingStudents';
  import type { StudentIdentity } from '$lib/domain';
  import Button from '$lib/components/ui/Button.svelte';

  const {
    highConfidence = [],
    needsReview = [],
    lowConfidence = [],
    newStudents = [],
    onConfirm,
    onCancel
  }: {
    highConfidence?: MatchResult[];
    needsReview?: MatchResult[];
    lowConfidence?: MatchResult[];
    newStudents?: MatchResult[];
    onConfirm: (decisions: MatchDecision[]) => void;
    onCancel: () => void;
  } = $props();

  /**
   * A decision made for an imported student.
   */
  export interface MatchDecision {
    importedStudent: MatchResult['importedStudent'];
    decision: 'LINK' | 'NEW';
    linkedIdentityId?: string;
  }

  // Track selections for high confidence matches (checkboxes)
  let highConfidenceSelections = $state<Map<number, boolean>>(new Map());

  // Track radio selections for needs-review items
  // key = rowIndex, value = 'NEW' or the identity ID
  let reviewSelections = $state<Map<number, string>>(new Map());

  // Initialize high confidence as all selected by default
  $effect(() => {
    const initial = new Map<number, boolean>();
    for (const match of highConfidence) {
      initial.set(match.importedStudent.rowIndex, true);
    }
    highConfidenceSelections = initial;
  });

  // Combined low and new students (just informational)
  let newAndLowStudents = $derived([...lowConfidence, ...newStudents]);

  // Count totals
  let totalImported = $derived(
    highConfidence.length + needsReview.length + lowConfidence.length + newStudents.length
  );

  // Check if we can proceed (all reviews must be resolved)
  let unresolvedCount = $derived(
    needsReview.filter((r) => !reviewSelections.has(r.importedStudent.rowIndex)).length
  );
  let canConfirm = $derived(unresolvedCount === 0);

  function toggleHighConfidence(rowIndex: number) {
    const current = highConfidenceSelections.get(rowIndex) ?? true;
    highConfidenceSelections.set(rowIndex, !current);
    highConfidenceSelections = new Map(highConfidenceSelections);
  }

  function selectAllHighConfidence() {
    for (const match of highConfidence) {
      highConfidenceSelections.set(match.importedStudent.rowIndex, true);
    }
    highConfidenceSelections = new Map(highConfidenceSelections);
  }

  function deselectAllHighConfidence() {
    for (const match of highConfidence) {
      highConfidenceSelections.set(match.importedStudent.rowIndex, false);
    }
    highConfidenceSelections = new Map(highConfidenceSelections);
  }

  function setReviewSelection(rowIndex: number, value: string) {
    reviewSelections.set(rowIndex, value);
    reviewSelections = new Map(reviewSelections);
  }

  function handleConfirm() {
    const decisions: MatchDecision[] = [];

    // Process high confidence matches
    for (const match of highConfidence) {
      const isSelected = highConfidenceSelections.get(match.importedStudent.rowIndex) ?? true;
      if (isSelected && match.bestMatch) {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'LINK',
          linkedIdentityId: match.bestMatch.id
        });
      } else {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'NEW'
        });
      }
    }

    // Process reviewed matches
    for (const match of needsReview) {
      const selection = reviewSelections.get(match.importedStudent.rowIndex);
      if (selection === 'NEW' || !selection) {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'NEW'
        });
      } else {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'LINK',
          linkedIdentityId: selection
        });
      }
    }

    // Process low confidence (treat as new unless selected otherwise)
    for (const match of lowConfidence) {
      const selection = reviewSelections.get(match.importedStudent.rowIndex);
      if (selection && selection !== 'NEW') {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'LINK',
          linkedIdentityId: selection
        });
      } else {
        decisions.push({
          importedStudent: match.importedStudent,
          decision: 'NEW'
        });
      }
    }

    // Process new students (always new)
    for (const match of newStudents) {
      decisions.push({
        importedStudent: match.importedStudent,
        decision: 'NEW'
      });
    }

    onConfirm(decisions);
  }

  function formatStudentName(student: { firstName: string; lastName?: string }): string {
    return student.lastName ? `${student.firstName} ${student.lastName}` : student.firstName;
  }

  function formatIdentityDisplay(identity: StudentIdentity): string {
    return identity.displayName;
  }
</script>

<div class="flex h-full max-h-[80vh] flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">Review Student Matches</h2>
      <p class="text-sm text-gray-500">{totalImported} students imported</p>
    </div>
    {#if unresolvedCount > 0}
      <span class="text-sm text-amber-600">
        {unresolvedCount}
        {unresolvedCount === 1 ? 'decision' : 'decisions'} needed
      </span>
    {/if}
  </div>

  <!-- Three-panel layout -->
  <div class="grid flex-1 grid-cols-3 gap-4 overflow-hidden p-6">
    <!-- Panel 1: High Confidence -->
    <div class="flex flex-col overflow-hidden rounded-lg border border-gray-200">
      <div class="border-b border-gray-200 bg-green-50 px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-green-800">High Confidence</h3>
            <p class="text-sm text-green-600">{highConfidence.length} students</p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs text-green-700 underline hover:text-green-900"
              onclick={selectAllHighConfidence}
            >
              Select All
            </button>
            <button
              type="button"
              class="text-xs text-green-700 underline hover:text-green-900"
              onclick={deselectAllHighConfidence}
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>
      <div class="flex-1 space-y-1 overflow-y-auto p-2">
        {#each highConfidence as match}
          {@const rowIndex = match.importedStudent.rowIndex}
          {@const isSelected = highConfidenceSelections.get(rowIndex) ?? true}
          <label class="flex cursor-pointer items-start gap-3 rounded p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={isSelected}
              onchange={() => toggleHighConfidence(rowIndex)}
              class="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-gray-900">
                {formatStudentName(match.importedStudent)}
              </div>
              {#if match.bestMatch}
                <div class="flex items-center gap-1 text-xs text-gray-500">
                  <span class="text-green-600">→</span>
                  {formatIdentityDisplay(match.bestMatch)}
                </div>
              {/if}
            </div>
          </label>
        {:else}
          <div class="p-4 text-center text-sm text-gray-500">No high-confidence matches</div>
        {/each}
      </div>
    </div>

    <!-- Panel 2: Needs Review -->
    <div class="flex flex-col overflow-hidden rounded-lg border border-gray-200">
      <div class="border-b border-gray-200 bg-amber-50 px-4 py-3">
        <h3 class="font-medium text-amber-800">Needs Review</h3>
        <p class="text-sm text-amber-600">{needsReview.length} students</p>
      </div>
      <div class="flex-1 space-y-3 overflow-y-auto p-2">
        {#each needsReview as match}
          {@const rowIndex = match.importedStudent.rowIndex}
          {@const selection = reviewSelections.get(rowIndex)}
          <div class="rounded-lg border border-gray-200 p-3">
            <div class="mb-2 text-sm font-medium text-gray-900">
              "{formatStudentName(match.importedStudent)}"
            </div>
            <div class="space-y-2">
              {#each match.allCandidates as candidate}
                <label class="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="review-{rowIndex}"
                    value={candidate.identity.id}
                    checked={selection === candidate.identity.id}
                    onchange={() => setReviewSelection(rowIndex, candidate.identity.id)}
                    class="mt-0.5 h-4 w-4 border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div class="flex-1">
                    <span class="text-gray-900">{formatIdentityDisplay(candidate.identity)}</span>
                    <span class="ml-1 text-gray-400">({candidate.score})</span>
                    {#if candidate.reasons.length > 0}
                      <div class="text-xs text-gray-500">{candidate.reasons[0]}</div>
                    {/if}
                  </div>
                </label>
              {/each}
              <label class="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="review-{rowIndex}"
                  value="NEW"
                  checked={selection === 'NEW'}
                  onchange={() => setReviewSelection(rowIndex, 'NEW')}
                  class="mt-0.5 h-4 w-4 border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span class="text-gray-700">New student</span>
              </label>
            </div>
          </div>
        {:else}
          <div class="p-4 text-center text-sm text-gray-500">No students need review</div>
        {/each}
      </div>
    </div>

    <!-- Panel 3: New Students -->
    <div class="flex flex-col overflow-hidden rounded-lg border border-gray-200">
      <div class="border-b border-gray-200 bg-blue-50 px-4 py-3">
        <h3 class="font-medium text-blue-800">New Students</h3>
        <p class="text-sm text-blue-600">{newAndLowStudents.length} students</p>
      </div>
      <div class="flex-1 space-y-1 overflow-y-auto p-2">
        {#each newAndLowStudents as match}
          <div class="flex items-center gap-2 rounded p-2">
            <svg
              class="h-4 w-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm text-gray-900">
                {formatStudentName(match.importedStudent)}
              </div>
              {#if match.confidence === 'LOW' && match.allCandidates.length > 0}
                <div class="text-xs text-gray-500">
                  Possible match: {match.allCandidates[0].identity.displayName}
                </div>
              {:else}
                <div class="text-xs text-gray-500">No matches found</div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="p-4 text-center text-sm text-gray-500">No new students</div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
    <Button variant="ghost" onclick={onCancel}>Cancel</Button>
    <Button variant="primary" disabled={!canConfirm} onclick={handleConfirm}>
      Confirm & Import
    </Button>
  </div>
</div>
