<script lang="ts">
	import type { Student, StudentPreference } from '$lib/domain';

	const {
		students = [],
		preferenceMap = {},
		selectedStudentId = null,
		onSelect,
		onClose
	} = $props<{
		students?: Student[];
		preferenceMap?: Record<string, StudentPreference>;
		selectedStudentId?: string | null;
		onSelect?: (id: string) => void;
		onClose?: () => void;
	}>();

	// Build student name lookup
	const studentNameById = $derived<Record<string, string>>(
		Object.fromEntries(
			students.map((s: Student) => [s.id, `${s.firstName} ${s.lastName}`.trim() || s.id])
		)
	);

	function getPreferenceNames(studentId: string): string[] {
		const pref = preferenceMap[studentId];
		if (!pref?.likeStudentIds?.length) return [];
		return pref.likeStudentIds.map((id: string) => studentNameById[id] || id);
	}

	const studentsWithPrefs = $derived(
		students.filter((s: Student) => preferenceMap[s.id]?.likeStudentIds?.length > 0).length
	);
</script>

<aside class="w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50">
	<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
		<div>
			<h2 class="font-semibold text-gray-900">Students</h2>
			<p class="text-xs text-gray-500">
				{students.length} total · {studentsWithPrefs} with preferences
			</p>
		</div>
		<button
			type="button"
			class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
			onclick={onClose}
			aria-label="Close sidebar"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="h-full overflow-y-auto">
		<ul class="divide-y divide-gray-200">
			{#each students as student (student.id)}
				{@const prefs = getPreferenceNames(student.id)}
				{@const isSelected = selectedStudentId === student.id}
				<li>
					<button
						type="button"
						class="w-full px-4 py-3 text-left transition-colors hover:bg-white {isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}"
						onclick={() => onSelect?.(student.id)}
					>
						<p class="font-medium text-gray-900">
							{student.firstName} {student.lastName}
						</p>
						{#if prefs.length > 0}
							<p class="mt-1 text-xs text-gray-500">
								→ {prefs.join(', ')}
							</p>
						{:else}
							<p class="mt-1 text-xs text-gray-400">No preferences</p>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
</aside>
