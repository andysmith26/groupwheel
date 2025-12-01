<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Pool } from '$lib/domain/pool';
	import type { Preference } from '$lib/domain';
	import type { Student } from '$lib/types';

	export let pool: Pool;
	export let students: Student[];
	export let preferences: Preference[];
	export let expanded: boolean = false;

	const dispatch = createEventDispatcher<{ toggle: void }>();

	// Build a map of studentId -> preference for quick lookup
	$: preferencesByStudent = new Map(preferences.map((p) => [p.studentId, p]));

	// Build a map of studentId -> student for display names
	$: studentsById = new Map(students.map((s) => [s.id, s]));

	function getStudentName(studentId: string): string {
		const student = studentsById.get(studentId);
		if (!student) return studentId;
		return (
			student.displayName ||
			`${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
			studentId
		);
	}

	function getFriendNames(pref: Preference): string[] {
		const likeIds = pref.payload?.likeStudentIds ?? [];
		return likeIds.map((id) => getStudentName(id));
	}

	function handleClick() {
		dispatch('toggle');
	}
</script>

<div class="overflow-hidden rounded-lg border bg-white shadow-sm">
	<button
		type="button"
		class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
		on:click={handleClick}
	>
		<div class="flex items-center gap-3">
			<span class="font-medium text-gray-900">{pool.name}</span>
			<span class="text-sm text-gray-500">({pool.memberIds.length} students)</span>
			{#if preferences.length > 0}
				<span
					class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
				>
					{preferences.length} preferences
				</span>
			{/if}
		</div>
		<svg
			class="h-5 w-5 text-gray-400 transition-transform duration-200"
			class:rotate-180={expanded}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if expanded}
		<div class="border-t bg-gray-50 px-4 py-3">
			{#if students.length === 0}
				<p class="text-sm text-gray-500 italic">No student data loaded</p>
			{:else}
				<div class="space-y-1">
					<div
						class="flex items-center justify-between border-b pb-2 text-xs font-medium tracking-wide text-gray-500 uppercase"
					>
						<span>Student</span>
						<span>Friend Preferences</span>
					</div>

					<div class="max-h-64 space-y-1 overflow-y-auto">
						{#each pool.memberIds as memberId (memberId)}
							{@const student = studentsById.get(memberId)}
							{@const pref = preferencesByStudent.get(memberId)}
							<div
								class="-mx-1 flex items-start justify-between rounded px-1 py-1.5 text-sm hover:bg-white"
							>
								<span class="font-medium text-gray-800">
									{#if student}
										{student.displayName ||
											`${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
											memberId}
									{:else}
										{memberId}
									{/if}
								</span>
								<span class="max-w-[60%] text-right text-gray-500">
									{#if pref && pref.payload?.likeStudentIds?.length > 0}
										{getFriendNames(pref).join(', ')}
									{:else}
										<span class="text-gray-400 italic">No preferences</span>
									{/if}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-3 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
					<span>{students.length} students in pool</span>
					<span>
						{preferences.length} with preferences ({Math.round(
							(preferences.length / pool.memberIds.length) * 100
						)}%)
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
