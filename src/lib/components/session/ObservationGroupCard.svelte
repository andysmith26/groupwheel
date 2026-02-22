<script lang="ts">
  /**
   * ObservationGroupCard: iPad-friendly group card with tap-to-sentiment.
   *
   * Each card displays a group with its members and large sentiment buttons
   * for quick teacher observations during live sessions.
   *
   * Note input is controlled from the parent (TeacherView) so only one card
   * shows the note input at a time.
   */
  import type { Observation, ObservationSentiment } from '$lib/domain/observation';

  const {
    groupId,
    groupName,
    color,
    studentNames,
    sessionObservations = [],
    showNoteInput = false,
    onSentiment,
    onNote,
    onDismissNote
  }: {
    groupId: string;
    groupName: string;
    color: string;
    studentNames: string[];
    sessionObservations: Observation[];
    showNoteInput?: boolean;
    onSentiment: (sentiment: ObservationSentiment) => void;
    onNote: (note: string) => void;
    onDismissNote?: () => void;
  } = $props();

  let flashColor = $state<string | null>(null);
  let lastRecordedSentiment = $state<ObservationSentiment | null>(null);
  let showCheckmark = $state(false);
  let noteText = $state('');
  let checkmarkTimeout: ReturnType<typeof setTimeout> | null = null;

  let sentimentCounts = $derived.by(() => {
    const counts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
    for (const obs of sessionObservations) {
      if (obs.sentiment && obs.sentiment in counts) {
        counts[obs.sentiment as keyof typeof counts]++;
      }
    }
    return counts;
  });

  let totalCount = $derived(sessionObservations.length);

  function handleSentimentTap(sentiment: ObservationSentiment) {
    // Haptic feedback if available (Android tablets — progressive enhancement)
    navigator.vibrate?.(10);

    onSentiment(sentiment);

    // Visual feedback: flash + persistent checkmark
    const colors: Record<ObservationSentiment, string> = {
      POSITIVE: 'ring-green-400 bg-green-50',
      NEUTRAL: 'ring-amber-400 bg-amber-50',
      NEGATIVE: 'ring-red-400 bg-red-50'
    };
    flashColor = colors[sentiment];
    lastRecordedSentiment = sentiment;
    showCheckmark = true;

    setTimeout(() => {
      flashColor = null;
    }, 300);

    // Clear previous checkmark timeout, set new 2-second fade
    if (checkmarkTimeout) clearTimeout(checkmarkTimeout);
    checkmarkTimeout = setTimeout(() => {
      showCheckmark = false;
      checkmarkTimeout = null;
    }, 2000);
  }

  function handleNoteSubmit() {
    const trimmed = noteText.trim();
    if (trimmed) {
      onNote(trimmed);
      noteText = '';
    }
    onDismissNote?.();
  }

  function handleDismiss() {
    noteText = '';
    onDismissNote?.();
  }
</script>

<div
  class="touch-manipulation rounded-xl border-2 border-gray-200 bg-white shadow-md transition-all duration-300 {flashColor
    ? `ring-4 ${flashColor}`
    : ''}"
>
  <!-- Group header -->
  <div class="{color} rounded-t-xl px-5 py-4">
    <div class="flex items-center justify-between">
      <h3 class="text-xl font-bold text-white">{groupName}</h3>
      <div class="flex items-center gap-2">
        {#if showCheckmark}
          <span
            class="animate-pulse text-sm font-medium text-white"
            aria-label="Observation recorded">✓</span
          >
        {/if}
        {#if totalCount > 0}
          <span
            class="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white"
          >
            <span class="text-green-200">+{sentimentCounts.POSITIVE}</span>
            <span class="text-amber-200">~{sentimentCounts.NEUTRAL}</span>
            <span class="text-red-200">!{sentimentCounts.NEGATIVE}</span>
          </span>
        {/if}
      </div>
    </div>
    <p class="mt-1 text-sm text-white/80">{studentNames.length} students</p>
  </div>

  <!-- Student list -->
  <ul class="divide-y divide-gray-100">
    {#each studentNames as name}
      <li class="px-5 py-3">
        <p class="text-lg font-medium text-gray-900">{name}</p>
      </li>
    {/each}
  </ul>

  <!-- Sentiment buttons -->
  <div class="border-t-2 border-gray-100 p-4">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex-1 rounded-xl bg-green-50 py-4 text-center text-2xl font-semibold text-green-700 transition-colors hover:bg-green-100 active:bg-green-200"
        style="min-height: 56px"
        onclick={() => handleSentimentTap('POSITIVE')}
        aria-label="Positive observation for {groupName}"
      >
        +
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-amber-50 py-4 text-center text-2xl font-semibold text-amber-700 transition-colors hover:bg-amber-100 active:bg-amber-200"
        style="min-height: 56px"
        onclick={() => handleSentimentTap('NEUTRAL')}
        aria-label="Neutral observation for {groupName}"
      >
        ~
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-red-50 py-4 text-center text-2xl font-semibold text-red-700 transition-colors hover:bg-red-100 active:bg-red-200"
        style="min-height: 56px"
        onclick={() => handleSentimentTap('NEGATIVE')}
        aria-label="Needs attention observation for {groupName}"
      >
        !
      </button>
    </div>

    <!-- Note input: stays visible until explicitly dismissed or submitted -->
    {#if showNoteInput}
      <div class="mt-3">
        <div class="flex items-center gap-2">
          <input
            type="text"
            bind:value={noteText}
            placeholder="Add a note..."
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            onkeydown={(e) => e.key === 'Enter' && handleNoteSubmit()}
          />
          <button
            type="button"
            class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            onclick={handleNoteSubmit}
          >
            Save
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onclick={handleDismiss}
            aria-label="Dismiss note input"
          >
            ✕
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
