<script lang="ts">
  /**
   * TeacherView: iPad-optimized observation grid for live sessions.
   *
   * Shows group cards with large sentiment tap targets and note-taking.
   * Coordinates note input visibility across cards (only one at a time).
   * Includes a floating Quick Note button for cross-group text observations.
   */
  import type { ExportableAssignment } from '$lib/utils/csvExport';
  import type { Observation, Session } from '$lib/domain';
  import type { ObservationSentiment } from '$lib/domain/observation';
  import { getGroupColor } from '$lib/utils/groupColors';
  import ObservationGroupCard from '$lib/components/session/ObservationGroupCard.svelte';

  const {
    groupedAssignments,
    observations,
    activeSession,
    onSentiment,
    onNote
  }: {
    groupedAssignments: [string, ExportableAssignment[]][];
    observations: Observation[];
    activeSession: Session | null;
    onSentiment: (groupId: string, groupName: string, sentiment: ObservationSentiment) => void;
    onNote: (groupId: string, groupName: string, note: string) => void;
  } = $props();

  // Cross-card note input coordination: only one card shows note input at a time
  let activeNoteGroupId = $state<string | null>(null);

  // Quick Note bottom sheet state
  let showQuickNote = $state(false);
  let quickNoteGroupId = $state<string>('');
  let quickNoteText = $state('');
  let quickNoteSentiment = $state<ObservationSentiment | null>(null);

  let observationsByGroupId = $derived.by(() => {
    const map = new Map<string, Observation[]>();
    for (const obs of observations) {
      const existing = map.get(obs.groupId) ?? [];
      existing.push(obs);
      map.set(obs.groupId, existing);
    }
    return map;
  });

  function handleQuickNoteOpen() {
    showQuickNote = true;
    activeNoteGroupId = null; // dismiss any inline note input
    // Default to first group if none selected
    if (!quickNoteGroupId && groupedAssignments.length > 0) {
      const firstMembers = groupedAssignments[0][1];
      quickNoteGroupId = firstMembers[0]?.groupId ?? groupedAssignments[0][0];
    }
  }

  function handleQuickNoteSubmit() {
    if (!quickNoteGroupId || !quickNoteText.trim()) return;

    const groupEntry = groupedAssignments.find(([, members]) => {
      const gId = members[0]?.groupId ?? '';
      return gId === quickNoteGroupId;
    });
    const groupName = groupEntry?.[0] ?? '';

    // If sentiment selected, record it first
    if (quickNoteSentiment) {
      onSentiment(quickNoteGroupId, groupName, quickNoteSentiment);
    }

    onNote(quickNoteGroupId, groupName, quickNoteText.trim());

    // Reset
    quickNoteText = '';
    quickNoteSentiment = null;
    showQuickNote = false;
  }

  function handleQuickNoteClose() {
    quickNoteText = '';
    quickNoteSentiment = null;
    showQuickNote = false;
  }
</script>

{#if !activeSession}
  <div class="mx-auto max-w-lg py-16 text-center">
    <div class="rounded-xl border-2 border-gray-200 bg-white p-8">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      <h2 class="mt-4 text-xl font-semibold text-gray-900">No active session</h2>
      <p class="mt-2 text-gray-600">
        Show to Class from the workspace to start recording observations.
      </p>
    </div>
  </div>
{:else}
  <div class="relative">
    <!-- Group cards grid -->
    <div
      class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      style="touch-action: manipulation"
    >
      {#each groupedAssignments as [groupName, members] (groupName)}
        {@const groupId = members[0]?.groupId ?? groupName}
        {@const groupObs = observationsByGroupId.get(groupId) ?? []}
        <ObservationGroupCard
          {groupId}
          {groupName}
          color={getGroupColor(groupName)}
          studentNames={members.map((m) => m.studentName)}
          sessionObservations={groupObs}
          showNoteInput={activeNoteGroupId === groupId}
          onSentiment={(sentiment) => {
            activeNoteGroupId = groupId;
            onSentiment(groupId, groupName, sentiment);
          }}
          onNote={(note) => {
            activeNoteGroupId = null;
            onNote(groupId, groupName, note);
          }}
          onDismissNote={() => {
            activeNoteGroupId = null;
          }}
        />
      {/each}
    </div>

    <!-- Quick Note floating action button -->
    <button
      type="button"
      class="fixed right-6 bottom-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      onclick={handleQuickNoteOpen}
      aria-label="Add a quick note"
    >
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </button>

    <!-- Quick Note bottom sheet -->
    {#if showQuickNote}
      <!-- Backdrop -->
      <button
        type="button"
        class="fixed inset-0 z-30 bg-black/30"
        onclick={handleQuickNoteClose}
        aria-label="Close quick note"
      ></button>

      <div
        class="fixed right-0 bottom-0 left-0 z-40 rounded-t-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-label="Quick Note"
      >
        <div class="mx-auto max-w-lg">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Quick Note</h3>
            <button
              type="button"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              onclick={handleQuickNoteClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <!-- Group selector pills -->
          <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3" style="scrollbar-width: none">
            {#each groupedAssignments as [groupName, members] (groupName)}
              {@const groupId = members[0]?.groupId ?? groupName}
              <button
                type="button"
                class="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors {quickNoteGroupId ===
                groupId
                  ? `${getGroupColor(groupName)} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                onclick={() => (quickNoteGroupId = groupId)}
              >
                {groupName}
              </button>
            {/each}
          </div>

          <!-- Note text input -->
          <textarea
            bind:value={quickNoteText}
            placeholder="Type your note..."
            class="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            rows="2"
          ></textarea>

          <!-- Optional sentiment -->
          <div class="mt-3 flex items-center gap-3">
            <span class="text-sm text-gray-500">Sentiment (optional):</span>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {quickNoteSentiment ===
              'POSITIVE'
                ? 'bg-green-500 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'}"
              onclick={() =>
                (quickNoteSentiment = quickNoteSentiment === 'POSITIVE' ? null : 'POSITIVE')}
              >+</button
            >
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {quickNoteSentiment ===
              'NEUTRAL'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}"
              onclick={() =>
                (quickNoteSentiment = quickNoteSentiment === 'NEUTRAL' ? null : 'NEUTRAL')}
              >~</button
            >
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {quickNoteSentiment ===
              'NEGATIVE'
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'}"
              onclick={() =>
                (quickNoteSentiment = quickNoteSentiment === 'NEGATIVE' ? null : 'NEGATIVE')}
              >!</button
            >
          </div>

          <!-- Save button -->
          <button
            type="button"
            class="mt-4 w-full rounded-xl bg-teal py-3 text-center font-medium text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
            onclick={handleQuickNoteSubmit}
            disabled={!quickNoteGroupId || !quickNoteText.trim()}
          >
            Save Note
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
