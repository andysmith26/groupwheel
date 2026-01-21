import { derived, get, writable, type Readable } from 'svelte/store';
import type {
	Group,
	Preference,
	Scenario,
	ScenarioSatisfaction,
	ScenarioStatus
} from '$lib/domain';
import { computeAnalyticsSync } from '$lib/application/useCases/computeAnalyticsSync';
import type { ScenarioRepository, IdGenerator } from '$lib/application/ports';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'failed';

export type MoveStudentCommand = {
	type: 'MOVE_STUDENT';
	studentId: string;
	source: string; // groupId or 'unassigned'
	target: string; // groupId or 'unassigned'
	targetIndex?: number; // Optional index to insert at (for reordering)
	previousIndex?: number; // Previous index for undo (set automatically)
};

export type CreateGroupCommand = {
	type: 'CREATE_GROUP';
	group: Group;
};

export type DeleteGroupCommand = {
	type: 'DELETE_GROUP';
	groupId: string;
	previousGroup: Group;
	displacedStudentIds: string[];
};

export type UpdateGroupCommand = {
	type: 'UPDATE_GROUP';
	groupId: string;
	changes: Partial<Pick<Group, 'name' | 'capacity'>>;
	previousValues: Partial<Pick<Group, 'name' | 'capacity'>>;
};

export type ReorderGroupCommand = {
	type: 'REORDER_GROUP';
	groupId: string;
	newOrder: string[]; // New memberIds order
	previousOrder: string[]; // Previous memberIds order for undo
};

export type ReorderUnassignedCommand = {
	type: 'REORDER_UNASSIGNED';
	newOrder: string[]; // New unassigned order
	previousOrder: string[]; // Previous order for undo
};

export type Command =
	| MoveStudentCommand
	| CreateGroupCommand
	| DeleteGroupCommand
	| UpdateGroupCommand
	| ReorderGroupCommand
	| ReorderUnassignedCommand;

type ScenarioMetadata = {
	id: string;
	programId: string;
	createdAt: Date;
	lastModifiedAt: Date;
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
	history: Command[];
	historyIndex: number;
	saveStatus: SaveStatus;
	saveError: string | null;
	baseline: ScenarioSatisfaction | null;
	currentAnalytics: ScenarioSatisfaction | null;
	participantSnapshot: string[];
	unassignedOrder: string[] | null; // Custom order for unassigned students (null = use snapshot order)
	preferences: Preference[];
	pendingSave: boolean;
	retryCount: number;
	status: ScenarioStatus;
	lastSavedAt: Date | null;
	lastModifiedAt: Date | null;
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
	lastSavedAt: Date | null;
	saveError: string | null;
	/** When the scenario was last modified (for publish status tracking) */
	lastModifiedAt: Date | null;
};

const DEFAULT_DEBOUNCE_MS = 400;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const SAVED_IDLE_DELAY = 2000;

function cloneGroups(groups: Group[]): Group[] {
	return groups.map((group) => ({ ...group, memberIds: [...group.memberIds] }));
}

function deriveUnassigned(snapshot: string[], groups: Group[], customOrder: string[] | null): string[] {
	const assigned = new Set<string>();
	for (const group of groups) {
		for (const memberId of group.memberIds) {
			assigned.add(memberId);
		}
	}

	// If we have a custom order, use it (filtering out any now-assigned students)
	if (customOrder) {
		const unassignedSet = new Set(snapshot.filter((id) => !assigned.has(id)));
		// Return custom order items that are still unassigned, then any new unassigned
		const orderedUnassigned = customOrder.filter((id) => unassignedSet.has(id));
		const orderedSet = new Set(orderedUnassigned);
		const newUnassigned = snapshot.filter((id) => unassignedSet.has(id) && !orderedSet.has(id));
		return [...orderedUnassigned, ...newUnassigned];
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

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return 'Unknown error';
	}
}

export class ScenarioEditingStore implements Readable<ScenarioEditingView> {
	private readonly state = writable<InternalState>({
		groups: [],
		history: [],
		historyIndex: -1,
		saveStatus: 'idle',
		saveError: null,
		baseline: null,
		currentAnalytics: null,
		participantSnapshot: [],
		unassignedOrder: null,
		preferences: [],
		pendingSave: false,
		retryCount: 0,
		status: 'DRAFT',
		lastSavedAt: null,
		lastModifiedAt: null
	});

	private readonly view = derived(this.state, (state): ScenarioEditingView => {
		const unassignedStudentIds = deriveUnassigned(state.participantSnapshot, state.groups, state.unassignedOrder);
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
			retryCount: state.retryCount,
			lastSavedAt: state.lastSavedAt,
			saveError: state.saveError,
			lastModifiedAt: state.lastModifiedAt
		};
	});

	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private analyticsTimeout: ReturnType<typeof setTimeout> | null = null;
	private savedIdleTimeout: ReturnType<typeof setTimeout> | null = null;
	private saveInFlight: Promise<void> | null = null;
	private metadata: ScenarioMetadata | null = null;
	private readonly debounceMs: number;

	readonly subscribe = this.view.subscribe;

	constructor(
		private readonly deps: {
			scenarioRepo: ScenarioRepository;
			idGenerator: IdGenerator;
			debounceMs?: number;
		}
	) {
		this.debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
	}

	initialize(scenario: Scenario, preferences: Preference[]): void {
		this.metadata = {
			id: scenario.id,
			programId: scenario.programId,
			createdAt: scenario.createdAt,
			lastModifiedAt: scenario.lastModifiedAt ?? scenario.createdAt, // Handle legacy scenarios
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
			saveError: null,
			baseline,
			currentAnalytics: baseline,
			participantSnapshot: [...scenario.participantSnapshot],
			unassignedOrder: null,
			preferences: [...preferences],
			pendingSave: false,
			retryCount: 0,
			status: scenario.status,
			lastSavedAt: null,
			lastModifiedAt: scenario.lastModifiedAt ?? scenario.createdAt
		});
	}

	updateAlgorithmConfig(algorithmConfig: unknown): void {
		this.ensureInitialized();
		if (!this.metadata) return;

		this.metadata.algorithmConfig = algorithmConfig;
		this.state.update((current) => ({
			...current,
			pendingSave: true
		}));
		this.scheduleSave();
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

		// Capture previous index for undo support
		let previousIndex: number | undefined;
		if (command.source !== 'unassigned') {
			const sourceGroup = snapshot.groups.find((g) => g.id === command.source);
			if (sourceGroup) {
				previousIndex = sourceGroup.memberIds.indexOf(command.studentId);
			}
		}

		const commandWithPreviousIndex: MoveStudentCommand = {
			...command,
			previousIndex
		};

		this.state.update((current) => {
			const updatedGroups = this.applyMove(current.groups, commandWithPreviousIndex);
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			const history = [...truncatedHistory, commandWithPreviousIndex];
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

	createGroup(name?: string): { success: boolean; groupId?: string; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		const existingNames = snapshot.groups.map((g) => g.name.toLowerCase());
		const baseName = name?.trim() || 'Group';
		let finalName = baseName;
		let counter = snapshot.groups.length + 1;

		// Ensure unique name
		while (existingNames.includes(finalName.toLowerCase())) {
			finalName = `${baseName} ${counter}`;
			counter++;
		}

		const newGroup: Group = {
			id: this.deps.idGenerator.generateId(),
			name: finalName,
			capacity: null,
			memberIds: []
		};

		const command: CreateGroupCommand = {
			type: 'CREATE_GROUP',
			group: newGroup
		};

		this.state.update((current) => {
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			return {
				...current,
				groups: [...current.groups, newGroup],
				history: [...truncatedHistory, command],
				historyIndex: truncatedHistory.length,
				pendingSave: true
			};
		});

		this.scheduleSave();
		return { success: true, groupId: newGroup.id };
	}

	deleteGroup(groupId: string): { success: boolean; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		const targetGroup = snapshot.groups.find((g) => g.id === groupId);
		if (!targetGroup) {
			return { success: false, reason: 'group_not_found' };
		}

		const command: DeleteGroupCommand = {
			type: 'DELETE_GROUP',
			groupId,
			previousGroup: { ...targetGroup, memberIds: [...targetGroup.memberIds] },
			displacedStudentIds: [...targetGroup.memberIds]
		};

		this.state.update((current) => {
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			return {
				...current,
				groups: current.groups.filter((g) => g.id !== groupId),
				history: [...truncatedHistory, command],
				historyIndex: truncatedHistory.length,
				pendingSave: true
			};
		});

		this.scheduleSave();
		this.scheduleAnalytics(); // Recompute since students may be unassigned
		return { success: true };
	}

	// Coalescing support for rapid updates
	private pendingUpdateCommand: UpdateGroupCommand | null = null;
	private updateCoalesceTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Call this method to clean up all pending timeouts when the store is no longer needed.
	 */
	destroy() {
		if (this.updateCoalesceTimeout !== null) {
			clearTimeout(this.updateCoalesceTimeout);
			this.updateCoalesceTimeout = null;
		}
		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		if (this.analyticsTimeout !== null) {
			clearTimeout(this.analyticsTimeout);
			this.analyticsTimeout = null;
		}
		if (this.savedIdleTimeout !== null) {
			clearTimeout(this.savedIdleTimeout);
			this.savedIdleTimeout = null;
		}
	}
	updateGroup(
		groupId: string,
		changes: Partial<Pick<Group, 'name' | 'capacity'>>
	): { success: boolean; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		const targetGroup = snapshot.groups.find((g) => g.id === groupId);
		if (!targetGroup) {
			return { success: false, reason: 'group_not_found' };
		}

		// Validate unique name if changing name
		if (changes.name !== undefined) {
			const trimmedName = changes.name.trim();
			if (trimmedName.length === 0) {
				return { success: false, reason: 'empty_name' };
			}
			const otherNames = snapshot.groups
				.filter((g) => g.id !== groupId)
				.map((g) => g.name.toLowerCase());
			if (otherNames.includes(trimmedName.toLowerCase())) {
				return { success: false, reason: 'duplicate_name' };
			}
		}

		// Build previous values for undo
		const previousValues: Partial<Pick<Group, 'name' | 'capacity'>> = {};
		if ('name' in changes) previousValues.name = targetGroup.name;
		if ('capacity' in changes) previousValues.capacity = targetGroup.capacity;

		// Coalesce rapid updates to same group into single command
		if (this.pendingUpdateCommand?.groupId === groupId) {
			// Merge changes, keep original previousValues
			this.pendingUpdateCommand.changes = {
				...this.pendingUpdateCommand.changes,
				...changes
			};
		} else {
			// Flush any pending update for different group
			this.flushPendingUpdate();

			this.pendingUpdateCommand = {
				type: 'UPDATE_GROUP',
				groupId,
				changes,
				previousValues
			};
		}

		// Apply to state immediately (optimistic)
		this.state.update((current) => ({
			...current,
			groups: current.groups.map((g) => (g.id === groupId ? { ...g, ...changes } : g)),
			pendingSave: true
		}));

		// Debounce history commit
		if (this.updateCoalesceTimeout) {
			clearTimeout(this.updateCoalesceTimeout);
		}
		this.updateCoalesceTimeout = setTimeout(() => {
			this.flushPendingUpdate();
		}, 500); // 500ms debounce for typing

		this.scheduleSave();
		return { success: true };
	}

	private flushPendingUpdate(): void {
		if (!this.pendingUpdateCommand) return;

		const command = this.pendingUpdateCommand;
		this.pendingUpdateCommand = null;

		if (this.updateCoalesceTimeout) {
			clearTimeout(this.updateCoalesceTimeout);
			this.updateCoalesceTimeout = null;
		}

		this.state.update((current) => {
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			return {
				...current,
				history: [...truncatedHistory, command],
				historyIndex: truncatedHistory.length
			};
		});
	}

	reorderGroup(groupId: string, newOrder: string[]): { success: boolean; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		const targetGroup = snapshot.groups.find((g) => g.id === groupId);
		if (!targetGroup) {
			return { success: false, reason: 'group_not_found' };
		}

		// Validate that newOrder contains exactly the same members
		const currentSet = new Set(targetGroup.memberIds);
		const newSet = new Set(newOrder);
		if (
			currentSet.size !== newSet.size ||
			![...currentSet].every((id) => newSet.has(id))
		) {
			return { success: false, reason: 'invalid_order' };
		}

		const command: ReorderGroupCommand = {
			type: 'REORDER_GROUP',
			groupId,
			newOrder: [...newOrder],
			previousOrder: [...targetGroup.memberIds]
		};

		this.state.update((current) => {
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			return {
				...current,
				groups: current.groups.map((g) =>
					g.id === groupId ? { ...g, memberIds: [...newOrder] } : g
				),
				history: [...truncatedHistory, command],
				historyIndex: truncatedHistory.length,
				pendingSave: true
			};
		});

		this.scheduleSave();
		return { success: true };
	}

	reorderUnassigned(newOrder: string[]): { success: boolean; reason?: string } {
		this.ensureInitialized();

		const snapshot = get(this.state);
		if (snapshot.saveStatus === 'failed') {
			return { success: false, reason: 'save_failed' };
		}

		// Get current unassigned list
		const currentUnassigned = deriveUnassigned(
			snapshot.participantSnapshot,
			snapshot.groups,
			snapshot.unassignedOrder
		);

		// Validate that newOrder contains exactly the same students
		const currentSet = new Set(currentUnassigned);
		const newSet = new Set(newOrder);
		if (
			currentSet.size !== newSet.size ||
			![...currentSet].every((id) => newSet.has(id))
		) {
			return { success: false, reason: 'invalid_order' };
		}

		const command: ReorderUnassignedCommand = {
			type: 'REORDER_UNASSIGNED',
			newOrder: [...newOrder],
			previousOrder: [...currentUnassigned]
		};

		this.state.update((current) => {
			const truncatedHistory = current.history.slice(0, current.historyIndex + 1);
			return {
				...current,
				unassignedOrder: [...newOrder],
				history: [...truncatedHistory, command],
				historyIndex: truncatedHistory.length,
				pendingSave: true
			};
		});

		this.scheduleSave();
		return { success: true };
	}

	undo(): boolean {
		this.ensureInitialized();

		// Flush any pending update before undo
		this.flushPendingUpdate();

		const snapshot = get(this.state);
		if (snapshot.historyIndex < 0 || snapshot.saveStatus === 'failed') {
			return false;
		}

		const command = snapshot.history[snapshot.historyIndex];

		this.state.update((current) => {
			let newGroups: Group[];
			let newUnassignedOrder = current.unassignedOrder;

			switch (command.type) {
				case 'MOVE_STUDENT': {
					const inverse: MoveStudentCommand = {
						type: 'MOVE_STUDENT',
						studentId: command.studentId,
						source: command.target,
						target: command.source,
						// Use previousIndex to restore original position
						targetIndex: command.previousIndex
					};
					newGroups = this.applyMove(current.groups, inverse);
					break;
				}

				case 'CREATE_GROUP': {
					newGroups = current.groups.filter((g) => g.id !== command.group.id);
					break;
				}

				case 'DELETE_GROUP': {
					// Restore the group (append for simplicity)
					newGroups = [...current.groups, command.previousGroup];
					break;
				}

				case 'UPDATE_GROUP': {
					newGroups = current.groups.map((g) =>
						g.id === command.groupId ? { ...g, ...command.previousValues } : g
					);
					break;
				}

				case 'REORDER_GROUP': {
					newGroups = current.groups.map((g) =>
						g.id === command.groupId ? { ...g, memberIds: [...command.previousOrder] } : g
					);
					break;
				}

				case 'REORDER_UNASSIGNED': {
					newGroups = current.groups;
					newUnassignedOrder = [...command.previousOrder];
					break;
				}

				default:
					newGroups = current.groups;
			}

			return {
				...current,
				groups: newGroups,
				unassignedOrder: newUnassignedOrder,
				historyIndex: current.historyIndex - 1,
				pendingSave: true
			};
		});

		this.scheduleSave();
		this.scheduleAnalytics();
		return true;
	}

	redo(): boolean {
		this.ensureInitialized();

		// Flush any pending update before redo
		this.flushPendingUpdate();

		const snapshot = get(this.state);
		if (snapshot.historyIndex >= snapshot.history.length - 1 || snapshot.saveStatus === 'failed') {
			return false;
		}

		const command = snapshot.history[snapshot.historyIndex + 1];

		this.state.update((current) => {
			let newGroups: Group[];
			let newUnassignedOrder = current.unassignedOrder;

			switch (command.type) {
				case 'MOVE_STUDENT': {
					newGroups = this.applyMove(current.groups, command);
					break;
				}

				case 'CREATE_GROUP': {
					newGroups = [...current.groups, command.group];
					break;
				}

				case 'DELETE_GROUP': {
					newGroups = current.groups.filter((g) => g.id !== command.groupId);
					break;
				}

				case 'UPDATE_GROUP': {
					newGroups = current.groups.map((g) =>
						g.id === command.groupId ? { ...g, ...command.changes } : g
					);
					break;
				}

				case 'REORDER_GROUP': {
					newGroups = current.groups.map((g) =>
						g.id === command.groupId ? { ...g, memberIds: [...command.newOrder] } : g
					);
					break;
				}

				case 'REORDER_UNASSIGNED': {
					newGroups = current.groups;
					newUnassignedOrder = [...command.newOrder];
					break;
				}

				default:
					newGroups = current.groups;
			}

			return {
				...current,
				groups: newGroups,
				unassignedOrder: newUnassignedOrder,
				historyIndex: current.historyIndex + 1,
				pendingSave: true
			};
		});

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
			unassignedOrder: null, // Reset custom order on regenerate
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
			saveError: null,
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

		const sourceGroup =
			command.source === 'unassigned'
				? null
				: state.groups.find((group) => group.id === command.source);
		const targetGroup =
			command.target === 'unassigned'
				? null
				: state.groups.find((group) => group.id === command.target);

		if (command.source !== 'unassigned' && !sourceGroup) {
			return { ok: false, reason: 'unknown_source' };
		}
		if (command.target !== 'unassigned' && !targetGroup) {
			return { ok: false, reason: 'unknown_target' };
		}

		const currentGroupId = state.groups.find((group) =>
			group.memberIds.includes(command.studentId)
		)?.id;
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
			// Note: We no longer block moves to full groups.
			// Over-enrollment is allowed and shown visually in the UI.
		}

		return { ok: true };
	}

	private applyMove(groups: Group[], command: MoveStudentCommand): Group[] {
		const updatedGroups = cloneGroups(groups);
		const { source, target, studentId, targetIndex } = command;

		if (source !== 'unassigned') {
			const sourceGroup = updatedGroups.find((group) => group.id === source);
			if (sourceGroup) {
				sourceGroup.memberIds = sourceGroup.memberIds.filter((id) => id !== studentId);
			}
		}

		if (target !== 'unassigned') {
			const targetGroup = updatedGroups.find((group) => group.id === target);
			if (targetGroup) {
				if (targetIndex !== undefined && targetIndex >= 0) {
					// Insert at specific index
					const newMemberIds = [...targetGroup.memberIds];
					newMemberIds.splice(targetIndex, 0, studentId);
					targetGroup.memberIds = newMemberIds;
				} else {
					// Append to end (default behavior)
					targetGroup.memberIds = [...targetGroup.memberIds, studentId];
				}
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
			saveError: null,
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
				console.error('Failed to persist scenario', {
					attempt: attempt + 1,
					scenarioId: this.metadata?.id,
					error
				});
				if (attempt === MAX_RETRIES) {
					this.state.update((current) => ({
						...current,
						saveStatus: 'failed',
						retryCount: attempt + 1,
						saveError: extractErrorMessage(error)
					}));
					return;
				}

				this.state.update((current) => ({
					...current,
					saveStatus: 'error',
					saveError: extractErrorMessage(error),
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
			saveError: null,
			retryCount: 0,
			lastSavedAt: new Date(),
			// Sync lastModifiedAt from metadata (which was set during buildScenario)
			lastModifiedAt: this.metadata?.lastModifiedAt ?? current.lastModifiedAt
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

		// Update lastModifiedAt when there are changes to save
		const lastModifiedAt = state.pendingSave ? new Date() : this.metadata.lastModifiedAt;

		// Also update metadata so subsequent saves use the new timestamp
		if (state.pendingSave) {
			this.metadata.lastModifiedAt = lastModifiedAt;
		}

		return {
			id: this.metadata.id,
			programId: this.metadata.programId,
			status: state.status,
			groups: cloneGroups(state.groups),
			participantSnapshot: [...this.metadata.participantSnapshot],
			createdAt: this.metadata.createdAt,
			lastModifiedAt,
			createdByStaffId: this.metadata.createdByStaffId,
			algorithmConfig: this.metadata.algorithmConfig
		};
	}
}
