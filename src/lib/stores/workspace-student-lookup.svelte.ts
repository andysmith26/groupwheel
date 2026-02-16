import type { Student, StudentPreference } from '$lib/domain';
import type { WorkspaceTooltipController } from '$lib/stores/workspace-tooltip-controller.svelte';
import type { WorkspaceSidebarController } from '$lib/stores/workspace-sidebar-controller.svelte';

export interface WorkspaceStudentLookupDeps {
	getTooltipController: () => WorkspaceTooltipController;
	getSidebarController: () => WorkspaceSidebarController;
	getStudentsById: () => Record<string, Student>;
	getPreferenceMap: () => Record<string, StudentPreference>;
	getStudentRecentGroupmates: () => Map<string, Array<{ studentName: string; count: number }>>;
	getDraggingId: () => string | null;
}

export function createWorkspaceStudentLookup(deps: WorkspaceStudentLookupDeps) {
	// --- Tooltip data ---
	let tooltipStudent = $derived.by(() => {
		const tc = deps.getTooltipController();
		return tc.state.studentId
			? (deps.getStudentsById()[tc.state.studentId] ?? null)
			: null;
	});

	let tooltipPreferences = $derived.by(() => {
		const tc = deps.getTooltipController();
		return tc.state.studentId
			? (deps.getPreferenceMap()[tc.state.studentId] ?? null)
			: null;
	});

	let tooltipRecentGroupmates = $derived.by(() => {
		const tc = deps.getTooltipController();
		return tc.state.studentId
			? (deps.getStudentRecentGroupmates().get(tc.state.studentId) ?? [])
			: [];
	});

	// --- Sidebar data ---
	let sidebarStudent = $derived.by(() => {
		const sc = deps.getSidebarController();
		return sc.state.studentId
			? (deps.getStudentsById()[sc.state.studentId] ?? null)
			: null;
	});

	let sidebarPreferences = $derived.by(() => {
		const sc = deps.getSidebarController();
		return sc.state.studentId
			? (deps.getPreferenceMap()[sc.state.studentId] ?? null)
			: null;
	});

	let sidebarRecentGroupmates = $derived.by(() => {
		const sc = deps.getSidebarController();
		return sc.state.studentId
			? (deps.getStudentRecentGroupmates().get(sc.state.studentId) ?? [])
			: [];
	});

	// --- Handlers ---
	function handleTooltipShow(studentId: string, x: number, y: number) {
		if (deps.getDraggingId()) return;
		deps.getTooltipController().actions.show(studentId, x, y);
	}

	function handleTooltipHide() {
		deps.getTooltipController().actions.hide();
	}

	function handleDragEnd() {
		deps.getTooltipController().actions.startDragCooldown(150);
	}

	function handleStudentClick(studentId: string) {
		deps.getSidebarController().actions.toggle(studentId);
		deps.getTooltipController().actions.hide();
	}

	return {
		get tooltipStudent() {
			return tooltipStudent;
		},
		get tooltipPreferences() {
			return tooltipPreferences;
		},
		get tooltipRecentGroupmates() {
			return tooltipRecentGroupmates;
		},
		get sidebarStudent() {
			return sidebarStudent;
		},
		get sidebarPreferences() {
			return sidebarPreferences;
		},
		get sidebarRecentGroupmates() {
			return sidebarRecentGroupmates;
		},
		handleTooltipShow,
		handleTooltipHide,
		handleDragEnd,
		handleStudentClick
	};
}
