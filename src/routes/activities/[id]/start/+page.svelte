<script lang="ts">
	/**
	 * /activities/[id]/start/+page.svelte
	 *
	 * Quick Start Session page for repeated random grouping.
	 * Pick a group size, generate groups, and go straight to the workspace.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getActivityData, quickGenerateGroups } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Program, Session } from '$lib/domain';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let studentCount = $state(0);
	let sessions = $state<Session[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let generating = $state(false);
	let generateError = $state<string | null>(null);

	// --- Configuration ---
	let groupSize = $state(4);
	let avoidRecentGroupmates = $state(true);

	// --- Derived ---
	let groupCount = $derived(studentCount > 0 ? Math.ceil(studentCount / groupSize) : 0);
	let maxGroupSize = $derived(Math.max(2, Math.min(8, Math.floor(studentCount / 2))));
	let publishedSessions = $derived(
		sessions
			.filter((s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED')
			.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
	);
	let hasPreviousSessions = $derived(publishedSessions.length > 0);

	// How many groups will be smaller than groupSize
	let smallerGroupCount = $derived(
		studentCount > 0 && groupCount > 0 ? groupCount * groupSize - studentCount : 0
	);

	function formatDate(date: Date | undefined): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	onMount(async () => {
		env = getAppEnvContext();
		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });

		if (isErr(result)) {
			loadError =
				result.error.type === 'PROGRAM_NOT_FOUND'
					? 'Activity not found'
					: result.error.message;
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		studentCount = data.students.length;
		sessions = data.sessions;

		// Default avoid-recent to on when there are published sessions
		const published = data.sessions.filter(
			(s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED'
		);
		avoidRecentGroupmates = published.length > 0;

		loading = false;
	});

	async function handleGenerate() {
		if (!env || !program) return;
		generating = true;
		generateError = null;

		const result = await quickGenerateGroups(env, {
			programId: program.id,
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
			return;
		}

		await goto(`/activities/${program.id}/workspace`);
	}

	function decrementGroupSize() {
		if (groupSize > 2) groupSize--;
	}

	function incrementGroupSize() {
		if (groupSize < maxGroupSize) groupSize++;
	}
</script>

<svelte:head>
	<title>Start Session | {program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-lg p-4">
	<!-- Back link -->
	<a
		href="/activities"
		class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		Activities
	</a>

	{#if loading}
		<div class="space-y-4">
			<div class="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
			<div class="h-40 animate-pulse rounded-lg bg-gray-100"></div>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
			{loadError}
		</div>
	{:else if program}
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-gray-900">{program.name}</h1>
			<p class="mt-1 text-sm text-gray-500">{studentCount} students</p>
		</div>

		{#if studentCount === 0}
			<!-- Empty state -->
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
				<p class="text-gray-600">Add students to get started.</p>
				<a
					href={`/activities/${program.id}`}
					class="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
				>
					Go to activity setup
				</a>
			</div>
		{:else}
			<!-- Group size selector -->
			<div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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

			<!-- Previous sessions -->
			{#if publishedSessions.length > 0}
				<div class="mt-8">
					<h2 class="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
						Previous Sessions ({publishedSessions.length})
					</h2>
					<div class="space-y-2">
						{#each publishedSessions as session}
							<div class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
								<p class="text-sm font-medium text-gray-700">
									{formatDate(session.publishedAt ?? session.createdAt)}
								</p>
								{#if session.name}
									<p class="text-xs text-gray-500">{session.name}</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Link to full setup -->
			<div class="mt-6 text-center">
				<a
					href={`/activities/${program.id}`}
					class="text-sm text-gray-400 hover:text-gray-600"
				>
					Activity setup & preferences
				</a>
			</div>
		{/if}
	{/if}
</div>
