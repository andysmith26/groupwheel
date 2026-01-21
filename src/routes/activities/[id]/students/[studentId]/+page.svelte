<script lang="ts">
	/**
	 * /activities/[id]/students/[studentId]/+page.svelte
	 *
	 * Focused editor for a single student: name, gender, and group preferences.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { getActivityData } from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import type { Program, Student, Preference } from '$lib/domain';
	import { extractStudentPreference } from '$lib/domain/preference';
	import { getStudentDisplayName } from '$lib/domain/student';
	import RankedChoiceEditor from '$lib/components/ui/RankedChoiceEditor.svelte';

	let env = $state<ReturnType<typeof getAppEnvContext> | null>(null);
	let program = $state<Program | null>(null);
	let student = $state<Student | null>(null);
	let preferences = $state<Preference[]>([]);
	let groupNames = $state<string[]>([]);

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	let firstName = $state('');
	let lastName = $state('');
	let gender = $state('');
	let selectedChoices = $state<string[]>([]);

	let displayName = $derived(student ? getStudentDisplayName(student) : '');

	onMount(async () => {
		env = getAppEnvContext();
		const programId = $page.params.id;
		const studentId = $page.params.studentId;

		if (!programId || !studentId) {
			loadError = 'Missing activity or student ID.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });
		if (isErr(result)) {
			loadError = result.error.type === 'PROGRAM_NOT_FOUND'
				? 'Activity not found.'
				: result.error.message;
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		preferences = data.preferences;
		groupNames = data.scenario?.groups.map((group) => group.name).filter((name) => name.trim()) ?? [];

		const foundStudent = data.students.find((s) => s.id === studentId);
		if (!foundStudent) {
			loadError = 'Student not found.';
			loading = false;
			return;
		}

		student = foundStudent;
		firstName = foundStudent.firstName;
		lastName = foundStudent.lastName ?? '';
		gender = foundStudent.gender ?? '';

		const prefRecord = preferences.find((pref) => pref.studentId === foundStudent.id);
		const pref = prefRecord ? extractStudentPreference(prefRecord) : null;
		selectedChoices = pref?.likeGroupIds ?? [];

		loading = false;
	});

	async function handleSave() {
		if (!env || !program || !student) return;
		const trimmedFirst = firstName.trim();
		if (!trimmedFirst) {
			saveError = 'First name is required.';
			return;
		}

		saving = true;
		saveError = null;
		saveSuccess = false;

		try {
			// Use $state.snapshot() to get a plain object from the reactive proxy
			// IndexedDB's structured clone algorithm cannot clone Svelte 5 proxies
			const plainStudent = $state.snapshot(student);
			const updatedStudent: Student = {
				...plainStudent,
				firstName: trimmedFirst,
				lastName: lastName.trim() || undefined,
				gender: gender.trim() || undefined
			};

			await env.studentRepo.saveMany([updatedStudent]);
			student = updatedStudent;

			const prefRepo = env.preferenceRepo;
			const existingPrefs = await prefRepo.listByProgramId(program.id);
			const existingPref = existingPrefs.find((pref) => pref.studentId === updatedStudent.id);

			if (selectedChoices.length > 0 || existingPref) {
				const preferenceToSave: Preference = {
					id: existingPref?.id ?? `pref-${Date.now()}-${updatedStudent.id}`,
					programId: program.id,
					studentId: updatedStudent.id,
					payload: {
						studentId: updatedStudent.id,
						likeGroupIds: [...selectedChoices], // Spread to plain array for IDB serialization
						avoidStudentIds: [],
						avoidGroupIds: [],
						meta: {}
					}
				};
				await prefRepo.save(preferenceToSave);
			}

			saveSuccess = true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Failed to save changes.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{displayName || 'Edit Student'} | Groupwheel</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-4">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading student...</p>
		</div>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6">
			<p class="text-red-700">{loadError}</p>
			{#if program}
				<a
					href="/activities/{program.id}"
					class="mt-4 inline-block text-sm text-blue-600 hover:underline"
				>
					Back to activity
				</a>
			{/if}
		</div>
	{:else if program && student}
		<div class="mb-6">
			<a
				href="/activities/{program.id}"
				class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
			>
				<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Activity setup
			</a>
			<h1 class="mt-3 text-2xl font-semibold text-gray-900">Edit Student</h1>
			<p class="mt-1 text-sm text-gray-500">{displayName}</p>
		</div>

		<div class="space-y-4">
			<div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="text-base font-semibold text-gray-900">Student details</h2>
				<p class="mt-1 text-sm text-gray-500">Update the roster information used in grouping.</p>

				<div class="mt-4 grid gap-4 md:grid-cols-2">
					<label class="block">
						<span class="text-sm font-medium text-gray-700">First name</span>
						<input
							type="text"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal focus:ring-teal"
							bind:value={firstName}
						/>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-gray-700">Last name</span>
						<input
							type="text"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal focus:ring-teal"
							bind:value={lastName}
						/>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-gray-700">Gender</span>
						<input
							type="text"
							placeholder="Optional"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal focus:ring-teal"
							bind:value={gender}
						/>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-gray-700">Student ID</span>
						<input
							type="text"
							class="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
							value={student.id}
							readonly
						/>
					</label>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<div class="mb-4">
					<h2 class="text-base font-semibold text-gray-900">Group preferences</h2>
					<p class="mt-1 text-sm text-gray-500">
						Rank this student's group choices. First choice is top priority.
					</p>
				</div>

				{#if groupNames.length === 0}
					<div class="rounded-md border border-amber-200 bg-amber-50 p-3">
						<p class="text-sm text-amber-700">
							Add group names in setup before assigning preferences.
						</p>
					</div>
				{:else}
					<RankedChoiceEditor
						choices={selectedChoices}
						allOptions={groupNames}
						onChoicesChange={(newChoices) => (selectedChoices = newChoices)}
						choicesLabel="Ranked Choices"
						availableLabel="Available Groups"
					/>
				{/if}
			</div>
		</div>

		<div class="mt-6 flex flex-wrap items-center justify-end gap-3">
			<button
				type="button"
				class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				onclick={() => program && goto(`/activities/${program.id}`)}
				disabled={saving}
			>
				Cancel
			</button>
			<button
				type="button"
				class="rounded-md bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
				onclick={handleSave}
				disabled={saving}
			>
				{saving ? 'Saving...' : 'Save changes'}
			</button>
		</div>

		{#if saveError}
			<p class="mt-3 text-sm text-red-600">{saveError}</p>
		{/if}
		{#if saveSuccess}
			<p class="mt-3 text-sm text-green-600">Changes saved.</p>
		{/if}
	{/if}
</div>
