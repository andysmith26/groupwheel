<script lang="ts">
	/**
	 * Candidate gallery for selecting a starting grouping.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Pool, Student, Scenario } from '$lib/domain';
	import type { CandidateGrouping } from '$lib/application/useCases/generateCandidate';
	import {
		generateCandidate,
		getActivityData,
		createScenarioFromCandidate
	} from '$lib/services/appEnvUseCases';
	import { isErr } from '$lib/types/result';
	import CandidateGallery from '$lib/components/gallery/CandidateGallery.svelte';
	import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
	import { candidateAlgorithmCatalog } from '$lib/application/algorithmCatalog';
	import {
		getCandidateConfig,
		setCandidateConfig,
		clearCandidateConfig
	} from '$lib/stores/candidateConfigStore';

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);
	let program = $state<Program | null>(null);
	let pool = $state<Pool | null>(null);
	let students = $state<Student[]>([]);
	let scenario = $state<Scenario | null>(null);
	type CandidateEntry =
		| { status: 'ready'; candidate: CandidateGrouping }
		| { status: 'pending'; id: string; algorithmId: string; algorithmLabel: string };

	let candidateEntries = $state<CandidateEntry[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let isGenerating = $state(false);
	let isSaving = $state(false);
	let selectedCandidateId = $state<string | null>(null);
	let pendingCandidate = $state<CandidateGrouping | null>(null);
	let showReplaceConfirm = $state(false);
	let candidateCount = $state(5);
	let algorithmConfig = $state<unknown | undefined>(undefined);

	let studentsById = $derived<Record<string, Student>>(
		Object.fromEntries(students.map((student) => [student.id, student]))
	);
	let hasScenario = $derived(!!scenario);
	let hasReadyCandidate = $derived(
		candidateEntries.some((entry) => entry.status === 'ready')
	);

	const minCandidates = 3;
	const maxCandidates = 8;

	onMount(async () => {
		env = getAppEnvContext();
		await loadActivity();
	});

	async function loadActivity() {
		if (!env) return;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided.';
			loading = false;
			return;
		}

		const result = await getActivityData(env, { programId });
		if (isErr(result)) {
			loadError = result.error.type === 'PROGRAM_NOT_FOUND'
				? `Activity not found: ${programId}`
				: result.error.message;
			loading = false;
			return;
		}

		const data = result.value;
		scenario = data.scenario;
		program = data.program;
		pool = data.pool;
		students = data.students;

		const storedConfig = getCandidateConfig(programId);
		if (storedConfig?.candidateCount) {
			candidateCount = clampCandidateCount(storedConfig.candidateCount);
		}
		algorithmConfig = scenario?.algorithmConfig ?? storedConfig?.algorithmConfig;

		candidateEntries = [];
		await generateOptions({ append: false });
		loading = false;
	}

	function clampCandidateCount(value: number): number {
		if (Number.isNaN(value)) return 5;
		return Math.min(maxCandidates, Math.max(minCandidates, Math.round(value)));
	}

	function updateCandidateCount(value: number) {
		candidateCount = clampCandidateCount(value);
		if (program) {
			setCandidateConfig(program.id, {
				algorithmConfig,
				candidateCount
			});
		}
	}

	function buildAlgorithmPlan(count: number) {
		const algorithms = candidateAlgorithmCatalog;
		const plan: typeof algorithms = [];
		let lastId: string | null = null;
		let pool = [...algorithms];

		function shufflePool() {
			pool = [...algorithms].sort(() => Math.random() - 0.5);
		}

		shufflePool();

		for (let i = 0; i < count; i++) {
			if (pool.length === 0) {
				shufflePool();
			}
			let next = pool.shift() ?? algorithms[0];
			if (next.id === lastId && pool.length > 0) {
				const alternate = pool.shift();
				if (alternate) {
					pool.push(next);
					next = alternate;
				}
			}
			plan.push(next);
			lastId = next.id;
		}

		return plan;
	}

	async function generateOptions({ append }: { append: boolean }) {
		const currentEnv = env;
		const currentProgram = program;
		if (!currentEnv || !currentProgram) return;

		isGenerating = true;
		loadError = null;

		if (!append) {
			candidateEntries = [];
		}

		const plan = buildAlgorithmPlan(candidateCount).map((algorithm) => ({
			...algorithm,
			pendingId: algorithm.isSlow ? currentEnv.idGenerator.generateId() : null
		}));

		const pendingEntries = plan
			.filter((algorithm) => algorithm.isSlow && algorithm.pendingId)
			.map((algorithm) => ({
				status: 'pending' as const,
				id: algorithm.pendingId!,
				algorithmId: algorithm.id,
				algorithmLabel: algorithm.label
			}));

		if (pendingEntries.length > 0) {
			candidateEntries = append ? [...candidateEntries, ...pendingEntries] : pendingEntries;
		}

		for (const algorithm of plan) {
			const seed = Date.now() + Math.floor(Math.random() * 10000);
			const result = await generateCandidate(currentEnv, {
				programId: currentProgram.id,
				algorithmId: algorithm.id,
				algorithmConfig,
				seed
			});

			if (isErr(result)) {
				loadError = result.error.type === 'GROUPING_ALGORITHM_FAILED'
					? result.error.message
					: 'Unable to generate candidate groupings.';
				if (algorithm.pendingId) {
					candidateEntries = candidateEntries.filter(
						(entry) => !(entry.status === 'pending' && entry.id === algorithm.pendingId)
					);
				}
				continue;
			}

			const candidate = result.value;
			if (algorithm.isSlow && algorithm.pendingId) {
				candidateEntries = candidateEntries.map((entry) =>
					entry.status === 'pending' && entry.id === algorithm.pendingId
						? { status: 'ready', candidate }
						: entry
				);
			} else {
				candidateEntries = [...candidateEntries, { status: 'ready', candidate }];
			}
		}
		isGenerating = false;
	}

	async function handleSelect(candidate: CandidateGrouping) {
		if (!env || !program || isSaving) return;

		if (scenario) {
			pendingCandidate = candidate;
			showReplaceConfirm = true;
			return;
		}

		await saveCandidate(candidate, false);
	}

	async function saveCandidate(candidate: CandidateGrouping, replaceExisting: boolean) {
		if (!env || !program || isSaving) return;
		selectedCandidateId = candidate.id;
		isSaving = true;

		const result = await createScenarioFromCandidate(env, {
			programId: program.id,
			groups: candidate.groups,
			algorithmConfig: candidate.algorithmConfig,
			replaceExisting
		});

		if (isErr(result)) {
			loadError = 'Unable to save this option. Please try another.';
			isSaving = false;
			return;
		}

		clearCandidateConfig(program.id);
		goto(`/groups/${program.id}`);
	}

	function handleReturnToEditing() {
		if (!program) return;
		goto(`/groups/${program.id}`);
	}

	function handleQuickStart() {
		const firstReady = candidateEntries.find((entry) => entry.status === 'ready');
		if (!firstReady || firstReady.status !== 'ready') return;
		handleSelect(firstReady.candidate);
	}

	function cancelReplace() {
		showReplaceConfirm = false;
		pendingCandidate = null;
	}

	async function confirmReplace() {
		if (!pendingCandidate) return;
		showReplaceConfirm = false;
		await saveCandidate(pendingCandidate, true);
		pendingCandidate = null;
	}
</script>

<svelte:head>
	<title>Candidate Groupings</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<div class="border-b border-slate-200 bg-white">
		<div class="mx-auto max-w-6xl px-6 py-6">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">New Activity</div>
					<h1 class="text-2xl font-semibold text-slate-900">
						Pick a starting grouping
					</h1>
					<p class="text-sm text-slate-600">
						Compare options and choose the one to edit in the workspace.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<label class="flex items-center gap-2 text-sm font-medium text-slate-700">
						<span>Options</span>
						<input
							type="number"
							class="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
							min={minCandidates}
							max={maxCandidates}
							value={candidateCount}
							oninput={(event) => {
								const target = event.currentTarget as HTMLInputElement;
								updateCandidateCount(Number(target.value));
							}}
						/>
					</label>
					<button
						type="button"
						class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={() => generateOptions({ append: true })}
						disabled={isGenerating || loading}
					>
						{isGenerating ? 'Generating...' : 'Generate more options'}
					</button>
					{#if hasScenario}
						<button
							type="button"
							class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							onclick={handleReturnToEditing}
							disabled={loading}
						>
							Return to editing
						</button>
					{:else}
						<button
							type="button"
							class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							onclick={handleQuickStart}
							disabled={!hasReadyCandidate || isSaving || loading}
						>
							Quick start with first option
						</button>
					{/if}
				</div>
			</div>
			{#if program && pool}
				<div class="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
					<span class="rounded-full bg-slate-100 px-3 py-1">{program.name}</span>
					<span class="rounded-full bg-slate-100 px-3 py-1">{pool.memberIds.length} students</span>
					{#if hasScenario}
						<span class="rounded-full bg-slate-100 px-3 py-1">
							Draft saved - return to editing anytime
						</span>
					{:else}
						<span class="rounded-full bg-slate-100 px-3 py-1">
							Click an option to continue
						</span>
					{/if}
				</div>
				{#if hasScenario}
					<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						Selecting a new option will replace your current edits.
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<main class="mx-auto max-w-6xl px-6 py-8">
		{#if loading}
			<div class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
				Loading candidate groupings...
			</div>
		{:else if loadError}
			<div class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
				{loadError}
			</div>
		{:else if candidateEntries.length === 0}
			<div class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
				No candidates yet. Generate options to continue.
			</div>
		{:else}
			<CandidateGallery
				entries={candidateEntries}
				{studentsById}
				selectedId={selectedCandidateId}
				onSelect={handleSelect}
			/>
		{/if}
	</main>

	<ConfirmDialog
		open={showReplaceConfirm}
		title="Replace current draft?"
		message="This will discard any edits you've made and start over with the selected option."
		confirmLabel="Replace draft"
		cancelLabel="Keep current"
		onConfirm={confirmReplace}
		onCancel={cancelReplace}
	/>
</div>
