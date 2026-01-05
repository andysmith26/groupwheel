<script lang="ts">
	/**
	 * /activities/[id]/present/+page.svelte
	 *
	 * Present Mode - Clean, read-only view for showing groups to students.
	 * Part of the UX Overhaul (Approach C).
	 *
	 * Features:
	 * - "Find My Group" search tab
	 * - "All Groups" view tab
	 * - Clean interface suitable for projection
	 * - "Done Presenting" returns to workspace
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Scenario, Student } from '$lib/domain';
	import { buildAssignmentList } from '$lib/utils/csvExport';
	import { getStudentActivityView } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Search state ---
	let searchQuery = $state('');
	let debouncedQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchInputRef = $state<HTMLInputElement | null>(null);

	// --- View mode ---
	let viewMode = $state<'search' | 'all'>('search');

	// --- Keyboard handler cleanup ---
	let keyboardCleanup: (() => void) | null = null;

	// --- Group colors (consistent per group name) ---
	const GROUP_COLORS = [
		'bg-teal',
		'bg-blue-600',
		'bg-purple-600',
		'bg-rose-600',
		'bg-amber-500',
		'bg-emerald-600',
		'bg-indigo-600',
		'bg-pink-600'
	];

	function getGroupColor(groupName: string): string {
		// Simple hash based on group name for consistent colors
		let hash = 0;
		for (let i = 0; i < groupName.length; i++) {
			hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
		}
		return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
	}

	// --- Debounce effect ---
	$effect(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedQuery = searchQuery;
		}, 150);
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	// --- Auto-focus search input when search tab is selected ---
	$effect(() => {
		if (viewMode === 'search' && searchInputRef) {
			// Small delay to ensure DOM is ready
			setTimeout(() => searchInputRef?.focus(), 50);
		}
	});

	// --- Derived ---
	let studentsById = $derived(new Map(students.map((s) => [s.id, s])));

	let assignments = $derived.by(() => {
		if (!scenario) return [];
		return buildAssignmentList(scenario.groups, studentsById);
	});

	// Map from groupId to list of member names (for "other members" display)
	let membersByGroup = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const a of assignments) {
			if (!map.has(a.groupId)) {
				map.set(a.groupId, []);
			}
			map.get(a.groupId)!.push(a.studentName);
		}
		return map;
	});

	let filteredAssignments = $derived.by(() => {
		if (!debouncedQuery.trim()) return [];
		const query = debouncedQuery.toLowerCase().trim();
		return assignments.filter(
			(a) =>
				a.firstName.toLowerCase().startsWith(query) ||
				a.lastName.toLowerCase().startsWith(query)
		);
	});

	let groupedAssignments = $derived.by(() => {
		const groups = new Map<string, typeof assignments>();
		for (const assignment of assignments) {
			if (!groups.has(assignment.groupName)) {
				groups.set(assignment.groupName, []);
			}
			groups.get(assignment.groupName)!.push(assignment);
		}
		return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	});

	onMount(async () => {
		env = getAppEnvContext();

		// Set up Escape key handler to return to workspace
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				goto(`/activities/${$page.params.id}/workspace`);
			}
		}
		document.addEventListener('keydown', handleKeydown);
		keyboardCleanup = () => document.removeEventListener('keydown', handleKeydown);

		await loadData();
	});

	onDestroy(() => {
		keyboardCleanup?.();
	});

	async function loadData() {
		if (!env) return;

		loading = true;
		loadError = null;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided';
			loading = false;
			return;
		}

		const result = await getStudentActivityView(env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = 'Activity not found';
			} else if (result.error.type === 'SCENARIO_NOT_FOUND') {
				loadError = 'Groups have not been created yet';
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		scenario = data.scenario;
		students = data.students;

		loading = false;
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Present'} | Groupwheel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if loading}
		<div class="flex min-h-screen items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg p-8">
			<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
				<p class="text-red-700">{loadError}</p>
				<a href="/activities" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program && scenario}
		<!-- Header - Minimal chrome for projection -->
		<header class="border-b-2 border-gray-300 bg-white">
			<div class="mx-auto max-w-6xl px-6 py-4">
				<div class="flex items-center justify-between">
					<h1 class="text-3xl font-bold text-gray-900">{program.name}</h1>
					<a
						href="/activities/{$page.params.id}/workspace"
						class="rounded-lg bg-gray-800 px-6 py-3 text-lg font-semibold text-white hover:bg-gray-700"
					>
						Done
					</a>
				</div>

				<!-- View mode tabs - Large for projection -->
				<div class="mt-4 flex gap-2">
					<button
						type="button"
						class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {viewMode === 'search'
							? 'bg-teal text-white'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						onclick={() => (viewMode = 'search')}
					>
						Find My Group
					</button>
					<button
						type="button"
						class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {viewMode === 'all'
							? 'bg-teal text-white'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						onclick={() => (viewMode = 'all')}
					>
						All Groups
					</button>
				</div>
			</div>
		</header>

		<!-- Content - Large text for projection -->
		<main class="mx-auto max-w-6xl px-6 py-8">
			{#if viewMode === 'search'}
				<!-- Search mode -->
				<div class="space-y-8">
					<div class="mx-auto max-w-2xl">
						<label for="student-search" class="sr-only">Search for your name</label>
						<input
							id="student-search"
							type="text"
							class="block w-full rounded-xl border-2 border-gray-300 px-6 py-5 text-2xl shadow-sm placeholder:text-gray-400 focus:border-teal focus:ring-4 focus:ring-teal/30"
							placeholder="Type your name to find your group..."
							bind:value={searchQuery}
							bind:this={searchInputRef}
						/>
					</div>

					{#if searchQuery.trim()}
						{#if filteredAssignments.length === 0}
							<div
								class="mx-auto max-w-2xl rounded-xl border-2 border-gray-200 bg-white p-8 text-center"
							>
								<p class="text-xl text-gray-600">No student found. Check your spelling?</p>
							</div>
						{:else}
							<div class="mx-auto max-w-2xl space-y-4">
								{#each filteredAssignments as assignment (assignment.studentId)}
									{@const otherMembers = (membersByGroup.get(assignment.groupId) ?? []).filter(
										(name) => name !== assignment.studentName
									)}
									<div class="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-md">
										<div class="flex items-center justify-between gap-4">
											<div>
												<p class="text-2xl font-semibold text-gray-900">{assignment.studentName}</p>
												{#if assignment.grade}
													<p class="mt-1 text-lg text-gray-600">Grade {assignment.grade}</p>
												{/if}
											</div>
											<div class="rounded-xl {getGroupColor(assignment.groupName)} px-6 py-3">
												<p class="text-2xl font-bold text-white">{assignment.groupName}</p>
											</div>
										</div>
										{#if filteredAssignments.length === 1 && otherMembers.length > 0}
											<div class="mt-4 border-t border-gray-100 pt-4">
												<p class="text-base text-gray-500">
													Also in {assignment.groupName}: {otherMembers.join(', ')}
												</p>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<div
							class="mx-auto max-w-2xl rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center"
						>
							<p class="text-xl text-gray-600">Start typing your name above to find your group</p>
						</div>
					{/if}
				</div>
			{:else}
				<!-- All groups mode - High contrast grid -->
				<div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each groupedAssignments as [groupName, members] (groupName)}
						<div class="rounded-xl border-2 border-gray-200 bg-white shadow-md">
							<div class="border-b-2 border-gray-100 {getGroupColor(groupName)} px-5 py-4">
								<h3 class="text-2xl font-bold text-white">{groupName}</h3>
								<p class="mt-1 text-base text-white/80">{members.length} students</p>
							</div>
							<ul class="divide-y divide-gray-100">
								{#each members as member (member.studentId)}
									<li class="px-5 py-3">
										<p class="text-lg font-medium text-gray-900">{member.studentName}</p>
										{#if member.grade}
											<p class="text-base text-gray-600">Grade {member.grade}</p>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{/if}
		</main>
	{/if}
</div>
