import { derived, get, writable, type Readable } from 'svelte/store';
import type {
	Group,
	Preference,
	Scenario,
	ScenarioSatisfaction,
	ScenarioStatus
} from '$lib/domain';
import { computeAnalyticsSync } from '$lib/application/useCases/computeAnalyticsSync';
import type { ScenarioRepository } from '$lib/application/ports';
import { isGroupFull } from '$lib/domain/group';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'failed';

export type MoveStudentCommand = {
	type: 'MOVE_STUDENT';
	studentId: string;
	source: string; // groupId or 'unassigned'
	target: string; // groupId or 'unassigned'
};

type ScenarioMetadata = {
	id: string;
	programId: string;
	createdAt: Date;
	createdByStaffId?: string;
	algorithmConfig?: unknown;
	participantSnapshot: string[];
	status: ScenarioStatus;
};

export type AnalyticsDelta = {
	topChoice: number;
	top2?: number;
	averageRank: number;
};

type InternalState = {
	groups: Group[];
	history: MoveStudentCommand[];
	historyIndex: number;
	saveStatus: SaveStatus;
	baseline: ScenarioSatisfaction | null;
	currentAnalytics: ScenarioSatisfaction | null;
	participantSnapshot: string[];
	preferences: Preference[];
	pendingSave: boolean;
	retryCount: number;
	status: ScenarioStatus;
};

export type ScenarioEditingView = {
	groups: Group[];
	unassignedStudentIds: string[];
	canUndo: boolean;
	canRedo: boolean;
	historyIndex: number;
	historyLength: number;
	saveStatus: SaveStatus;
	canAdopt: boolean;
	baseline: ScenarioSatisfaction | null;
	currentAnalytics: ScenarioSatisfaction | null;
	analyticsDelta: AnalyticsDelta | null;
	status: ScenarioStatus;
	retryCount: number;
};

const DEFAULT_DEBOUNCE_MS = 400;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const SAVED_IDLE_DELAY = 2000;

function cloneGroups(groups: Group[]): Group[] {
	return groups.map((group) => ({ ...group, memberIds: [...group.memberIds] }));
}

function deriveUnassigned(snapshot: string[], groups: Group[]): string[] {
	const assigned = new Set<string>();
	for (const group of groups) {
		for (const memberId of group.memberIds) {
			assigned.add(memberId);
		}
	}
	return snapshot.filter((id) => !assigned.has(id));
}

function computeDelta(
	baseline: ScenarioSatisfaction | null,
	current: ScenarioSatisfaction | null
): AnalyticsDelta | null {
	if (!baseline || !current) return null;
	return {
		topChoice: current.percentAssignedTopChoice - baseline.percentAssignedTopChoice,
		top2:
			baseline.percentAssignedTop2 !== undefined && current.percentAssignedTop2 !== undefined
				? current.percentAssignedTop2 - baseline.percentAssignedTop2
				: undefined,
		averageRank: current.averagePreferenceRankAssigned - baseline.averagePreferenceRankAssigned
	};
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ScenarioEditingStore implements Readable<ScenarioEditingView> {
	private readonly state = writable<InternalState>({
		groups: [],
		history: [],
		historyIndex: -1,
		saveStatus: 'idle',
		baseline: null,
		currentAnalytics: null,
		participantSnapshot: [],
		preferences: [],
		pendingSave: false,
		retryCount: 0,
		status: 'DRAFT'
	});

	private readonly view = derived(this.state, (state): ScenarioEditingView => {
		const unassignedStudentIds = deriveUnassigned(state.participantSnapshot, state.groups);
		const canUndo = state.historyIndex >= 0;
		const canRedo = state.historyIndex < state.history.length - 1;
		const canAdopt = !['saving', 'error', 'failed'].includes(state.saveStatus);
		const analyticsDelta = computeDelta(state.baseline, state.currentAnalytics);

		return {
			groups: state.groups,
			unassignedStudentIds,
			canUndo,
			canRedo,
			historyIndex: state.historyIndex,
			historyLength: state.history.length,
			saveStatus: state.saveStatus,
			canAdopt,
			baseline: state.baseline,
			currentAnalytics: state.currentAnalytics,
			analyticsDelta,
			status: state.status,
			retryCount: state.retryCount
		};
	});

	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private analyticsTimeout: ReturnType<typeof setTimeout> | null = null;
	private savedIdleTimeout: ReturnType<typeof setTimeout> | null = null;
	private saveInFlight: Promise<void> | null = null;
	private metadata: ScenarioMetadata | null = null;
	private readonly debounceMs: number;

	readonly subscribe = this.view.subscribe;

	constructor(private readonly deps: { scenarioRepo: ScenarioRepository; debounceMs?: number }) {
		this.debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
	}

	initialize(scenario: Scenario, preferences: Preference[]): void {
		this.metadata = {
			id: scenario.id,
			programId: scenario.programId,
			createdAt: scenario.createdAt,
			createdByStaffId: scenario.createdByStaffId,
			algorithmConfig: scenario.algorithmConfig,
			participantSnapshot: [...scenario.participantSnapshot],
			status: scenario.status
		};

		const baseline = computeAnalyticsSync({
			groups: scenario.groups,
			preferences,
			participantSnapshot: scenario.participantSnapshot,
			programId: scenario.programId
		});

		this.state.set({
			groups: cloneGroups(scenario.groups),
			history: [],
			historyIndex: -1,
			saveStatus: 'idle',
			baseline,
			currentAnalytics: baseline,
			participantSnapshot: [...scenario.participantSnapshot],
			preferences: [...preferences],
			pendingSave: false,
			retryCount: 0,
			status: scenario.status
		});
	}

	dispatch(command: MoveStudentCommand): { success: boolean; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		const validation = this.validateMove(command, snapshot);
		if (!validation.ok) {
			return { success: false, reason: validation.reason };
		}

		this.state.update((current) => {
			const updatedGroups = this.applyMove(current.groups, command);
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			const history = [...truncatedHistory, command];
			const historyIndex = history.length - 1;

			return {
				...current,
				groups: updatedGroups,
				history,
				historyIndex,
				pendingSave: true
			};
		});

		this.scheduleSave();
		this.scheduleAnalytics();
		return { success: true };
	}

	undo(): boolean {
		this.ensureInitialized();
		const snapshot = get(this.state);
		if (snapshot.historyIndex < 0 || snapshot.saveStatus === 'failed') {
			return false;
		}

		const command = snapshot.history[snapshot.historyIndex];
		const inverse: MoveStudentCommand = {
			type: 'MOVE_STUDENT',
			studentId: command.studentId,
			source: command.target,
			target: command.source
		};

		this.state.update((current) => ({
			...current,
			groups: this.applyMove(current.groups, inverse),
			historyIndex: current.historyIndex - 1,
			pendingSave: true
		}));

		this.scheduleSave();
		this.scheduleAnalytics();
		return true;
	}

	redo(): boolean {
		this.ensureInitialized();
		const snapshot = get(this.state);
		if (snapshot.historyIndex >= snapshot.history.length - 1 || snapshot.saveStatus === 'failed') {
			return false;
		}

		const command = snapshot.history[snapshot.historyIndex + 1];

		this.state.update((current) => ({
			...current,
			groups: this.applyMove(current.groups, command),
			historyIndex: current.historyIndex + 1,
			pendingSave: true
		}));

		this.scheduleSave();
		this.scheduleAnalytics();
		return true;
	}

	async adopt(): Promise<{ success: boolean; reason?: string }> {
		this.ensureInitialized();
		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed' || snapshot.saveStatus === 'error') {
			return { success: false, reason: 'pending_save_error' };
		}

		await this.flushPendingSaves();

		this.state.update((current) => ({
			...current,
			status: 'ADOPTED',
			pendingSave: true
		}));
		if (this.metadata) {
			this.metadata.status = 'ADOPTED';
		}

		await this.forceSave();
		const finalState = get(this.state);
		if (finalState.saveStatus === 'failed' || finalState.saveStatus === 'error') {
			return { success: false, reason: 'save_failed' };
		}

		return { success: true };
	}

	/**
	 * Replace groups with a regenerated set, clearing history and recapturing baseline.
	 */
	async regenerate(groups: Group[]): Promise<void> {
		this.ensureInitialized();
		const participantSnapshot = get(this.state).participantSnapshot;

		this.state.update((current) => ({
			...current,
			groups: cloneGroups(groups),
			history: [],
			historyIndex: -1,
			pendingSave: true,
			saveStatus: current.saveStatus === 'failed' ? 'failed' : current.saveStatus
		}));

		const baseline = computeAnalyticsSync({
			groups,
			preferences: get(this.state).preferences,
			participantSnapshot,
			programId: this.metadata?.programId
		});

		this.state.update((current) => ({
			...current,
			baseline,
			currentAnalytics: baseline
		}));

		this.scheduleSave();
	}

	async retrySave(): Promise<void> {
		this.ensureInitialized();
		this.state.update((current) => ({
			...current,
			saveStatus: 'idle',
			pendingSave: true,
			retryCount: 0
		}));
		await this.forceSave();
	}

	exportState(): string {
		this.ensureInitialized();
		const scenario = this.buildScenario(get(this.state));
		return JSON.stringify(scenario, null, 2);
	}

	async flushPendingSaves(): Promise<void> {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		if (get(this.state).pendingSave) {
			await this.forceSave();
		} else if (this.saveInFlight) {
			await this.saveInFlight;
		}
	}

	private ensureInitialized(): void {
		if (!this.metadata) {
			throw new Error('ScenarioEditingStore has not been initialized');
		}
	}

	private validateMove(
		command: MoveStudentCommand,
		state: InternalState
	): { ok: true } | { ok: false; reason: string } {
		if (command.source === command.target) {
			return { ok: false, reason: 'noop' };
		}

		if (!state.participantSnapshot.includes(command.studentId)) {
			return { ok: false, reason: 'unknown_student' };
		}

		const sourceGroup = command.source === 'unassigned'
			? null
			: state.groups.find((group) => group.id === command.source);
		const targetGroup = command.target === 'unassigned'
			? null
			: state.groups.find((group) => group.id === command.target);

		if (command.source !== 'unassigned' && !sourceGroup) {
			return { ok: false, reason: 'unknown_source' };
		}
		if (command.target !== 'unassigned' && !targetGroup) {
			return { ok: false, reason: 'unknown_target' };
		}

		const currentGroupId = state.groups.find((group) => group.memberIds.includes(command.studentId))
			?.id;
		const isCurrentlyUnassigned = !currentGroupId;

		if (command.source === 'unassigned' && !isCurrentlyUnassigned) {
			return { ok: false, reason: 'not_unassigned' };
		}
		if (command.source !== 'unassigned' && currentGroupId !== command.source) {
			return { ok: false, reason: 'not_in_source' };
		}

		if (targetGroup) {
			const alreadyInTarget = targetGroup.memberIds.includes(command.studentId);
			if (alreadyInTarget) {
				return { ok: false, reason: 'already_in_target' };
			}
			if (isGroupFull(targetGroup)) {
				return { ok: false, reason: 'target_full' };
			}
		}

		return { ok: true };
	}

	private applyMove(groups: Group[], command: MoveStudentCommand): Group[] {
		const updatedGroups = cloneGroups(groups);
		const { source, target, studentId } = command;

		if (source !== 'unassigned') {
			const sourceGroup = updatedGroups.find((group) => group.id === source);
			if (sourceGroup) {
				sourceGroup.memberIds = sourceGroup.memberIds.filter((id) => id !== studentId);
			}
		}

		if (target !== 'unassigned') {
			const targetGroup = updatedGroups.find((group) => group.id === target);
			if (targetGroup) {
				targetGroup.memberIds = [...targetGroup.memberIds, studentId];
			}
		}

		return updatedGroups;
	}

	private scheduleAnalytics(): void {
		if (this.analyticsTimeout) {
			clearTimeout(this.analyticsTimeout);
		}
		this.analyticsTimeout = setTimeout(() => {
			this.analyticsTimeout = null;
			const snapshot = get(this.state);
			if (!this.metadata) return;
			const currentAnalytics = computeAnalyticsSync({
				groups: snapshot.groups,
				preferences: snapshot.preferences,
				participantSnapshot: snapshot.participantSnapshot,
				programId: this.metadata.programId
			});
			this.state.update((current) => ({
				...current,
				currentAnalytics
			}));
		}, this.debounceMs);
	}

	private scheduleSave(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		this.saveTimeout = setTimeout(() => {
			this.saveTimeout = null;
			this.startSave();
		}, this.debounceMs);
	}

	private async forceSave(): Promise<void> {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		return this.startSave(true);
	}

	private startSave(force = false): Promise<void> {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return Promise.resolve();
		}

		if (!force && !snapshot.pendingSave && !this.saveInFlight) {
			return Promise.resolve();
		}

		if (this.saveInFlight) {
			this.state.update((current) => ({ ...current, pendingSave: true }));
			return this.saveInFlight;
		}

		this.state.update((current) => ({
			...current,
			pendingSave: false,
			saveStatus: 'saving',
			retryCount: 0
		}));

		const scenario = this.buildScenario(get(this.state));
		const savePromise = this.persistScenarioWithRetry(scenario);
		this.saveInFlight = savePromise;

		savePromise.finally(() => {
			this.saveInFlight = null;
			const latest = get(this.state);
			if (latest.pendingSave && latest.saveStatus !== 'failed') {
				this.startSave();
			}
		});

		return savePromise;
	}

	private async persistScenarioWithRetry(scenario: Scenario): Promise<void> {
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				await this.persistScenario(scenario);
				this.markSaved();
				return;
			} catch (error) {
				if (attempt === MAX_RETRIES) {
					this.state.update((current) => ({
						...current,
						saveStatus: 'failed',
						retryCount: attempt + 1
					}));
					return;
				}

				this.state.update((current) => ({
					...current,
					saveStatus: 'error',
					retryCount: attempt + 1
				}));

				await delay(RETRY_DELAYS[attempt]);
				this.state.update((current) => ({
					...current,
					saveStatus: 'saving'
				}));
			}
		}
	}

	private async persistScenario(scenario: Scenario): Promise<void> {
		try {
			await this.deps.scenarioRepo.update(scenario);
		} catch (error) {
			await this.deps.scenarioRepo.save(scenario);
		}
	}

	private markSaved(): void {
		if (this.savedIdleTimeout) {
			clearTimeout(this.savedIdleTimeout);
		}

		this.state.update((current) => ({
			...current,
			saveStatus: 'saved',
			retryCount: 0
		}));

		this.savedIdleTimeout = setTimeout(() => {
			this.state.update((current) => ({
				...current,
				saveStatus: 'idle'
			}));
			this.savedIdleTimeout = null;
		}, SAVED_IDLE_DELAY);
	}

	private buildScenario(state: InternalState): Scenario {
		if (!this.metadata) {
			throw new Error('Scenario metadata missing');
		}

		return {
			id: this.metadata.id,
			programId: this.metadata.programId,
			status: state.status,
			groups: cloneGroups(state.groups),
			participantSnapshot: [...this.metadata.participantSnapshot],
			createdAt: this.metadata.createdAt,
			createdByStaffId: this.metadata.createdByStaffId,
			algorithmConfig: this.metadata.algorithmConfig
		};
	}
}
