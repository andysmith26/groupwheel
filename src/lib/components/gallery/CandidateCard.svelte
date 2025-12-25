<script lang="ts">
	import type { CandidateGrouping } from '$lib/application/useCases/generateMultipleCandidates';
	import type { Student } from '$lib/domain';

	const {
		candidate,
		studentsById,
		label,
		isSelected = false,
		disabled = false,
		onSelect
	} = $props<{
		candidate: CandidateGrouping;
		studentsById: Record<string, Student>;
		label?: string;
		isSelected?: boolean;
		disabled?: boolean;
		onSelect?: (candidate: CandidateGrouping) => void;
	}>();

	const groupSizeSummary = $derived.by(() => {
		const counts = new Map<number, number>();
		for (const group of candidate.groups) {
			const size = group.memberIds.length;
			counts.set(size, (counts.get(size) ?? 0) + 1);
		}

		return Array.from(counts.entries())
			.sort(([a], [b]) => a - b)
			.map(([size, count]) => `${size}x${count}`)
			.join(', ');
	});

	const formattedTopChoice = $derived.by(() =>
		`${Math.round(candidate.analytics.percentAssignedTopChoice)}%`
	);

	const formattedAverageRank = $derived.by(() => {
		const value = candidate.analytics.averagePreferenceRankAssigned;
		if (Number.isNaN(value)) return 'N/A';
		return value.toFixed(1);
	});

	function getSortKey(studentId: string) {
		const student = studentsById[studentId];
		const lastName = student?.lastName?.trim().toLowerCase() ?? '';
		const firstName = student?.firstName?.trim().toLowerCase() ?? '';
		const id = studentId.toLowerCase();
		return { lastName, firstName, id };
	}

	function getStudentName(studentId: string): string {
		const student = studentsById[studentId];
		if (!student) return studentId;
		return `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
	}

	function getSortedMemberNames(memberIds: string[]): string[] {
		return [...memberIds]
			.sort((a, b) => {
				const left = getSortKey(a);
				const right = getSortKey(b);
				if (left.lastName !== right.lastName) {
					return left.lastName.localeCompare(right.lastName);
				}
				if (left.firstName !== right.firstName) {
					return left.firstName.localeCompare(right.firstName);
				}
				return left.id.localeCompare(right.id);
			})
			.map(getStudentName);
	}
</script>

<button
	type="button"
	disabled={disabled}
	class={`group flex h-full w-full flex-col gap-4 rounded-xl border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
		disabled
			? 'cursor-not-allowed border-slate-100 opacity-70'
			: 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
	} ${isSelected ? 'border-slate-900 ring-2 ring-slate-300' : 'border-slate-200'}
	}`}
	onclick={() => {
		if (disabled) return;
		onSelect?.(candidate);
	}}
>
	<div class="flex items-center justify-between">
		<div>
			<div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
			<div class="text-lg font-semibold text-slate-900">{candidate.groups.length} groups</div>
		</div>
		<div class="flex flex-col items-end gap-1 text-xs">
			<div class="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
			{groupSizeSummary || 'Sizing TBD'}
			</div>
			{#if candidate.algorithmLabel}
				<div class="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
					{candidate.algorithmLabel}
				</div>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3 text-sm">
		<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
			<div class="text-xs font-semibold uppercase text-slate-500">Top Choice</div>
			<div class="text-base font-semibold text-slate-900">{formattedTopChoice}</div>
		</div>
		<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
			<div class="text-xs font-semibold uppercase text-slate-500">Avg Rank</div>
			<div class="text-base font-semibold text-slate-900">{formattedAverageRank}</div>
		</div>
	</div>

	<div class="rounded-lg border border-slate-200 bg-white p-3">
		<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Group Preview</div>
		<div class="mt-2 max-h-56 overflow-auto pr-1">
			<div class="grid grid-cols-2 gap-3 text-xs leading-snug text-slate-700">
				{#each candidate.groups as group}
					<div class="rounded-md border border-slate-100 bg-slate-50/60 p-2">
						<div class="font-semibold text-slate-800">{group.name}</div>
						<div class="mt-1 text-slate-600">
							{#if group.memberIds.length === 0}
								<span class="italic text-slate-400">No students assigned</span>
							{:else}
								<ul class="columns-2 gap-2 text-[11px] leading-snug">
									{#each getSortedMemberNames(group.memberIds) as member}
										<li class="break-inside-avoid">{member}</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</button>
