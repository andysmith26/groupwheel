<script lang="ts">
	/**
	 * Student View - Read-only view of group assignments
	 *
	 * This page can be shared with students to look up their group assignment.
	 * Features:
	 * - Search by name or ID
	 * - View all groups
	 * - Clean, simple interface suitable for projection or sharing
	 */

	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Pool, Scenario, Student, Group } from '$lib/domain';
	import { getStudentDisplayName } from '$lib/domain/student';
	import { buildAssignmentList, exportToTSV, copyToClipboard } from '$lib/utils/csvExport';

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

	// --- View mode ---
	let viewMode = $state<'search' | 'all'>('search');

	// --- Derived ---
	let studentsById = $derived(new Map(students.map((s) => [s.id, s])));

	let assignments = $derived.by(() => {
		if (!scenario) return [];
		return buildAssignmentList(scenario.groups, studentsById);
	});

	let filteredAssignments = $derived.by(() => {
		if (!searchQuery.trim()) return [];
		const query = searchQuery.toLowerCase().trim();
		return assignments.filter(
			(a) =>
				a.studentName.toLowerCase().includes(query) ||
				a.studentId.toLowerCase().includes(query) ||
				a.firstName.toLowerCase().includes(query) ||
				a.lastName.toLowerCase().includes(query)
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
		// Sort by group name
		return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	});

	onMount(async () => {
		env = getAppEnvContext();
		await loadData();
	});

	async function loadData() {
		if (!env) return;

		loading = true;
		loadError = null;

		try {
			const programId = $page.params.id;

			// Load program
			program = await env.programRepo.getById(programId);
			if (!program) {
				loadError = 'Activity not found';
				loading = false;
				return;
			}

			// Load scenario
			scenario = await env.scenarioRepo.getByProgramId(programId);
			if (!scenario) {
				loadError = 'Groups have not been created yet';
				loading = false;
				return;
			}

			// Load students from pool
			const poolId = program.primaryPoolId ?? program.poolIds?.[0];
			if (poolId) {
				const pool = await env.poolRepo.getById(poolId);
				if (pool) {
					students = await env.studentRepo.getByIds(pool.memberIds);
				}
			}
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function handleCopyAll() {
		const tsv = exportToTSV(assignments);
		const success = await copyToClipboard(tsv);
		// Simple feedback - could add toast
		if (success) {
			alert('Copied to clipboard!');
		}
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Student View'} | Groupwheel</title>
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
				<a href="/groups" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program && scenario}
		<!-- Header -->
		<header class="border-b border-gray-200 bg-white">
			<div class="mx-auto max-w-4xl px-4 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">{program.name}</h1>
						<p class="mt-1 text-sm text-gray-600">
							{scenario.groups.length} groups &middot; {assignments.length} students
						</p>
					</div>
					<div class="flex items-center gap-3">
						<a
							href="/groups/{$page.params.id}"
							class="text-sm text-gray-500 hover:text-gray-700"
						>
							← Edit view
						</a>
					</div>
				</div>

				<!-- View mode tabs -->
				<div class="mt-4 flex gap-4 border-b border-gray-200">
					<button
						type="button"
						class="border-b-2 px-1 pb-2 text-sm font-medium transition-colors {viewMode === 'search'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
						onclick={() => (viewMode = 'search')}
					>
						Find My Group
					</button>
					<button
						type="button"
						class="border-b-2 px-1 pb-2 text-sm font-medium transition-colors {viewMode === 'all'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
						onclick={() => (viewMode = 'all')}
					>
						All Groups
					</button>
				</div>
			</div>
		</header>

		<!-- Content -->
		<main class="mx-auto max-w-4xl p-4">
			{#if viewMode === 'search'}
				<!-- Search mode -->
				<div class="space-y-6">
					<div class="mx-auto max-w-md">
						<label for="student-search" class="sr-only">Search for your name</label>
						<input
							id="student-search"
							type="text"
							class="block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
							placeholder="Type your name to find your group..."
							bind:value={searchQuery}
						/>
					</div>

					{#if searchQuery.trim()}
						{#if filteredAssignments.length === 0}
							<div class="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
								<p class="text-gray-500">No students found matching "{searchQuery}"</p>
								<p class="mt-2 text-sm text-gray-400">Try checking the spelling or use your full name</p>
							</div>
						{:else}
							<div class="mx-auto max-w-md space-y-3">
								{#each filteredAssignments as assignment (assignment.studentId)}
									<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
										<div class="flex items-center justify-between">
											<div>
												<p class="font-medium text-gray-900">{assignment.studentName}</p>
												{#if assignment.grade}
													<p class="text-sm text-gray-500">Grade {assignment.grade}</p>
												{/if}
											</div>
											<div class="rounded-full bg-blue-100 px-4 py-2">
												<p class="text-lg font-semibold text-blue-800">{assignment.groupName}</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<div class="mx-auto max-w-md rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
							<p class="text-gray-500">Start typing your name above to find your group</p>
						</div>
					{/if}
				</div>
			{:else}
				<!-- All groups mode -->
				<div class="space-y-6">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-600">
							Showing all {scenario.groups.length} groups
						</p>
						<button
							type="button"
							class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
							onclick={handleCopyAll}
						>
							Copy All
						</button>
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each groupedAssignments as [groupName, members] (groupName)}
							<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
								<div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
									<h3 class="font-semibold text-gray-900">{groupName}</h3>
									<p class="text-xs text-gray-500">{members.length} students</p>
								</div>
								<ul class="divide-y divide-gray-100">
									{#each members as member (member.studentId)}
										<li class="px-4 py-2">
											<p class="text-sm text-gray-900">{member.studentName}</p>
											{#if member.grade}
												<p class="text-xs text-gray-500">Grade {member.grade}</p>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</main>

		<!-- Footer -->
		<footer class="border-t border-gray-200 bg-white">
			<div class="mx-auto max-w-4xl px-4 py-4 text-center text-xs text-gray-500">
				Powered by Groupwheel
			</div>
		</footer>
	{/if}
</div>
