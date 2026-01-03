<script lang="ts">
	/**
	 * Sessions list page for a program.
	 *
	 * Route: /groups/[id]/sessions
	 *
	 * Displays all published sessions for a grouping activity,
	 * allowing teachers to see their history of group publications.
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { listSessions } from '$lib/services/appEnvUseCases';
	import type { Session, Program } from '$lib/domain';
	import { isErr } from '$lib/types/result';
	import SessionCard from '$lib/components/sessions/SessionCard.svelte';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	let program = $state<Program | null>(null);
	let sessions = $state<Session[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const programId = $derived($page.params.id);

	onMount(async () => {
		env = getAppEnvContext();
		await loadData();
	});

	async function loadData() {
		if (!env || !programId) return;

		loading = true;
		error = null;

		// Load program info
		const programData = await env.programRepo.getById(programId);
		if (!programData) {
			error = 'Activity not found';
			loading = false;
			return;
		}
		program = programData;

		// Load sessions
		const result = await listSessions(env, { programId });

		if (isErr(result)) {
			error = 'Failed to load sessions';
		} else {
			// Filter to only published sessions
			sessions = result.value.filter((s) => s.status === 'PUBLISHED');
		}

		loading = false;
	}
</script>

<svelte:head>
	<title>Sessions | {program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4">
	<!-- Header -->
	<header>
		<a
			href="/groups/{programId}"
			class="text-sm text-gray-500 hover:text-gray-700"
		>
			&larr; Back to activity
		</a>

		{#if program}
			<h1 class="mt-2 text-2xl font-semibold text-gray-900">{program.name}</h1>
			<p class="text-sm text-gray-500">Published Sessions</p>
		{/if}
	</header>

	<!-- Content -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading sessions...</p>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else if sessions.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
				<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900">No published sessions yet</h3>
			<p class="mt-1 text-sm text-gray-500">
				Sessions are created when you publish your groups.
			</p>
			<a
				href="/groups/{programId}"
				class="mt-4 inline-block rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
			>
				Go to Groups
			</a>
		</div>
	{:else}
		<div class="space-y-4">
			{#each sessions as session (session.id)}
				<SessionCard {session} />
			{/each}
		</div>
	{/if}
</div>
