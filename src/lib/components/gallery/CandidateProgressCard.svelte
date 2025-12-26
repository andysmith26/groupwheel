<script lang="ts">
	const {
		label,
		algorithmLabel,
		onInfo
	} = $props<{
		label: string;
		algorithmLabel: string;
		onInfo?: () => void;
	}>();
</script>

<div class="flex h-full w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
	<div class="flex items-center justify-between">
		<div>
			<div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
			<div class="text-lg font-semibold text-slate-900">Generating groups...</div>
		</div>
		<div class="flex items-center gap-1 text-xs">
			<div class="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
				{algorithmLabel}
			</div>
			<button
				type="button"
				class="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
				aria-label={`About ${algorithmLabel}`}
				onclick={onInfo}
			>
				?
			</button>
		</div>
	</div>

	<div class="space-y-2">
		<div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
			<div class="h-full w-2/3 animate-pulse rounded-full bg-slate-400"></div>
		</div>
		<p class="text-xs text-slate-500">Optimizing this option. Results will appear soon.</p>
	</div>
</div>
