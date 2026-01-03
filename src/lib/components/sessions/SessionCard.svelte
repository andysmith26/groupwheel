<script lang="ts">
	import type { Session, SessionStatus } from '$lib/domain';

	const { session } = $props<{
		session: Session;
	}>();

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatDateRange(start: Date, end: Date): string {
		const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		return `${startStr} - ${endStr}`;
	}

	function getStatusBadgeClass(status: SessionStatus): string {
		switch (status) {
			case 'PUBLISHED':
				return 'bg-green-100 text-green-700';
			case 'ARCHIVED':
				return 'bg-gray-100 text-gray-600';
			case 'DRAFT':
			default:
				return 'bg-yellow-100 text-yellow-700';
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<div class="flex items-start justify-between">
		<div class="min-w-0 flex-1">
			<h3 class="font-medium text-gray-900">{session.name}</h3>
			<p class="mt-1 text-sm text-gray-500">{session.academicYear}</p>
		</div>
		<span class={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
			{session.status.toLowerCase()}
		</span>
	</div>

	<div class="mt-3 text-sm text-gray-500">
		<p>{formatDateRange(session.startDate, session.endDate)}</p>
	</div>

	{#if session.publishedAt}
		<div class="mt-2 text-xs text-gray-400">
			Published {formatDate(session.publishedAt)}
		</div>
	{/if}
</div>
