<script lang="ts">
	/**
	 * /activities/[id]/live/+page.svelte
	 *
	 * Live Mode - Merged present + observe view.
	 * Two tabs:
	 * - Student View: clean projection mode (search + all-groups grid)
	 * - Teacher View: observation cards with sentiment buttons + notes (iPad-optimized)
	 *
	 * "Done" archives the active session and returns to workspace.
	 * Works without an active session as a read-only preview.
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import type { Program, Scenario, Student, Observation, Session } from '$lib/domain';
	import type { ObservationSentiment } from '$lib/domain/observation';
	import { buildAssignmentList } from '$lib/utils/csvExport';
	import {
		getStudentActivityView,
		getActiveSession,
		createObservation,
		listObservationsBySession,
		listObservationsByProgram,
		endSession,
		deleteDemoActivity
	} from '$lib/services/appEnvUseCases';
	import { isErr, isOk } from '$lib/types/result';
	import StudentView from '$lib/components/live/StudentView.svelte';
	import TeacherView from '$lib/components/live/TeacherView.svelte';
	import SessionTimer from '$lib/components/live/SessionTimer.svelte';
	import DemoGuidedOverlay from '$lib/components/onboarding/DemoGuidedOverlay.svelte';

	// --- Environment ---
	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);

	// --- Data ---
	let program = $state<Program | null>(null);
	let scenario = $state<Scenario | null>(null);
	let students = $state<Student[]>([]);
	let activeSession = $state<Session | null>(null);
	let observations = $state<Observation[]>([]);

	// --- Loading states ---
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let isEnding = $state(false);

	// --- Tab state (default to Student View for projection-first) ---
	let activeTab = $state<'student' | 'teacher'>('student');

	// --- Demo overlay state ---
	let showDemoOverlay = $state(false);
	let isDemoActivity = $derived(program !== null && program.name.startsWith('Demo: '));

	// --- Projection mode ---
	let isProjecting = $state(false);

	async function enterProjectionMode() {
		try {
			await document.documentElement.requestFullscreen();
			isProjecting = true;
		} catch {
			// Fullscreen denied (e.g., iframe restriction, user denied) — fall back to CSS-only mode
			isProjecting = true;
		}
	}

	function exitProjectionMode() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		}
		isProjecting = false;
	}

	function handleFullscreenChange() {
		if (!document.fullscreenElement && isProjecting) {
			isProjecting = false;
		}
	}

	// --- Keyboard handler cleanup ---
	let keyboardCleanup: (() => void) | null = null;

	// --- Derived ---
	let studentsById = $derived(new Map(students.map((s) => [s.id, s])));

	let assignments = $derived.by(() => {
		if (!scenario) return [];
		return buildAssignmentList(scenario.groups, studentsById);
	});

	let membersByGroup = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const a of assignments) {
			if (!map.has(a.groupId)) {
				map.set(a.groupId, []);
			}
			map.get(a.groupId)!.push(a.studentName);
		}
		return map;
	});

	let groupedAssignments = $derived.by(() => {
		const groups = new Map<string, typeof assignments>();
		for (const assignment of assignments) {
			if (!groups.has(assignment.groupName)) {
				groups.set(assignment.groupName, []);
			}
			groups.get(assignment.groupName)!.push(assignment);
		}
		return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	});

	onMount(async () => {
		env = getAppEnvContext();

		// ESC key returns to workspace (unless projecting — browser handles ESC → exitFullscreen)
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				if (isProjecting) {
					// Browser already exits fullscreen on ESC; fullscreenchange listener updates state
					return;
				}
				handleDone();
			}
		}
		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		keyboardCleanup = () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};

		await loadData();
	});

	onDestroy(() => {
		keyboardCleanup?.();
	});

	async function loadData() {
		if (!env) return;

		loading = true;
		loadError = null;

		const programId = $page.params.id;
		if (!programId) {
			loadError = 'No activity ID provided';
			loading = false;
			return;
		}

		// Load view data (program, scenario, students)
		const result = await getStudentActivityView(env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				loadError = 'Activity not found';
			} else if (result.error.type === 'SCENARIO_NOT_FOUND') {
				loadError = 'Groups have not been created yet';
			} else {
				loadError = result.error.message;
			}
			loading = false;
			return;
		}

		const data = result.value;
		program = data.program;
		scenario = data.scenario;
		students = data.students;

		loading = false;

		// Check for active session
		const sessionResult = await getActiveSession(env, { programId });
		if (isOk(sessionResult) && sessionResult.value) {
			activeSession = sessionResult.value;
		}

		// Load observations
		await loadObservations();

		// Show demo overlay on first visit
		if (program && program.name.startsWith('Demo: ')) {
			const overlayKey = `demo-overlay-completed-${program.id}`;
			if (localStorage.getItem(overlayKey) !== 'true') {
				showDemoOverlay = true;
			}
		}
	}

	async function loadObservations() {
		if (!env || !program) return;

		if (activeSession) {
			// Load observations for the active session
			const result = await listObservationsBySession(env, {
				sessionId: activeSession.id
			});
			if (isOk(result)) {
				observations = result.value.observations;
			}
		} else {
			// Fallback: load all program observations
			const result = await listObservationsByProgram(env, { programId: program.id });
			if (isOk(result)) {
				observations = result.value.observations;
			}
		}
	}

	async function handleSentiment(
		groupId: string,
		groupName: string,
		sentiment: ObservationSentiment
	) {
		if (!env || !program) return;

		const result = await createObservation(env, {
			programId: program.id,
			sessionId: activeSession?.id,
			groupId,
			groupName,
			sentiment
		});

		if (isOk(result)) {
			observations = [...observations, result.value];
		}
	}

	async function handleNote(groupId: string, groupName: string, note: string) {
		if (!env || !program) return;

		const result = await createObservation(env, {
			programId: program.id,
			sessionId: activeSession?.id,
			groupId,
			groupName,
			content: note
		});

		if (isOk(result)) {
			observations = [...observations, result.value];
		}
	}

	async function handleDone() {
		if (!env || !program || isEnding) return;
		isEnding = true;

		if (activeSession) {
			await endSession(env, { programId: program.id });
		}

		goto(`/activities/${program.id}/workspace`);
	}

	async function handleDeleteDemoFromOverlay() {
		if (!env || !program) return;
		await deleteDemoActivity(env, program.id);
		goto('/activities?dashboard');
	}
</script>

<svelte:head>
	<title>{program?.name ?? 'Live'} | Groupwheel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if loading}
		<div class="flex min-h-screen items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if loadError}
		<div class="mx-auto max-w-lg p-8">
			<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
				<p class="text-red-700">{loadError}</p>
				<a href="/activities" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
					← Back to activities
				</a>
			</div>
		</div>
	{:else if program && scenario}
		<!-- Header -->
		<header class="border-b-2 border-gray-300 bg-white">
			<div class="mx-auto max-w-6xl px-6 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<h1 class="text-3xl font-bold text-gray-900">{program.name}</h1>
						{#if activeSession}
							<span class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
								<span class="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
								<span class="text-sm font-medium text-green-700">Live</span>
							</span>
						{/if}
					</div>
					<button
						type="button"
						onclick={handleDone}
						disabled={isEnding}
						class="rounded-lg bg-gray-800 px-6 py-3 text-lg font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
					>
						{isEnding ? 'Ending...' : 'Done'}
					</button>
				</div>

				<!-- Tabs -->
				<div class="mt-4 flex items-center gap-2">
					<button
						type="button"
						class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {activeTab === 'student'
							? 'bg-teal text-white'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						onclick={() => (activeTab = 'student')}
					>
						Student View
					</button>
					<button
						type="button"
						class="rounded-lg px-6 py-3 text-xl font-semibold transition-colors {activeTab === 'teacher'
							? 'bg-teal text-white'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						onclick={() => (activeTab = 'teacher')}
					>
						Teacher View
					</button>

					{#if activeTab === 'student'}
						<button
							type="button"
							class="ml-auto flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
							onclick={enterProjectionMode}
							title="Full-screen projection mode"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
							</svg>
							Project
						</button>
					{/if}
				</div>
			</div>
		</header>

		<!-- Timer: rendered outside tab content so it persists across tab switches -->
		{#if activeSession}
			<div class="fixed top-24 right-6 z-30">
				<SessionTimer />
			</div>
		{/if}

		<!-- Content -->
		<main class="mx-auto max-w-6xl px-6 py-8">
			{#if activeTab === 'student'}
				<StudentView
					{groupedAssignments}
					{membersByGroup}
					allAssignments={assignments}
				/>
			{:else}
				<TeacherView
					{groupedAssignments}
					{observations}
					{activeSession}
					onSentiment={handleSentiment}
					onNote={handleNote}
				/>
			{/if}
		</main>

		<!-- Projection mode overlay -->
		{#if isProjecting}
			<div class="fixed inset-0 z-50 overflow-auto bg-white">
				<!-- Exit button (invisible by default, appears on hover) -->
				<button
					type="button"
					class="fixed top-4 right-4 z-50 rounded-full bg-black/10 p-2 text-gray-500 opacity-0 transition-opacity hover:opacity-100"
					onclick={exitProjectionMode}
					title="Exit projection mode (ESC)"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				<!-- Activity name header -->
				<div class="px-8 pt-6 pb-4">
					<h1 class="text-4xl font-bold text-gray-900">{program?.name}</h1>
				</div>

				<!-- Projected StudentView -->
				<div class="px-8 pb-8">
					<StudentView {groupedAssignments} {membersByGroup} allAssignments={assignments} projectionMode={true} />
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Demo guided overlay -->
{#if showDemoOverlay && program}
	<DemoGuidedOverlay
		programId={program.id}
		onDismiss={() => { showDemoOverlay = false; }}
		onDeleteDemo={handleDeleteDemoFromOverlay}
	/>
{/if}
