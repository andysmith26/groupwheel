<script lang="ts">
	/**
	 * Student detail page showing placement history.
	 *
	 * Route: /groups/[id]/students/[studentId]
	 *
	 * Displays a student's complete placement history across all sessions,
	 * including which preference rank they received for each placement.
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getStudentPlacementHistory } from '$lib/services/appEnvUseCases';
	import type { StudentPlacementHistoryResult } from '$lib/services/appEnvUseCases';
	import type { Student } from '$lib/domain';
	import { isErr } from '$lib/types/result';
	import StudentPlacementHistory from '$lib/components/students/StudentPlacementHistory.svelte';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	let student = $state<Student | null>(null);
	let historyResult = $state<StudentPlacementHistoryResult | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const programId = $derived($page.params.id);
	const studentId = $derived($page.params.studentId);

	onMount(async () => {
		env = getAppEnvContext();
		await loadStudentData();
	});

	async function loadStudentData() {
		if (!env || !studentId) return;

		loading = true;
		error = null;

		// Load student info
		const studentData = await env.studentRepo.getById(studentId);
		if (!studentData) {
			error = 'Student not found';
			loading = false;
			return;
		}
		student = studentData;

		// Load placement history
		const result = await getStudentPlacementHistory(env, { studentId });

		if (isErr(result)) {
			error = 'Failed to load placement history';
		} else {
			historyResult = result.value;
		}

		loading = false;
	}

	function getStudentDisplayName(s: Student): string {
		return s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
	}
</script>

<svelte:head>
	<title>{student ? getStudentDisplayName(student) : 'Student'} | Groupwheel</title>
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

		{#if student}
			<div class="mt-2 flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-lg font-medium text-teal-700">
					{student.firstName.charAt(0)}{student.lastName?.charAt(0) ?? ''}
				</div>
				<div>
					<h1 class="text-2xl font-semibold text-gray-900">
						{getStudentDisplayName(student)}
					</h1>
					{#if student.gradeLevel}
						<p class="text-sm text-gray-500">Grade {student.gradeLevel}</p>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<!-- Content -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else if historyResult}
		<section>
			<h2 class="mb-4 text-lg font-medium text-gray-900">Placement History</h2>
			<StudentPlacementHistory
				placements={historyResult.placements}
				summary={historyResult.summary}
			/>
		</section>
	{/if}
</div>
