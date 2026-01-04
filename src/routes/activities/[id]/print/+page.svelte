<script lang="ts">
	/**
	 * /activities/[id]/print/+page.svelte
	 *
	 * Print View - A clean, print-optimized layout for group assignments.
	 * Part of the UX Overhaul (Phase 3).
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getActivityData } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Program, Scenario, Student, Group } from '$lib/domain';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	// --- Derived ---
	let studentsById = $derived<Record<string, Student>>(
		Object.fromEntries(students.map((s) => [s.id, s]))
	);

	let groups = $derived<Group[]>(scenario?.groups ?? []);

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
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = `Activity not found: ${programId}`;
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
	});

	function handlePrint() {
		window.print();
	}

	function getStudentName(studentId: string): string {
		const student = studentsById[studentId];
		if (!student) return studentId;
		return `${student.firstName} ${student.lastName ?? ''}`.trim() || studentId;
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Print'} | Groupwheel</title>
	<style>
		@media print {
			/* Hide navigation and buttons when printing */
			.no-print {
				display: none !important;
			}

			/* Reset page margins */
			@page {
				margin: 0.5in;
			}

			/* Ensure groups don't break across pages */
			.print-group {
				break-inside: avoid;
				page-break-inside: avoid;
			}

			/* Black and white friendly */
			body {
				color: black !important;
				background: white !important;
			}
		}
	</style>
</svelte:head>

<div class="min-h-screen bg-white">
	{#if loading}
		<div class="flex h-screen items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if loadError}
		<div class="p-8">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-red-700">{loadError}</p>
				<a href="/activities" class="mt-2 inline-block text-sm text-blue-600 underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program}
		<!-- Navigation bar (hidden when printing) -->
		<div class="no-print border-b border-gray-200 bg-gray-50 px-4 py-3">
			<div class="mx-auto flex max-w-5xl items-center justify-between">
				<a
					href="/activities/{program.id}/workspace"
					class="text-sm text-gray-600 hover:text-gray-900"
				>
					← Back to Workspace
				</a>
				<button
					type="button"
					class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
					onclick={handlePrint}
				>
					Print
				</button>
			</div>
		</div>

		<!-- Printable content -->
		<div class="mx-auto max-w-5xl p-8">
			<!-- Header -->
			<div class="mb-8 text-center">
				<h1 class="text-2xl font-bold text-gray-900">{program.name}</h1>
				<p class="mt-1 text-sm text-gray-500">
					{students.length} students · {groups.length} groups
				</p>
			</div>

			{#if groups.length === 0}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
					<p class="text-gray-600">No groups have been generated yet.</p>
					<a
						href="/activities/{program.id}/workspace"
						class="mt-4 inline-block text-sm text-blue-600 underline no-print"
					>
						Go to workspace to generate groups
					</a>
				</div>
			{:else}
				<!-- Groups grid -->
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each groups as group}
						<div class="print-group rounded-lg border border-gray-300 bg-white p-4">
							<!-- Group header -->
							<div class="mb-3 border-b border-gray-200 pb-2">
								<h2 class="text-lg font-semibold text-gray-900">{group.name}</h2>
								<p class="text-sm text-gray-500">
									{group.memberIds.length} student{group.memberIds.length !== 1 ? 's' : ''}
									{#if group.capacity}
										/ {group.capacity} capacity
									{/if}
								</p>
							</div>

							<!-- Student list -->
							<ul class="space-y-1">
								{#each group.memberIds as studentId}
									<li class="text-sm text-gray-700">
										{getStudentName(studentId)}
									</li>
								{:else}
									<li class="text-sm italic text-gray-400">No students assigned</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>

				<!-- Unassigned students -->
				{@const assignedIds = new Set(groups.flatMap((g) => g.memberIds))}
				{@const unassigned = students.filter((s) => !assignedIds.has(s.id))}
				{#if unassigned.length > 0}
					<div class="mt-8">
						<h2 class="mb-3 text-lg font-semibold text-gray-700">
							Unassigned ({unassigned.length})
						</h2>
						<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<ul class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
								{#each unassigned as student}
									<li class="text-sm text-gray-700">
										{getStudentName(student.id)}
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Footer -->
			<div class="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
				Generated with Groupwheel · {new Date().toLocaleDateString()}
			</div>
		</div>
	{/if}
</div>
