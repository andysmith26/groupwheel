<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ScenarioEditingStore } from '$lib/application/stores/ScenarioEditingStore.svelte';
	import type { Group, Preference, Scenario, Student } from '$lib/domain';
	import { getAppEnvContext } from '$lib/contexts/appEnv';
	import { buildPreferenceMap } from '$lib/utils/preferenceAdapter';
import EditingToolbar from '$lib/components/editing/EditingToolbar.svelte';
import AnalyticsPanel from '$lib/components/editing/AnalyticsPanel.svelte';
import UnassignedArea from '$lib/components/editing/UnassignedArea.svelte';
import GroupEditingLayout from '$lib/components/editing/GroupEditingLayout.svelte';
import ConfirmDialog from '$lib/components/editing/ConfirmDialog.svelte';
import type { ScenarioEditingView } from '$lib/application/stores/ScenarioEditingStore.svelte';

	const { scenarioId } = $props<{ scenarioId: string }>();

	let env: ReturnType<typeof getAppEnvContext> | null = $state(null);
	let loading = $state(true);
	let loadError = $state('');
let scenario: Scenario | null = $state(null);
let studentsById = $state<Record<string, Student>>({});
let preferences: Preference[] = $state([]);
let editingStore: ScenarioEditingStore | null = $state(null);
let view = $state<ScenarioEditingView | null>(null);
	let analyticsOpen = $state(false);
	let selectedStudentId = $state<string | null>(null);
	let draggingId = $state<string | null>(null);
	let flashingIds = $state<Set<string>>(new Set());
	let toastMessage = $state('');
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;
	let friendIds = $derived(() => {
		if (!selectedStudentId) return new Set<string>();
		const pref = preferenceMap[selectedStudentId];
		return new Set(pref?.likeStudentIds ?? []);
	});

	let preferenceMap: Record<string, import('$lib/domain').StudentPreference> = $state({});
	let showRegenerateConfirm = $state(false);

	onMount(async () => {
		env = getAppEnvContext();
		await loadScenario();
	});

	async function loadScenario() {
		if (!env) return;

		loading = true;
		loadError = '';

		try {
			const fetched = await env.scenarioRepo.getById(scenarioId);
			if (!fetched) {
				goto('/groups/new');
				return;
			}
			if (fetched.status === 'ADOPTED') {
				goto(`/groups/${fetched.programId}`);
				return;
			}

			const studentList = await env.studentRepo.getByIds(fetched.participantSnapshot);
			const prefs = await env.preferenceRepo.listByProgramId(fetched.programId);

			const studentsMap: Record<string, Student> = {};
			for (const student of studentList) {
				studentsMap[student.id] = student;
			}

			preferenceMap = buildPreferenceMap(prefs);
			studentsById = studentsMap;
			preferences = prefs;
			scenario = fetched;

			editingStore = new ScenarioEditingStore({ scenarioRepo: env.scenarioRepo });
			editingStore.initialize(fetched, prefs);
			editingStore.subscribe((value) => {
				view = value;
			});
		} catch (e) {
			loadError =
				e instanceof Error ? e.message : 'Unable to load scenario for editing. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleDrop(payload: { studentId: string; source: string; target: string }) {
		if (!editingStore) return;

		// Normalize source based on current state to avoid stale container IDs.
		const currentSourceGroup = view?.groups.find((g) => g.memberIds.includes(payload.studentId));
		const normalizedSource = currentSourceGroup ? currentSourceGroup.id : 'unassigned';
		const normalizedPayload = { ...payload, source: normalizedSource };

		const result = editingStore.dispatch({
			type: 'MOVE_STUDENT',
			studentId: normalizedPayload.studentId,
			source: normalizedPayload.source,
			target: normalizedPayload.target
		});
		if (!result.success) {
			const message =
				result.reason === 'target_full'
					? 'Group is at capacity'
					: 'Move not allowed';
			showToast(message);
		}
		if (result.success) {
			flashStudent(normalizedPayload.studentId);
		}
	}

	function metricSummary(): string {
		if (!view?.currentAnalytics) return '';
		const top = Math.round(view.currentAnalytics.percentAssignedTopChoice);
		if (view.analyticsDelta?.topChoice === undefined) return `${top}% top choice`;
		const delta = Math.round(view.analyticsDelta.topChoice);
		const arrow = delta >= 0 ? '↑' : '↓';
		return `${top}% top choice (${arrow}${Math.abs(delta)}%)`;
	}

	function selectStudent(id: string) {
		selectedStudentId = selectedStudentId === id ? null : id;
	}

	function handleDragStart(id: string) {
		draggingId = id;
	}

	function handleDragEnd() {
		draggingId = null;
	}

	function flashStudent(id: string) {
		flashingIds = new Set([id]);
		setTimeout(() => {
			flashingIds = new Set();
		}, 500);
	}

	function showToast(message: string) {
		toastMessage = message;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = '';
			toastTimeout = null;
		}, 2000);
	}

	async function handleRegenerate() {
		if (!env || !scenario || !editingStore) return;
		showRegenerateConfirm = false;
		const result = await env.groupingAlgorithm.generateGroups({
			programId: scenario.programId,
			studentIds: scenario.participantSnapshot,
			algorithmConfig: scenario.algorithmConfig
		});

		if (!result.success) {
			loadError = result.message ?? 'Regeneration failed';
			return;
		}

		const groups: Group[] = result.groups.map((g) => ({
			id: g.id,
			name: g.name,
			capacity: g.capacity,
			memberIds: g.memberIds
		}));

		await editingStore.regenerate(groups);
	}

	async function handleAdopt() {
		if (!editingStore || !scenario) return;
		const outcome = await editingStore.adopt();
		if (outcome.success) {
			goto(`/groups/${scenario.programId}`);
		} else if (outcome.reason === 'save_failed') {
			loadError = 'Save failed. Please retry.';
		}
	}

	function handleExit() {
		if (!scenario) return;
		goto(`/groups/${scenario.programId}`);
	}
</script>

{#if loading}
	<div class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
		Loading scenario…
	</div>
{:else if loadError}
	<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
{:else if scenario && editingStore && view}
	<div class="space-y-4">
		<EditingToolbar
			canUndo={view.canUndo}
			canRedo={view.canRedo}
			saveStatus={view.saveStatus}
			metricSummary={metricSummary()}
			analyticsOpen={analyticsOpen}
			adoptDisabled={!view.canAdopt}
			onUndo={() => editingStore?.undo()}
			onRedo={() => editingStore?.redo()}
			onRegenerate={() => (showRegenerateConfirm = true)}
			onExit={handleExit}
			onAdopt={handleAdopt}
			onToggleAnalytics={() => (analyticsOpen = !analyticsOpen)}
			onRetrySave={() => editingStore?.retrySave()}
		/>

		<AnalyticsPanel open={analyticsOpen} baseline={view.baseline} current={view.currentAnalytics} delta={view.analyticsDelta} />

		<UnassignedArea
			studentsById={studentsById}
			unassignedIds={view.unassignedStudentIds}
			selectedStudentId={selectedStudentId}
			draggingId={draggingId}
			onDrop={handleDrop}
			friendIds={friendIds()}
			onSelect={selectStudent}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			flashingIds={flashingIds}
		/>

		<GroupEditingLayout
			groups={view.groups}
			studentsById={studentsById}
			selectedStudentId={selectedStudentId}
			draggingId={draggingId}
			onDrop={handleDrop}
			friendIds={friendIds()}
			onSelect={selectStudent}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			flashingIds={flashingIds}
		/>
	</div>

	<ConfirmDialog
		open={showRegenerateConfirm}
		title="Regenerate groups?"
		message="This will discard manual edits and create new groups. Continue?"
		confirmLabel="Regenerate"
		onConfirm={handleRegenerate}
		onCancel={() => (showRegenerateConfirm = false)}
	/>

	{#if toastMessage}
		<div class="fixed right-4 top-4 z-50 rounded-lg bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
			{toastMessage}
		</div>
	{/if}
{/if}
