<script lang="ts">
	import { getDisplayName } from '$lib/utils/friends';
	import type { Student } from '$lib/types';

	interface Props {
		unhappyStudents: Array<{
			id: string;
			student: Student;
			happiness: number;
			groupName: string;
		}>;
		onStudentClick: (studentId: string) => void;
	}

	let { unhappyStudents, onStudentClick }: Props = $props();
</script>

{#if unhappyStudents.length > 0}
	<div
		class="rounded-lg border-2 border-amber-300 bg-amber-50 p-4"
		role="region"
		aria-label="Students needing attention"
	>
		<div class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
			<span aria-hidden="true">📊</span>
			<span>Students Needing Attention ({unhappyStudents.length})</span>
		</div>

		<div class="flex flex-wrap gap-2">
			{#each unhappyStudents as item (item.id)}
				<button
					type="button"
					class="student-chip"
					data-score={item.happiness}
					onclick={() => onStudentClick(item.id)}
					aria-label="View details for {getDisplayName(
						item.student
					)}, {item.happiness} friend{item.happiness === 1 ? '' : 's'} in group"
				>
					<span class="happiness-badge" data-score={item.happiness}>
						{item.happiness}
					</span>
					<span class="font-medium">{getDisplayName(item.student)}</span>
					<span class="text-xs text-gray-500">· {item.groupName}</span>
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
		<div class="flex items-center gap-2 text-sm font-medium text-green-700">
			<span aria-hidden="true">✓</span>
			<span>All students have 2+ friends in their group</span>
		</div>
	</div>
{/if}

<style>
	.student-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		font-size: 14px;
		color: #1f2937;
		background: white;
		border: 1px solid #fcd34d;
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.student-chip:hover {
		background: #fef3c7;
		border-color: #fbbf24;
	}

	.student-chip:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px #f59e0b;
	}

	.happiness-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 9999px;
		font-size: 12px;
		font-weight: 700;
	}

	.happiness-badge[data-score='0'] {
		background: #fee2e2;
		color: #b91c1c;
	}

	.happiness-badge[data-score='1'] {
		background: #fed7aa;
		color: #c2410c;
	}
</style>
