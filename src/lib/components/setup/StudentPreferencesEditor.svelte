<script lang="ts">
	/**
	 * StudentPreferencesEditor.svelte
	 *
	 * Allows teachers to manually edit individual student group preferences.
	 * Simple, intuitive interface for busy teachers.
	 *
	 * Features:
	 * - View all students with their current preferences
	 * - Click to edit a student's ranked group choices
	 * - Drag to reorder preference ranks
	 * - Quick clear/reset options
	 */

	import type { ParsedStudent, ParsedPreference } from '$lib/application/useCases/createGroupingActivity';

	interface Props {
		/** All students */
		students: ParsedStudent[];
		/** Available group names */
		groupNames: string[];
		/** Current preferences */
		preferences: ParsedPreference[];
		/** Callback when preferences change */
		onPreferencesChange: (preferences: ParsedPreference[]) => void;
	}

	let { students, groupNames, preferences, onPreferencesChange }: Props = $props();

	// Local state
	let searchQuery = $state('');
	let editingStudentId = $state<string | null>(null);
	let editingChoices = $state<string[]>([]);

	// Derived
	let filteredStudents = $derived(() => {
		if (!searchQuery.trim()) return students;
		const query = searchQuery.toLowerCase().trim();
		return students.filter(
			(s) =>
				s.firstName.toLowerCase().includes(query) ||
				s.lastName.toLowerCase().includes(query) ||
				s.displayName.toLowerCase().includes(query)
		);
	});

	let preferencesMap = $derived(() => {
		const map = new Map<string, string[]>();
		for (const pref of preferences) {
			map.set(pref.studentId, pref.likeGroupIds ?? []);
		}
		return map;
	});

	let studentsWithPrefs = $derived(() => {
		return preferences.filter((p) => p.likeGroupIds && p.likeGroupIds.length > 0).length;
	});

	function getStudentPrefs(studentId: string): string[] {
		return preferencesMap().get(studentId) ?? [];
	}

	function startEditing(student: ParsedStudent) {
		editingStudentId = student.id;
		editingChoices = [...getStudentPrefs(student.id)];
	}

	function cancelEditing() {
		editingStudentId = null;
		editingChoices = [];
	}

	function saveEditing() {
		if (!editingStudentId) return;

		// Update preferences
		const newPrefs = [...preferences];
		const existingIndex = newPrefs.findIndex((p) => p.studentId === editingStudentId);

		if (editingChoices.length === 0) {
			// Remove preference if no choices
			if (existingIndex >= 0) {
				newPrefs.splice(existingIndex, 1);
			}
		} else {
			const newPref: ParsedPreference = {
				studentId: editingStudentId,
				likeGroupIds: editingChoices
			};

			if (existingIndex >= 0) {
				newPrefs[existingIndex] = newPref;
			} else {
				newPrefs.push(newPref);
			}
		}

		onPreferencesChange(newPrefs);
		editingStudentId = null;
		editingChoices = [];
	}

	function toggleChoice(groupName: string) {
		const index = editingChoices.indexOf(groupName);
		if (index >= 0) {
			editingChoices = editingChoices.filter((c) => c !== groupName);
		} else {
			editingChoices = [...editingChoices, groupName];
		}
	}

	function moveChoiceUp(index: number) {
		if (index <= 0) return;
		const newChoices = [...editingChoices];
		[newChoices[index - 1], newChoices[index]] = [newChoices[index], newChoices[index - 1]];
		editingChoices = newChoices;
	}

	function moveChoiceDown(index: number) {
		if (index >= editingChoices.length - 1) return;
		const newChoices = [...editingChoices];
		[newChoices[index], newChoices[index + 1]] = [newChoices[index + 1], newChoices[index]];
		editingChoices = newChoices;
	}

	function clearStudentPrefs(studentId: string) {
		const newPrefs = preferences.filter((p) => p.studentId !== studentId);
		onPreferencesChange(newPrefs);
	}

	function clearAllPrefs() {
		onPreferencesChange([]);
	}
</script>

<div class="space-y-4">
	<!-- Header with search and actions -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex-1">
			{#if students.length > 10}
				<input
					type="text"
					placeholder="Search students..."
					class="w-full max-w-xs rounded-md border-gray-300 text-sm shadow-sm focus:border-teal focus:ring-teal"
					bind:value={searchQuery}
				/>
			{/if}
		</div>
		{#if studentsWithPrefs() > 0}
			<button
				type="button"
				class="text-sm text-gray-500 hover:text-red-600"
				onclick={clearAllPrefs}
			>
				Clear all
			</button>
		{/if}
	</div>

	<!-- Student list -->
	<div class="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-80 overflow-y-auto">
		{#if filteredStudents().length === 0}
			<div class="p-4 text-center text-sm text-gray-500">
				{#if searchQuery}
					No students match "{searchQuery}"
				{:else}
					No students in this roster
				{/if}
			</div>
		{:else}
			{#each filteredStudents() as student (student.id)}
				{@const prefs = getStudentPrefs(student.id)}
				<div class="group">
					{#if editingStudentId === student.id}
						<!-- Editing mode -->
						<div class="p-3 bg-teal-50">
							<div class="flex items-center justify-between mb-3">
								<span class="font-medium text-gray-900">{student.displayName}</span>
								<div class="flex gap-2">
									<button
										type="button"
										class="text-sm text-gray-500 hover:text-gray-700"
										onclick={cancelEditing}
									>
										Cancel
									</button>
									<button
										type="button"
										class="text-sm font-medium text-teal hover:text-teal-dark"
										onclick={saveEditing}
									>
										Save
									</button>
								</div>
							</div>

							<!-- Group selection -->
							<div class="space-y-2">
								<p class="text-xs text-gray-600">Click groups to add/remove, drag to reorder:</p>

								<!-- Selected choices with reorder -->
								{#if editingChoices.length > 0}
									<div class="flex flex-wrap gap-1 mb-2">
										{#each editingChoices as choice, index (choice)}
											<div class="inline-flex items-center gap-1 rounded-full bg-teal text-white text-xs px-2 py-1">
												<span class="font-medium">{index + 1}.</span>
												<span>{choice}</span>
												<div class="flex gap-0.5 ml-1">
													{#if index > 0}
														<button
															type="button"
															class="hover:bg-teal-dark rounded p-0.5"
															onclick={() => moveChoiceUp(index)}
															aria-label="Move up"
														>
															<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
															</svg>
														</button>
													{/if}
													{#if index < editingChoices.length - 1}
														<button
															type="button"
															class="hover:bg-teal-dark rounded p-0.5"
															onclick={() => moveChoiceDown(index)}
															aria-label="Move down"
														>
															<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
															</svg>
														</button>
													{/if}
												</div>
												<button
													type="button"
													class="hover:bg-teal-dark rounded p-0.5"
													onclick={() => toggleChoice(choice)}
													aria-label="Remove"
												>
													<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Available groups -->
								<div class="flex flex-wrap gap-1">
									{#each groupNames as group (group)}
										{@const isSelected = editingChoices.includes(group)}
										<button
											type="button"
											class="rounded-full border text-xs px-2.5 py-1 transition-colors {isSelected
												? 'border-teal bg-teal/10 text-teal'
												: 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}"
											onclick={() => toggleChoice(group)}
										>
											{group}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<!-- View mode -->
						<button
							type="button"
							class="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
							onclick={() => startEditing(student)}
						>
							<div class="min-w-0 flex-1">
								<span class="text-sm text-gray-900">{student.displayName}</span>
								{#if prefs.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each prefs as pref, index (pref)}
											<span class="inline-flex items-center rounded bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5">
												<span class="font-medium text-gray-500 mr-0.5">{index + 1}.</span>
												{pref}
											</span>
										{/each}
									</div>
								{:else}
									<p class="text-xs text-gray-400 mt-0.5">No preferences</p>
								{/if}
							</div>
							<svg
								class="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- Helper text -->
	<p class="text-xs text-gray-500">
		Click a student to edit their group preferences. First choice is their top preference.
	</p>
</div>
