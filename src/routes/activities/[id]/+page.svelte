<script lang="ts">
	/**
	 * /activities/[id]/+page.svelte
	 *
	 * Activity Hub - Central navigation point for an activity.
	 * Shows activity name (editable), status, and navigation to Setup/Workspace/Present.
	 * Part of the UX Overhaul (Approach C).
	 */

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getActivityData, renameActivity } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Program, Pool, Scenario, Student } from '$lib/domain';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Rename state ---
	let isEditingName = $state(false);
	let editNameValue = $state('');
	let renameError = $state<string | null>(null);

	// --- Derived ---
	let hasGroups = $derived(scenario !== null && scenario.groups.length > 0);
	let studentCount = $derived(students.length);
	let groupCount = $derived(scenario?.groups.length ?? 0);

	// Status for display
	let statusInfo = $derived.by(() => {
		if (!scenario) {
			return { label: 'Draft', style: 'bg-gray-100 text-gray-600', icon: '○' };
		}
		return { label: 'Editing', style: 'bg-yellow-100 text-yellow-700', icon: '○' };
	});

	onMount(async () => {
		env = getAppEnvContext();
		await loadActivityData();
	});

	async function loadActivityData() {
		if (!env) return;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = `Activity not found`;
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		pool = data.pool;
		scenario = data.scenario;
		students = data.students;

		loading = false;
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return '';
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function startEditingName() {
		if (!program) return;
		editNameValue = program.name;
		renameError = null;
		isEditingName = true;
	}

	async function saveNewName() {
		if (!env || !program) return;

		const trimmed = editNameValue.trim();
		if (!trimmed) {
			renameError = 'Activity name cannot be empty';
			return;
		}

		const result = await renameActivity(env, {
			programId: program.id,
			newName: trimmed
		});

		if (isErr(result)) {
			renameError = result.error.message;
			return;
		}

		// Update local state
		program = { ...program, name: trimmed };
		isEditingName = false;
	}

	function cancelEditingName() {
		isEditingName = false;
		renameError = null;
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveNewName();
		} else if (e.key === 'Escape') {
			cancelEditingName();
		}
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Activity'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading activity...</p>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6">
			<p class="text-red-700">{loadError}</p>
			<a href="/activities" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
				← Back to activities
			</a>
		</div>
	{:else if program}
		<!-- Back link -->
		<a
			href="/activities"
			class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
		>
			<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			Back to Activities
		</a>

		<!-- Activity header -->
		<div class="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-start justify-between">
				<div class="min-w-0 flex-1">
					{#if isEditingName}
						<div class="flex items-center gap-2">
							<input
								type="text"
								class="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xl font-semibold shadow-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
								bind:value={editNameValue}
								onkeydown={handleNameKeydown}
								onblur={saveNewName}
							/>
						</div>
						{#if renameError}
							<p class="mt-1 text-sm text-red-600">{renameError}</p>
						{/if}
					{:else}
						<button
							type="button"
							class="group flex items-center gap-2 text-left"
							onclick={startEditingName}
							title="Click to rename"
						>
							<h1 class="text-2xl font-semibold text-gray-900">{program.name}</h1>
							<svg
								class="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
								/>
							</svg>
						</button>
					{/if}
					<p class="mt-1 text-sm text-gray-500">
						{#if 'termLabel' in program.timeSpan}
							{program.timeSpan.termLabel}
						{:else if program.timeSpan.start}
							{formatDate(program.timeSpan.start)}
						{/if}
					</p>
				</div>
				<span class="ml-4 rounded-full px-3 py-1 text-sm font-medium {statusInfo.style}">
					{statusInfo.icon}
					{statusInfo.label}
				</span>
			</div>

			<!-- Stats -->
			<div class="mt-4 flex gap-6 text-sm text-gray-600">
				<div>
					<span class="font-medium text-gray-900">{studentCount}</span>
					{studentCount === 1 ? 'student' : 'students'}
				</div>
				{#if hasGroups}
					<div>
						<span class="font-medium text-gray-900">{groupCount}</span>
						{groupCount === 1 ? 'group' : 'groups'}
					</div>
				{/if}
			</div>
		</div>

		<!-- Navigation cards -->
		<div class="mt-6 grid gap-4 sm:grid-cols-3">
			<!-- Edit Groups -->
			<a
				href="/activities/{program.id}/workspace"
				class="group relative rounded-lg border-2 p-6 text-center transition-all
					{hasGroups
					? 'border-teal bg-teal/5 hover:bg-teal/10'
					: 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'}"
				aria-disabled={!hasGroups}
				onclick={(e) => !hasGroups && e.preventDefault()}
			>
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10"
				>
					<svg class="h-6 w-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
				</div>
				<h3 class="font-medium text-gray-900 group-hover:text-teal">Edit Groups</h3>
				<p class="mt-1 text-xs text-gray-500">
					{#if hasGroups}
						Drag students between groups
					{:else}
						Generate groups first
					{/if}
				</p>
				{#if hasGroups}
					<span
						class="absolute right-2 top-2 rounded-full bg-teal px-2 py-0.5 text-xs font-medium text-white"
					>
						Primary
					</span>
				{/if}
			</a>

			<!-- Setup -->
			<a
				href="/activities/{program.id}/setup"
				class="group relative rounded-lg border-2 p-6 text-center transition-all
					{!hasGroups
					? 'border-coral bg-coral/5 hover:bg-coral/10'
					: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
			>
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full {!hasGroups
						? 'bg-coral/10'
						: 'bg-gray-100'}"
				>
					<svg
						class="h-6 w-6 {!hasGroups ? 'text-coral' : 'text-gray-600'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<h3 class="font-medium text-gray-900">Setup</h3>
				<p class="mt-1 text-xs text-gray-500">
					{#if !hasGroups}
						Configure and generate groups
					{:else}
						Roster, groups, preferences
					{/if}
				</p>
				{#if !hasGroups}
					<span
						class="absolute right-2 top-2 rounded-full bg-coral px-2 py-0.5 text-xs font-medium text-white"
					>
						Start here
					</span>
				{/if}
			</a>

			<!-- Present -->
			<a
				href="/activities/{program.id}/present"
				class="group rounded-lg border-2 p-6 text-center transition-all
					{hasGroups
					? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
					: 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'}"
				aria-disabled={!hasGroups}
				onclick={(e) => !hasGroups && e.preventDefault()}
			>
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
				>
					<svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h3 class="font-medium text-gray-900 group-hover:text-gray-700">Present to Class</h3>
				<p class="mt-1 text-xs text-gray-500">
					{#if hasGroups}
						Show groups to students
					{:else}
						Generate groups first
					{/if}
				</p>
			</a>
		</div>
	{/if}
</div>
