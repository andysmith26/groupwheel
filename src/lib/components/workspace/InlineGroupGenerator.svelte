<script lang="ts">
	/**
	 * InlineGroupGenerator.svelte
	 *
	 * Inline group generation UI for the workspace empty state.
	 * Shows a group size picker, "Avoid recent groupmates" toggle,
	 * and "Generate Groups" button. Replaces the separate /start route.
	 */

	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { quickGenerateGroups } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Scenario, Session } from '$lib/domain';
	import { saveGenerationSettings } from '$lib/utils/generationSettings';

	interface Props {
		programId: string;
		programName: string;
		studentCount: number;
		sessions: Session[];
		onGenerated: (scenario: Scenario) => void;
		onError: (error: string) => void;
	}

	let { programId, programName, studentCount, sessions, onGenerated, onError }: Props = $props();

	let env = getAppEnvContext();

	// --- Configuration ---
	let groupSize = $state(4);
	let avoidRecentGroupmates = $state(true);
	let generating = $state(false);
	let generateError = $state<string | null>(null);

	// --- Derived ---
	let groupCount = $derived(studentCount > 0 ? Math.ceil(studentCount / groupSize) : 0);
	let maxGroupSize = $derived(Math.max(2, Math.min(8, Math.floor(studentCount / 2))));
	let publishedSessions = $derived(
		sessions
			.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
			.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
	);
	let hasPreviousSessions = $derived(publishedSessions.length > 0);

	let smallerGroupCount = $derived(
		studentCount > 0 && groupCount > 0 ? groupCount * groupSize - studentCount : 0
	);

	// Default avoid-recent to on when there are published sessions
	$effect(() => {
		avoidRecentGroupmates = hasPreviousSessions;
	});

	function decrementGroupSize() {
		if (groupSize > 2) groupSize--;
	}

	function incrementGroupSize() {
		if (groupSize < maxGroupSize) groupSize++;
	}

	async function handleGenerate() {
		generating = true;
		generateError = null;

		saveGenerationSettings(programId, { groupSize, avoidRecentGroupmates });

		const result = await quickGenerateGroups(env, {
			programId,
			groupSize,
			groupNamePrefix: 'Group',
			avoidRecentGroupmates
		});

		if (isErr(result)) {
			generateError =
				result.error.type === 'GROUPING_ALGORITHM_FAILED'
					? result.error.message
					: `Failed to generate groups: ${result.error.type}`;
			generating = false;
			onError(generateError);
			return;
		}

		generating = false;
		onGenerated(result.value);
	}
</script>

{#if studentCount === 0}
	<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
		<p class="text-gray-600">Add students to get started.</p>
		<a
			href="/activities/{programId}"
			class="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
		>
			Go to activity setup
		</a>
	</div>
{:else}
	<div class="text-center">
		<h2 class="text-xl font-semibold text-gray-900">Generate Groups</h2>
		<p class="mt-1 text-sm text-gray-500">{studentCount} students</p>
	</div>

	<!-- Group size selector -->
	<div class="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
		<label class="mb-3 block text-sm font-medium text-gray-700" for="group-size">
			Students per group
		</label>
		<div class="flex items-center gap-4">
			<button
				onclick={decrementGroupSize}
				disabled={groupSize <= 2}
				class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
			>
				-
			</button>
			<span id="group-size" class="min-w-[2ch] text-center text-3xl font-semibold text-gray-900">
				{groupSize}
			</span>
			<button
				onclick={incrementGroupSize}
				disabled={groupSize >= maxGroupSize}
				class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
			>
				+
			</button>
		</div>
		<p class="mt-3 text-sm text-gray-500">
			{groupCount} group{groupCount !== 1 ? 's' : ''}
			{#if smallerGroupCount > 0}
				<span class="text-gray-400">
					({smallerGroupCount} with {groupSize - 1} students)
				</span>
			{/if}
		</p>
	</div>

	<!-- Avoid recent groupmates toggle -->
	{#if hasPreviousSessions}
		<label
			class="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
		>
			<input
				type="checkbox"
				bind:checked={avoidRecentGroupmates}
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			/>
			<div>
				<span class="text-sm font-medium text-gray-700">Avoid recent groupmates</span>
				<p class="text-xs text-gray-500">Try to mix students into different groups than last time</p>
			</div>
		</label>
	{/if}

	<!-- Generate error -->
	{#if generateError}
		<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{generateError}
		</div>
	{/if}

	<!-- Generate button -->
	<button
		onclick={handleGenerate}
		disabled={generating}
		class="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{#if generating}
			<span class="inline-flex items-center gap-2">
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
				</svg>
				Generating...
			</span>
		{:else}
			Generate Groups
		{/if}
	</button>

	<!-- Link to full setup -->
	<div class="mt-6 text-center">
		<a
			href="/activities/{programId}"
			class="text-sm text-gray-400 hover:text-gray-600"
		>
			Activity setup & preferences
		</a>
	</div>
{/if}
