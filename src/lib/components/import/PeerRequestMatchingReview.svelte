<script lang="ts">
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import Button from '$lib/components/ui/Button.svelte';
  import type {
    MatchedPeerRequest,
    PeerRequestMatchBucket
  } from '$lib/application/useCases/matchPeerRequests';
  import type { PeerRequestReviewDecision } from '$lib/application/useCases/confirmPeerRequestMatches';
  import type { Student } from '$lib/domain';

  type ManualSectionKey = 'NEEDS_REVIEW' | 'NO_MATCH' | 'INVALID';

  interface ManualReviewSection {
    key: ManualSectionKey;
    title: string;
    description: string;
    emptyMessage: string;
    countTone: string;
    items: MatchedPeerRequest[];
  }

  interface Props {
    readyToConfirm?: MatchedPeerRequest[];
    needsReview?: MatchedPeerRequest[];
    noMatch?: MatchedPeerRequest[];
    invalid?: MatchedPeerRequest[];
    students: Student[];
    onConfirm: (decisions: PeerRequestReviewDecision[]) => void;
    confirmLabel?: string;
    busy?: boolean;
    warnings?: string[];
    compact?: boolean;
  }

  let {
    readyToConfirm = [],
    needsReview = [],
    noMatch = [],
    invalid = [],
    students,
    onConfirm,
    confirmLabel = 'Save Peer Requests',
    busy = false,
    warnings = [],
    compact = false
  }: Props = $props();

  let selectedReady = new SvelteMap<string, boolean>();
  let manualSelections = new SvelteMap<string, string>();
  let expandedSections = new SvelteSet<ManualSectionKey>([
    'NEEDS_REVIEW'
  ] satisfies ManualSectionKey[]);

  $effect(() => {
    selectedReady.clear();
    for (const match of readyToConfirm) {
      selectedReady.set(match.request.id, true);
    }
  });

  function formatStudentName(student: Student): string {
    return (
      [student.preferredName?.trim() || student.firstName, student.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || student.id
    );
  }

  function formatRequester(requesterStudentId: string): string {
    return formatStudentName(
      students.find((student) => student.id === requesterStudentId) ?? {
        id: requesterStudentId,
        firstName: requesterStudentId
      }
    );
  }

  function toggleReady(requestId: string) {
    selectedReady.set(requestId, !(selectedReady.get(requestId) ?? true));
  }

  function confirmAllReady() {
    for (const match of readyToConfirm) {
      selectedReady.set(match.request.id, true);
    }
  }

  function clearAllReady() {
    for (const match of readyToConfirm) {
      selectedReady.set(match.request.id, false);
    }
  }

  function setManualSelection(requestId: string, studentId: string) {
    manualSelections.set(requestId, studentId);
  }

  function getManualSelection(match: MatchedPeerRequest): string {
    const explicitSelection = manualSelections.get(match.request.id);
    if (explicitSelection !== undefined) {
      return explicitSelection;
    }

    if (match.bucket === 'NEEDS_REVIEW') {
      return match.bestCandidate?.studentId ?? '';
    }

    return '';
  }

  function getSelectableStudents(requesterStudentId: string): Student[] {
    return students.filter((student) => student.id !== requesterStudentId);
  }

  function getBucketLabel(bucket: PeerRequestMatchBucket): string {
    switch (bucket) {
      case 'READY_TO_CONFIRM':
        return 'Ready to confirm';
      case 'NEEDS_REVIEW':
        return 'Needs review';
      case 'NO_MATCH':
        return 'No match';
      case 'INVALID':
        return 'Invalid';
    }
  }

  function toggleSection(sectionKey: ManualSectionKey) {
    if (expandedSections.has(sectionKey)) {
      expandedSections.delete(sectionKey);
    } else {
      expandedSections.add(sectionKey);
    }
  }

  function isSectionExpanded(sectionKey: ManualSectionKey): boolean {
    return expandedSections.has(sectionKey);
  }

  function buildDecisions(leaveAllUnresolved = false): PeerRequestReviewDecision[] {
    const decisions: PeerRequestReviewDecision[] = [];

    for (const match of readyToConfirm) {
      const isSelected = !leaveAllUnresolved && (selectedReady.get(match.request.id) ?? true);
      decisions.push(
        isSelected
          ? { requestId: match.request.id, action: 'CONFIRM_SUGGESTED' }
          : { requestId: match.request.id, action: 'LEAVE_UNRESOLVED' }
      );
    }

    for (const match of [...needsReview, ...noMatch, ...invalid]) {
      const selectedStudentId = leaveAllUnresolved
        ? undefined
        : getManualSelection(match);
      decisions.push(
        selectedStudentId
          ? { requestId: match.request.id, action: 'SET_MANUAL', studentId: selectedStudentId }
          : { requestId: match.request.id, action: 'LEAVE_UNRESOLVED' }
      );
    }

    return decisions;
  }

  function handleConfirm() {
    onConfirm(buildDecisions(false));
  }

  function handleLeaveAllUnresolved() {
    onConfirm(buildDecisions(true));
  }

  const manualReviewSections = $derived<ManualReviewSection[]>([
    {
      key: 'NEEDS_REVIEW',
      title: 'Needs review',
      description: 'Ambiguous matches that need a teacher decision.',
      emptyMessage: 'No ambiguous requests need review.',
      countTone: 'bg-amber-100 text-amber-800',
      items: needsReview
    },
    {
      key: 'NO_MATCH',
      title: 'No match',
      description: 'No strong candidate was found. Pick a student or leave unresolved.',
      emptyMessage: 'No unmatched requests were found.',
      countTone: 'bg-slate-100 text-slate-700',
      items: noMatch
    },
    {
      key: 'INVALID',
      title: 'Invalid',
      description: 'Requests that look malformed or point back to the requester.',
      emptyMessage: 'No invalid requests were detected.',
      countTone: 'bg-rose-100 text-rose-800',
      items: invalid
    }
  ]);

  const manualReviewCount = $derived(
    manualReviewSections.reduce((total, section) => total + section.items.length, 0)
  );
</script>

<div
  class="flex max-h-[80vh] min-h-0 w-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
>
  <div class="border-b border-gray-200 px-5 py-4 sm:px-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Review peer requests</h2>
        <p class="mt-1 text-sm text-gray-600">
          Roster import is complete. Review suggested matches before peer requests are saved.
          Unresolved requests are allowed and will not block completion.
        </p>
      </div>

      <div class="flex flex-wrap gap-2 text-xs font-medium">
        <span class="rounded-full bg-green-100 px-2.5 py-1 text-green-800">
          {readyToConfirm.length} ready
        </span>
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
          {manualReviewCount} to review
        </span>
      </div>
    </div>

    {#if warnings.length > 0}
      <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p class="font-medium">Import warnings</p>
        <ul class="mt-2 list-disc pl-5">
          {#each warnings as warning, index (`${warning}-${index}`)}
            <li>{warning}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <div
    class="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:p-6 {compact
      ? 'grid-cols-1'
      : 'lg:grid-cols-[minmax(18rem,0.95fr)_minmax(24rem,1.05fr)]'}"
  >
    <section
      class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-green-200 bg-white"
    >
      <div class="border-b border-green-100 bg-green-50 px-4 py-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-green-900">Ready to confirm</h3>
            <p class="mt-1 text-sm text-green-700">
              High-confidence matches are preselected but still require confirmation.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
              {readyToConfirm.length}
            </span>
            {#if readyToConfirm.length > 0}
              <div class="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  class="text-green-800 underline hover:text-green-900"
                  onclick={confirmAllReady}
                >
                  Confirm all
                </button>
                <button
                  type="button"
                  class="text-green-800 underline hover:text-green-900"
                  onclick={clearAllReady}
                >
                  Clear all
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {#each readyToConfirm as match (match.request.id)}
          <label
            class="flex cursor-pointer gap-3 rounded-lg border border-green-100 p-3 hover:bg-green-50"
          >
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              checked={selectedReady.get(match.request.id) ?? true}
              onchange={() => toggleReady(match.request.id)}
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">
                {formatRequester(match.request.requesterStudentId)} requested {match.request
                  .rawText}
              </p>
              {#if match.bestCandidate}
                <p class="mt-1 text-sm text-gray-600">
                  Suggested: {formatStudentName(
                    students.find((student) => student.id === match.bestCandidate?.studentId) ?? {
                      id: match.bestCandidate.studentId,
                      firstName: match.bestCandidate.studentId
                    }
                  )}
                </p>
              {/if}
            </div>
          </label>
        {:else}
          <p class="text-sm text-gray-500">No requests are ready for bulk confirmation.</p>
        {/each}
      </div>
    </section>

    <section
      class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <div class="border-b border-gray-200 px-4 py-3">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Needs teacher review</h3>
            <p class="mt-1 text-sm text-gray-600">
              Review ambiguous, unmatched, or invalid requests by bucket.
            </p>
          </div>
          <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            {manualReviewCount}
          </span>
        </div>
      </div>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {#each manualReviewSections as section (section.key)}
          <div class="rounded-lg border border-gray-200 bg-gray-50/50">
            <button
              type="button"
              class="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
              onclick={() => toggleSection(section.key)}
              aria-expanded={isSectionExpanded(section.key)}
            >
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-gray-900">{section.title}</h4>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium {section.countTone}">
                    {section.items.length}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-600">{section.description}</p>
              </div>
              <svg
                class="mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform lg:hidden {isSectionExpanded(
                  section.key
                )
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              class:hidden={!isSectionExpanded(section.key)}
              class="border-t border-gray-200 p-4 lg:block"
            >
              <div class="space-y-4">
                {#each section.items as match (match.request.id)}
                  <div class="rounded-lg border border-gray-200 bg-white p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="text-sm font-medium text-gray-900">
                          {formatRequester(match.request.requesterStudentId)} requested {match
                            .request.rawText}
                        </p>
                        <p class="mt-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
                          {getBucketLabel(match.bucket)}
                        </p>
                      </div>
                      {#if match.warning}
                        <span
                          class="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                        >
                          {match.warning}
                        </span>
                      {/if}
                    </div>

                    {#if match.candidates.length > 0}
                      <div class="mt-3 space-y-2">
                        <p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          Suggestions
                        </p>
                        {#each match.candidates as candidate (candidate.studentId)}
                          <button
                            type="button"
                            class="flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal-50 {getManualSelection(
                              match
                            ) === candidate.studentId
                              ? 'border-teal bg-teal-50'
                              : 'border-gray-200'}"
                            onclick={() =>
                              setManualSelection(match.request.id, candidate.studentId)}
                          >
                            <span>
                              <span class="font-medium text-gray-900">
                                {formatStudentName(
                                  students.find(
                                    (student) => student.id === candidate.studentId
                                  ) ?? {
                                    id: candidate.studentId,
                                    firstName: candidate.studentId
                                  }
                                )}
                              </span>
                              {#if candidate.reasons.length > 0}
                                <span class="mt-1 block text-xs text-gray-500"
                                  >{candidate.reasons.join(', ')}</span
                                >
                              {/if}
                            </span>
                            <span class="text-xs font-medium text-gray-500">{candidate.score}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}

                    <div class="mt-3 space-y-2">
                      <label
                        class="block text-xs font-medium tracking-wide text-gray-500 uppercase"
                        for={`request-${match.request.id}`}
                      >
                        Manual selection
                      </label>
                      <select
                        id={`request-${match.request.id}`}
                        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal"
                        value={getManualSelection(match)}
                        onchange={(event) =>
                          setManualSelection(
                            match.request.id,
                            (event.target as HTMLSelectElement).value
                          )}
                      >
                        <option value="">Leave unresolved</option>
                        {#each getSelectableStudents(match.request.requesterStudentId) as student (student.id)}
                          <option value={student.id}>{formatStudentName(student)}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                {:else}
                  <p class="text-sm text-gray-500">{section.emptyMessage}</p>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>

  <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 sm:px-6">
    <Button variant="ghost" onclick={handleLeaveAllUnresolved} disabled={busy}
      >Leave All Unresolved</Button
    >
    <Button variant="secondary" onclick={handleConfirm} loading={busy} disabled={busy}
      >{confirmLabel}</Button
    >
  </div>
</div>
