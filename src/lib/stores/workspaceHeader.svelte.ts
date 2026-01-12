export type WorkspaceHeaderState = {
	canUndo: boolean;
	canRedo: boolean;
	topChoicePercent: number | null;
	topTwoPercent: number | null;
	onUndo: () => void;
	onRedo: () => void;
	onExportCSV: () => void;
	onExportTSV: () => void;
	onExportGroupsSummary: () => void;
	onExportGroupsColumns: () => void;
	onExportActivitySchema: () => void | Promise<void>;
	onExportActivityScreenshot: () => void | Promise<void>;
};

export class WorkspaceHeaderStore {
	state = $state<WorkspaceHeaderState | null>(null);

	set(value: WorkspaceHeaderState | null) {
		this.state = value;
	}

	clear() {
		this.state = null;
	}
}

export const workspaceHeader = new WorkspaceHeaderStore();
