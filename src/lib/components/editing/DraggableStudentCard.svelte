<script lang="ts">
	import type { Student } from '$lib/domain';
	import { draggable } from '$lib/utils/pragmatic-dnd';

	const {
		student,
		container,
		selected = false,
		isDragging = false,
		onSelect,
		onDragStart,
		onDragEnd,
		flash = false
	} = $props<{
		student: Student;
		container: string;
		selected?: boolean;
		isDragging?: boolean;
		onSelect?: (id: string) => void;
		onDragStart?: () => void;
		onDragEnd?: () => void;
		flash?: boolean;
	}>();

	const name = `${student.firstName} ${student.lastName ?? ''}`.trim() || student.id;
</script>

<div
	use:draggable={{
		container,
		dragData: { id: student.id },
		callbacks: { onDragStart, onDragEnd }
	}}
	class={`rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition duration-150 ease-out ${
		selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
	} ${isDragging ? 'opacity-60' : ''} ${flash ? 'flash-move' : ''}`}
	onclick={() => onSelect?.(student.id)}
>
	<div class="flex items-center justify-between">
		<span class="font-medium text-gray-900">{name}</span>
	</div>
</div>
