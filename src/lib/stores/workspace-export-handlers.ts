import type { Group, Preference, Program, Scenario, Student } from '$lib/domain';
import type { ScenarioEditingView } from '$lib/stores/scenarioEditingStore';
import type { WorkspaceCommandRunner } from '$lib/stores/workspace-command-runner.svelte';
import type { AppEnvContext } from '$lib/contexts/appEnv';
import type { WorkspaceRowLayout } from '$lib/services/appEnvUseCases';
import {
	getWorkspaceGroupsDisplayOrder,
	prepareWorkspaceExport
} from '$lib/services/appEnvUseCases';
import {
	buildAssignmentList,
	exportToCSV,
	exportToTSV,
	exportGroupsToCSV
} from '$lib/utils/csvExport';
import {
	downloadActivityFile,
	downloadActivityScreenshot,
	generateExportFilename
} from '$lib/utils/activityFile';
import { err, ok } from '$lib/types/result';

export interface WorkspaceExportDeps {
	getView: () => ScenarioEditingView | null;
	getProgram: () => Program | null;
	getScenario: () => Scenario | null;
	getStudentsById: () => Record<string, Student>;
	getStudents: () => Student[];
	getPreferences: () => Preference[];
	getResolvedRowLayout: () => WorkspaceRowLayout | null;
	getEnv: () => AppEnvContext;
	commandRunner: WorkspaceCommandRunner;
	showToast: (message: string) => void;
}

export function createWorkspaceExportHandlers(deps: WorkspaceExportDeps) {
	function getGroupsInDisplayOrder(): Group[] {
		const view = deps.getView();
		if (!view) return [];
		const result = getWorkspaceGroupsDisplayOrder({
			groups: view.groups,
			rowLayout: deps.getResolvedRowLayout()
		});
		return result.status === 'ok' ? result.value.groups : view.groups;
	}

	async function runClipboardCommand(content: string, successMessage: string) {
		await deps.commandRunner.run({
			run: async () => {
				const success = await deps.getEnv()?.clipboard?.writeText(content);
				return success ? ok(undefined) : err('copy_failed' as const);
			},
			successMessage,
			errorMessage: 'Failed to copy'
		});
	}

	async function handleExportCSV() {
		const view = deps.getView();
		if (!view) return;
		const studentsMap = new Map(Object.entries(deps.getStudentsById()));
		const orderedGroups = getGroupsInDisplayOrder();
		const assignments = buildAssignmentList(orderedGroups, studentsMap);
		const csv = exportToCSV(assignments);
		await runClipboardCommand(csv, 'CSV copied to clipboard!');
	}

	async function handleExportTSV() {
		const view = deps.getView();
		if (!view) return;
		const studentsMap = new Map(Object.entries(deps.getStudentsById()));
		const orderedGroups = getGroupsInDisplayOrder();
		const assignments = buildAssignmentList(orderedGroups, studentsMap);
		const tsv = exportToTSV(assignments);
		await runClipboardCommand(tsv, 'Copied! Paste directly into Google Sheets');
	}

	async function handleExportGroupsSummary() {
		const view = deps.getView();
		if (!view) return;
		const studentsMap = new Map(Object.entries(deps.getStudentsById()));
		const orderedGroups = getGroupsInDisplayOrder();
		const csv = exportGroupsToCSV(orderedGroups, studentsMap);
		await runClipboardCommand(csv, 'Groups summary copied!');
	}

	async function handleExportGroupsColumns() {
		const program = deps.getProgram();
		const view = deps.getView();
		if (!program || !view) return;

		const result = prepareWorkspaceExport(deps.getEnv(), {
			program,
			students: deps.getStudents(),
			preferences: deps.getPreferences(),
			groups: view.groups,
			algorithmConfig: deps.getScenario()?.algorithmConfig,
			rowLayout: deps.getResolvedRowLayout()
		});

		if (result.status === 'err') {
			deps.showToast('Failed to prepare export');
			return;
		}

		await runClipboardCommand(result.value.columnsTsv, 'Groups copied for Sheets!');
	}

	async function handleExportActivitySchema() {
		const program = deps.getProgram();
		const view = deps.getView();
		if (!program || !view) return;

		const exportResult = prepareWorkspaceExport(deps.getEnv(), {
			program,
			students: deps.getStudents(),
			preferences: deps.getPreferences(),
			groups: view.groups,
			algorithmConfig: deps.getScenario()?.algorithmConfig,
			rowLayout: deps.getResolvedRowLayout()
		});

		if (exportResult.status === 'err') {
			deps.showToast('Failed to prepare export');
			return;
		}

		const filename = generateExportFilename(program.name);

		await deps.commandRunner.run({
			run: () => {
				downloadActivityFile(exportResult.value.activityExportData, filename);
				return ok(undefined);
			},
			successMessage: 'Schema downloaded'
		});
	}

	async function handleExportActivityScreenshot() {
		const program = deps.getProgram();
		if (!program) return;
		const filename = generateExportFilename(program.name);
		const screenshotName = filename.replace(/\.json$/i, '.png');

		await deps.commandRunner.run({
			run: async () => {
				const screenshotSuccess = await downloadActivityScreenshot(screenshotName);
				return screenshotSuccess ? ok(undefined) : err('screenshot_failed' as const);
			},
			successMessage: 'Screenshot downloaded',
			errorMessage: 'Screenshot failed'
		});
	}

	return {
		handleExportCSV,
		handleExportTSV,
		handleExportGroupsSummary,
		handleExportGroupsColumns,
		handleExportActivitySchema,
		handleExportActivityScreenshot
	};
}
