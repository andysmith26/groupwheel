<script lang="ts">
	import type { ActivityDisplay } from '$lib/services/appEnvUseCases';
	import type { Program } from '$lib/domain';

	interface Props {
		activity: ActivityDisplay;
		now: Date;
		onMakeGroups: (programId: string) => void;
		onRename: (activity: ActivityDisplay) => void;
		onDelete: (activity: ActivityDisplay) => void;
		openMenuId: string | null;
		onToggleMenu: (id: string, e: MouseEvent) => void;
	}

	let {
		activity,
		now,
		onMakeGroups,
		onRename,
		onDelete,
		openMenuId,
		onToggleMenu
	}: Props = $props();

	function formatRelativeDate(date: Date, reference: Date): string {
		const diffMs = date.getTime() - reference.getTime();
		const diffMinutes = Math.round(Math.abs(diffMs) / 60_000);
		const isFuture = diffMs > 0;

		if (diffMinutes < 1) return 'just now';
		if (diffMinutes < 60) {
			const label = `${diffMinutes}m`;
			return isFuture ? `in ${label}` : `${label} ago`;
		}
		const diffHours = Math.round(diffMinutes / 60);
		if (diffHours < 24) {
			const label = `${diffHours}h`;
			return isFuture ? `in ${label}` : `${label} ago`;
		}
		const diffDays = Math.round(diffHours / 24);
		const label = `${diffDays}d`;
		return isFuture ? `in ${label}` : `${label} ago`;
	}

	function parseDateLabel(label: string): Date | null {
		const trimmed = label.trim();
		const looksNumericDate =
			/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed);
		if (!looksNumericDate) return null;
		const parsed = new Date(trimmed);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function getProgramTimeLabel(program: Program): string {
		if ('termLabel' in program.timeSpan) {
			const parsed = parseDateLabel(program.timeSpan.termLabel);
			return parsed ? formatRelativeDate(parsed, now) : program.timeSpan.termLabel;
		}
		if ('start' in program.timeSpan && program.timeSpan.start) {
			return formatRelativeDate(program.timeSpan.start, now);
		}
		return '';
	}

	function getStatusInfo(act: ActivityDisplay): {
		label: string;
		dotClass: string;
	} | null {
		if (act.activeSession) {
			return { label: 'Live', dotClass: 'bg-green-500' };
		}
		if (act.hasScenario) {
			return null;
		}
		return { label: 'Draft', dotClass: 'bg-gray-400' };
	}

	function getStudentCountLabel(count: number): string {
		if (count === 0) return 'No students yet';
		if (count === 1) return '1 student';
		return `${count} students`;
	}

	let status = $derived(getStatusInfo(activity));
	let timeLabel = $derived(getProgramTimeLabel(activity.program));
	let studentLabel = $derived(getStudentCountLabel(activity.studentCount));
	let isMenuOpen = $derived(openMenuId === activity.program.id);
</script>

<!-- Entire card is a single link to the activity -->
<a
	href="/activity/{activity.program.id}"
	class="relative block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-teal/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
>
	<!-- Top row: name + actions -->
	<div class="flex items-start gap-3">
		<div class="min-w-0 flex-1">
			<h3 class="truncate text-base font-semibold text-gray-900">
				{activity.program.name}
			</h3>

			<!-- Metadata row -->
			<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
				<span>{studentLabel}</span>
				{#if timeLabel}
					<span class="text-gray-300" aria-hidden="true">&middot;</span>
					<span>{timeLabel}</span>
				{/if}
				{#if status}
					<span class="text-gray-300" aria-hidden="true">&middot;</span>
					<span class="inline-flex items-center gap-1.5">
						<span class="inline-block h-2 w-2 rounded-full {status.dotClass}" aria-hidden="true"></span>
						{status.label}
					</span>
				{/if}
			</div>
		</div>

		<!-- Action buttons (stop propagation so they don't trigger card navigation) -->
		<div class="flex flex-shrink-0 items-center gap-1">
			<!-- Make Groups shortcut -->
			<button
				type="button"
				class="rounded-lg p-2 text-teal transition-colors hover:bg-teal-light hover:text-teal-dark"
				aria-label="Make groups for {activity.program.name}"
				title="Make Groups"
				onclick={(e) => { e.preventDefault(); e.stopPropagation(); onMakeGroups(activity.program.id); }}
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
				</svg>
			</button>

			<!-- Overflow menu -->
			<div class="overflow-menu relative">
				<button
					type="button"
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
					aria-label="More options for {activity.program.name}"
					onclick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleMenu(activity.program.id, e); }}
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
					</svg>
				</button>

				{#if isMenuOpen}
					<div class="absolute right-0 z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
							onclick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(activity); }}
						>
							Rename
						</button>
						<hr class="my-1 border-gray-100" />
						<button
							type="button"
							class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
							onclick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(activity); }}
						>
							Delete
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</a>
