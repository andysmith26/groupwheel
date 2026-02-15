<script lang="ts">
	/**
	 * ObservationGroupCard: iPad-friendly group card with tap-to-sentiment.
	 *
	 * Each card displays a group with its members and large sentiment buttons
	 * for quick teacher observations during live sessions.
	 */
	import type { ObservationSentiment } from '$lib/domain/observation';

	const {
		groupId,
		groupName,
		color,
		studentNames,
		observationCount = 0,
		onSentiment,
		onNote
	}: {
		groupId: string;
		groupName: string;
		color: string;
		studentNames: string[];
		observationCount?: number;
		onSentiment: (sentiment: ObservationSentiment) => void;
		onNote: (note: string) => void;
	} = $props();

	let flashColor = $state<string | null>(null);
	let showNoteInput = $state(false);
	let noteText = $state('');
	let noteTimeout: ReturnType<typeof setTimeout> | null = null;

	function handleSentimentTap(sentiment: ObservationSentiment) {
		onSentiment(sentiment);

		// Visual feedback flash
		const colors: Record<ObservationSentiment, string> = {
			POSITIVE: 'ring-green-400 bg-green-50',
			NEUTRAL: 'ring-amber-400 bg-amber-50',
			NEGATIVE: 'ring-red-400 bg-red-50'
		};
		flashColor = colors[sentiment];
		setTimeout(() => {
			flashColor = null;
		}, 300);

		// Show "Add note?" prompt briefly
		showNoteInput = false;
		if (noteTimeout) clearTimeout(noteTimeout);
		noteTimeout = setTimeout(() => {
			showNoteInput = true;
			// Auto-hide after 3s if not interacted with
			noteTimeout = setTimeout(() => {
				showNoteInput = false;
				noteTimeout = null;
			}, 3000);
		}, 100);
	}

	function handleNoteSubmit() {
		const trimmed = noteText.trim();
		if (trimmed) {
			onNote(trimmed);
			noteText = '';
		}
		showNoteInput = false;
		if (noteTimeout) {
			clearTimeout(noteTimeout);
			noteTimeout = null;
		}
	}

	function handleNoteInputFocus() {
		// Cancel auto-hide when user focuses the input
		if (noteTimeout) {
			clearTimeout(noteTimeout);
			noteTimeout = null;
		}
	}
</script>

<div
	class="rounded-xl border-2 border-gray-200 bg-white shadow-md transition-all duration-300 touch-manipulation {flashColor ? `ring-4 ${flashColor}` : ''}"
>
	<!-- Group header -->
	<div class="{color} px-5 py-4 rounded-t-xl">
		<div class="flex items-center justify-between">
			<h3 class="text-xl font-bold text-white">{groupName}</h3>
			{#if observationCount > 0}
				<span class="rounded-full bg-white/30 px-2.5 py-0.5 text-sm font-medium text-white">
					{observationCount}
				</span>
			{/if}
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

		<!-- Add note prompt -->
		{#if showNoteInput}
			<div class="mt-3">
				<div class="flex items-center gap-2">
					<input
						type="text"
						bind:value={noteText}
						placeholder="Add a note..."
						class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
						onfocus={handleNoteInputFocus}
						onkeydown={(e) => e.key === 'Enter' && handleNoteSubmit()}
					/>
					<button
						type="button"
						class="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
						onclick={handleNoteSubmit}
					>
						Save
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
