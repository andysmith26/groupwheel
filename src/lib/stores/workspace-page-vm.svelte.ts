import type { AppEnvContext } from '$lib/contexts/appEnv';
import type {
	Group,
	Pool,
	Preference,
	Program,
	Scenario,
	ScenarioSatisfaction,
	Session,
	Student
} from '$lib/domain';
import {
	getActivityData,
	generateScenario,
	getProgramPairingStats,
	createWorkspaceHistoryEntry,
	detectWorkspaceEditsSincePublish,
	insertWorkspaceHistoryEntry,
	selectWorkspaceHistoryEntry,
	showToClass,
	type PairingStat,
	type WorkspaceHistoryEntry,
	type WorkspaceHistoryState
} from '$lib/services/appEnvUseCases';
import { err, isErr, ok, type Result } from '$lib/types/result';
import {
	ScenarioEditingStore,
	type SaveStatus,
	type ScenarioEditingView
} from '$lib/stores/scenarioEditingStore';
import {
	createWorkspaceKeyboardController,
	type WorkspaceKeyboardController
} from '$lib/stores/workspace-keyboard-controller.svelte';
import {
	createWorkspaceTooltipController,
	type WorkspaceTooltipController
} from '$lib/stores/workspace-tooltip-controller.svelte';
import {
	createWorkspaceSidebarController,
	type WorkspaceSidebarController
} from '$lib/stores/workspace-sidebar-controller.svelte';
import type { ParsedPreference } from '$lib/application/useCases/createGroupingActivity';
import { computeAnalyticsSync } from '$lib/application/useCases/computeAnalyticsSync';

const MAX_HISTORY = 3;

export interface WorkspacePageVmState {
	env: AppEnvContext;
	program: Program | null;
	pool: Pool | null;
	students: Student[];
	preferences: Preference[];
	scenario: Scenario | null;
	sessions: Session[];
	latestPublishedSession: Session | null;
	pairingStats: PairingStat[];

	loading: boolean;
	loadError: string | null;
	generationError: string | null;
	showGuidanceBanner: boolean;

	editingStore: ScenarioEditingStore | null;
	view: ScenarioEditingView | null;

	showPreferencesModal: boolean;
	bannerDismissed: boolean;
	guidedStep: 1 | 2;
	showStartOverConfirm: boolean;
	isRegenerating: boolean;
	isRetryingGeneration: boolean;

	newGroupId: string | null;
	showDeleteGroupConfirm: boolean;
	groupToDelete: { id: string; name: string; memberCount: number } | null;
	showAlphabetizeConfirm: boolean;
	groupToAlphabetize: { id: string; name: string; memberCount: number } | null;

	resultHistory: WorkspaceHistoryEntry[];
	currentHistoryIndex: number;
	isTryingAnother: boolean;
	savedCurrentGroups: Group[] | null;
	avoidRecentGroupmates: boolean;

	lastSaveStatus: SaveStatus | null;
	keyboardController: WorkspaceKeyboardController;
	tooltipController: WorkspaceTooltipController;
	sidebarController: WorkspaceSidebarController;
}

export type WorkspacePageVm = {
	state: WorkspacePageVmState;
	actions: {
		init: (activityId: string | undefined, query: URLSearchParams) => Promise<void>;
		dispose: () => void;
		handleInlineGenerated: (scenario: Scenario) => void;
		syncScenarioAlgorithmConfig: (nextAlgorithmConfig: unknown) => void;
		setGenerationError: (error: string | null) => void;
		setAvoidRecentGroupmates: (value: boolean) => void;
		advanceGuidanceStep: () => void;
		dismissGuidanceBanner: () => void;
		openPreferencesModal: () => void;
		closePreferencesModal: () => void;
		openStartOverConfirm: () => void;
		closeStartOverConfirm: () => void;
		importPreferences: (
			parsedPreferences: ParsedPreference[]
		) => Promise<Result<number, VmOperationError>>;
		retryGeneration: () => Promise<Result<Scenario, string>>;
		publishToClass: (hasEditsSincePublish: boolean) => Promise<Result<PublishState, string>>;
		moveStudent: (payload: {
			studentId: string;
			source: string;
			target: string;
			targetIndex?: number;
		}) => Result<{ studentId: string; source: string; target: string }, string>;
		reorderStudent: (payload: {
			groupId: string;
			studentId: string;
			newIndex: number;
		}) => Result<string, 'reorder_failed'>;
		handleStartOver: () => Promise<Result<void, 'missing_context' | 'regeneration_failed'>>;
		handleTryAnother: () => Promise<Result<void, 'missing_context' | 'generation_failed'>>;
		switchToHistoryEntry: (index: number) => void;
		createGroup: () => Result<string, 'create_failed'>;
		clearNewGroupIdSoon: (delayMs?: number) => void;
		updateGroup: (
			groupId: string,
			changes: Partial<Pick<Group, 'name' | 'capacity'>>
		) => Result<void, string>;
		requestDeleteGroup: (
			groupId: string
		) => Result<'confirm' | 'deleted', 'missing_context' | 'not_found' | 'delete_failed'>;
		confirmDeleteGroup: () => Result<void, 'delete_failed' | 'missing_context'>;
		cancelDeleteGroup: () => void;
		requestAlphabetize: (groupId: string) => void;
		confirmAlphabetize: (
			studentsById: Record<string, Student>
		) => Result<string, 'alphabetize_failed' | 'missing_context'>;
		cancelAlphabetize: () => void;
		alphabetizeUnassigned: (
			studentsById: Record<string, Student>
		) => Result<void, 'alphabetize_unassigned_failed' | 'missing_context'>;
		handleSaveStatusEffects: (
			onFailed: (message: string) => void,
			onError: (error: string) => void
		) => void;
		detectEditsSincePublish: () => boolean;
	};
};

type VmOperationError = 'missing_context' | 'internal_error';

type PublishState =
	| {
			status: 'already_published';
			programId: string;
	  }
	| {
			status: 'published';
			programId: string;
	  };

class WorkspacePageVmStore {
	readonly state = $state<WorkspacePageVmState>({
		env: null as unknown as AppEnvContext,
		program: null,
		pool: null,
		students: [],
		preferences: [],
		scenario: null,
		sessions: [],
		latestPublishedSession: null,
		pairingStats: [],
		loading: true,
		loadError: null,
		generationError: null,
		showGuidanceBanner: false,
		editingStore: null,
		view: null,
		showPreferencesModal: false,
		bannerDismissed: false,
		guidedStep: 1,
		showStartOverConfirm: false,
		isRegenerating: false,
		isRetryingGeneration: false,
		newGroupId: null,
		showDeleteGroupConfirm: false,
		groupToDelete: null,
		showAlphabetizeConfirm: false,
		groupToAlphabetize: null,
		resultHistory: [],
		currentHistoryIndex: -1,
		isTryingAnother: false,
		savedCurrentGroups: null,
		avoidRecentGroupmates: false,
		lastSaveStatus: null,
		keyboardController: createWorkspaceKeyboardController(),
		tooltipController: createWorkspaceTooltipController(),
		sidebarController: createWorkspaceSidebarController()
	});

	readonly actions: WorkspacePageVm['actions'];

	constructor(private readonly env: AppEnvContext) {
		this.state.env = env;

		this.actions = {
			init: this.init,
			dispose: this.dispose,
			handleInlineGenerated: this.handleInlineGenerated,
			syncScenarioAlgorithmConfig: this.syncScenarioAlgorithmConfig,
			setGenerationError: this.setGenerationError,
			setAvoidRecentGroupmates: this.setAvoidRecentGroupmates,
			advanceGuidanceStep: this.advanceGuidanceStep,
			dismissGuidanceBanner: this.dismissGuidanceBanner,
			openPreferencesModal: this.openPreferencesModal,
			closePreferencesModal: this.closePreferencesModal,
			openStartOverConfirm: this.openStartOverConfirm,
			closeStartOverConfirm: this.closeStartOverConfirm,
			importPreferences: this.importPreferences,
			retryGeneration: this.retryGeneration,
			publishToClass: this.publishToClass,
			moveStudent: this.moveStudent,
			reorderStudent: this.reorderStudent,
			handleStartOver: this.handleStartOver,
			handleTryAnother: this.handleTryAnother,
			switchToHistoryEntry: this.switchToHistoryEntry,
			createGroup: this.createGroup,
			clearNewGroupIdSoon: this.clearNewGroupIdSoon,
			updateGroup: this.updateGroup,
			requestDeleteGroup: this.requestDeleteGroup,
			confirmDeleteGroup: this.confirmDeleteGroup,
			cancelDeleteGroup: this.cancelDeleteGroup,
			requestAlphabetize: this.requestAlphabetize,
			confirmAlphabetize: this.confirmAlphabetize,
			cancelAlphabetize: this.cancelAlphabetize,
			alphabetizeUnassigned: this.alphabetizeUnassigned,
			handleSaveStatusEffects: this.handleSaveStatusEffects,
			detectEditsSincePublish: this.detectEditsSincePublish
		};
	}

	private keyboardCleanup: (() => void) | null = null;
	private unsubscribeEditingStore: (() => void) | null = null;

	private readonly init = async (activityId: string | undefined, query: URLSearchParams) => {
		this.applyUrlFlags(query);
		this.setupKeyboardShortcuts();
		await this.loadActivityData(activityId);
	};

	private readonly dispose = () => {
		this.keyboardCleanup?.();
		this.keyboardCleanup = null;

		this.state.tooltipController.actions.dispose();

		this.unsubscribeEditingStore?.();
		this.unsubscribeEditingStore = null;

		this.state.editingStore?.destroy();
		this.state.editingStore = null;
	};

	private readonly handleInlineGenerated = (newScenario: Scenario) => {
		this.state.scenario = newScenario;
		this.state.generationError = null;
		this.initializeEditingStore(newScenario);
	};

	private readonly syncScenarioAlgorithmConfig = (nextAlgorithmConfig: unknown) => {
		if (!this.state.scenario || !this.state.editingStore) return;

		this.state.editingStore.updateAlgorithmConfig(nextAlgorithmConfig);
		this.state.scenario = {
			...this.state.scenario,
			algorithmConfig: nextAlgorithmConfig
		};
	};

	private readonly setGenerationError = (error: string | null) => {
		this.state.generationError = error;
	};

	private readonly setAvoidRecentGroupmates = (value: boolean) => {
		this.state.avoidRecentGroupmates = value;
	};

	private readonly advanceGuidanceStep = () => {
		this.state.guidedStep = 2;
	};

	private readonly dismissGuidanceBanner = () => {
		this.state.bannerDismissed = true;
	};

	private readonly openPreferencesModal = () => {
		this.state.showPreferencesModal = true;
	};

	private readonly closePreferencesModal = () => {
		this.state.showPreferencesModal = false;
	};

	private readonly openStartOverConfirm = () => {
		this.state.showStartOverConfirm = true;
	};

	private readonly closeStartOverConfirm = () => {
		this.state.showStartOverConfirm = false;
	};

	private readonly importPreferences = async (
		parsedPreferences: ParsedPreference[]
	): Promise<Result<number, VmOperationError>> => {
		if (!this.state.program) {
			return err('missing_context');
		}

		try {
			for (const parsedPreference of parsedPreferences) {
				const preference: Preference = {
					id: this.state.env.idGenerator.generateId(),
					programId: this.state.program.id,
					studentId: parsedPreference.studentId,
					payload: {
						studentId: parsedPreference.studentId,
						likeGroupIds: parsedPreference.likeGroupIds ?? [],
						avoidGroupIds: [],
						avoidStudentIds: parsedPreference.avoidStudentIds ?? []
					}
				};

				await this.state.env.preferenceRepo.save(preference);
			}

			this.state.preferences = await this.state.env.preferenceRepo.listByProgramId(
				this.state.program.id
			);
			return ok(parsedPreferences.length);
		} catch {
			return err('internal_error');
		}
	};

	private readonly retryGeneration = async (): Promise<Result<Scenario, string>> => {
		this.state.isRetryingGeneration = true;
		if (!this.state.program) {
			this.state.isRetryingGeneration = false;
			return err('missing_context');
		}

		const result = await generateScenario(this.state.env, {
			programId: this.state.program.id
		});

		if (isErr(result)) {
			this.state.generationError = result.error.type;
			this.state.isRetryingGeneration = false;
			return err(result.error.type);
		}

		this.handleInlineGenerated(result.value);
		this.state.isRetryingGeneration = false;
		return ok(result.value);
	};

	private readonly publishToClass = async (
		hasEditsSincePublish: boolean
	): Promise<Result<PublishState, string>> => {
		if (!this.state.program || !this.state.scenario) {
			return err('missing_context');
		}

		if (this.state.latestPublishedSession && !hasEditsSincePublish) {
			return ok({
				status: 'already_published',
				programId: this.state.program.id
			});
		}

		const result = await showToClass(this.state.env, {
			programId: this.state.program.id,
			scenarioId: this.state.scenario.id
		});

		if (isErr(result)) {
			return err(
				result.error.type === 'INTERNAL_ERROR'
					? result.error.message
					: `Failed: ${result.error.type}`
			);
		}

		this.state.latestPublishedSession = result.value;
		this.state.sessions = [...this.state.sessions, result.value];

		return ok({
			status: 'published',
			programId: this.state.program.id
		});
	};

	private readonly moveStudent = (payload: {
		studentId: string;
		source: string;
		target: string;
		targetIndex?: number;
	}): Result<{ studentId: string; source: string; target: string }, string> => {
		if (!this.state.editingStore) {
			return err('missing_context');
		}

		const currentSourceGroup = this.state.view?.groups.find((group) =>
			group.memberIds.includes(payload.studentId)
		);
		const normalizedSource = currentSourceGroup ? currentSourceGroup.id : 'unassigned';

		const result = this.state.editingStore.dispatch({
			type: 'MOVE_STUDENT',
			studentId: payload.studentId,
			source: normalizedSource,
			target: payload.target,
			targetIndex: payload.targetIndex
		});

		if (!result.success) {
			return err(result.reason ?? 'move_not_allowed');
		}

		return ok({
			studentId: payload.studentId,
			source: normalizedSource,
			target: payload.target
		});
	};

	private readonly reorderStudent = (payload: {
		groupId: string;
		studentId: string;
		newIndex: number;
	}): Result<string, 'reorder_failed'> => {
		if (!this.state.editingStore || !this.state.view) {
			return err('reorder_failed');
		}

		if (payload.groupId === 'unassigned') {
			const currentIndex = this.state.view.unassignedStudentIds.indexOf(payload.studentId);
			if (currentIndex === -1) return err('reorder_failed');

			const newOrder = [...this.state.view.unassignedStudentIds];
			newOrder.splice(currentIndex, 1);
			newOrder.splice(payload.newIndex, 0, payload.studentId);

			const result = this.state.editingStore.reorderUnassigned(newOrder);
			return result.success ? ok(payload.studentId) : err('reorder_failed');
		}

		const group = this.state.view.groups.find((item) => item.id === payload.groupId);
		if (!group) return err('reorder_failed');

		const currentIndex = group.memberIds.indexOf(payload.studentId);
		if (currentIndex === -1) return err('reorder_failed');

		const newOrder = [...group.memberIds];
		newOrder.splice(currentIndex, 1);
		newOrder.splice(payload.newIndex, 0, payload.studentId);

		const result = this.state.editingStore.reorderGroup(payload.groupId, newOrder);
		return result.success ? ok(payload.studentId) : err('reorder_failed');
	};

	private readonly handleStartOver = async (): Promise<
		Result<void, 'missing_context' | 'regeneration_failed'>
	> => {
		if (!this.state.scenario || !this.state.editingStore) {
			return err('missing_context');
		}

		this.state.showStartOverConfirm = false;
		this.state.isRegenerating = true;

		const existingConfig = (this.state.scenario.algorithmConfig as Record<string, unknown>) ?? {};
		const result = await this.state.env.groupingAlgorithm.generateGroups({
			programId: this.state.scenario.programId,
			studentIds: this.state.scenario.participantSnapshot,
			algorithmConfig: {
				...existingConfig,
				avoidRecentGroupmates: this.state.avoidRecentGroupmates
			}
		});

		if (!result.success) {
			this.state.isRegenerating = false;
			return err('regeneration_failed');
		}

		const groups: Group[] = result.groups.map((group) => ({
			id: group.id,
			name: group.name,
			capacity: group.capacity,
			memberIds: group.memberIds
		}));

		this.state.resultHistory = [];
		this.state.currentHistoryIndex = -1;
		this.state.savedCurrentGroups = null;

		await this.state.editingStore.regenerate(groups);
		this.state.isRegenerating = false;
		return ok(undefined);
	};

	private addToHistory(groups: Group[], analytics: ScenarioSatisfaction) {
		const entryResult = createWorkspaceHistoryEntry({
			id: this.state.env.idGenerator.generateId(),
			groups,
			generatedAt: new Date(),
			analytics
		});

		if (entryResult.status !== 'ok') return;

		const state: WorkspaceHistoryState = {
			entries: this.state.resultHistory,
			currentIndex: this.state.currentHistoryIndex,
			savedCurrentGroups: this.state.savedCurrentGroups
		};

		const nextState = insertWorkspaceHistoryEntry({
			state,
			entry: entryResult.value,
			maxEntries: MAX_HISTORY
		});

		if (nextState.status !== 'ok') return;

		this.state.resultHistory = nextState.value.entries;
		this.state.currentHistoryIndex = nextState.value.currentIndex;
		this.state.savedCurrentGroups = nextState.value.savedCurrentGroups;
	}

	private readonly switchToHistoryEntry = (index: number) => {
		if (!this.state.editingStore) return;

		const state: WorkspaceHistoryState = {
			entries: this.state.resultHistory,
			currentIndex: this.state.currentHistoryIndex,
			savedCurrentGroups: this.state.savedCurrentGroups
		};

		const selection = selectWorkspaceHistoryEntry({
			state,
			index,
			currentGroups: this.state.view?.groups ?? null
		});

		if (selection.status !== 'ok') return;

		this.state.resultHistory = selection.value.state.entries;
		this.state.currentHistoryIndex = selection.value.state.currentIndex;
		this.state.savedCurrentGroups = selection.value.state.savedCurrentGroups;

		if (selection.value.groupsToApply) {
			this.state.editingStore.regenerate(selection.value.groupsToApply);
		}
	};

	private readonly handleTryAnother = async (): Promise<
		Result<void, 'missing_context' | 'generation_failed'>
	> => {
		if (!this.state.scenario || !this.state.editingStore) {
			return err('missing_context');
		}

		const currentGroups = this.state.view?.groups ?? this.state.scenario.groups ?? [];
		let currentAnalytics = this.state.view?.currentAnalytics ?? this.state.view?.baseline;
		if (!currentAnalytics) {
			currentAnalytics = computeAnalyticsSync({
				groups: currentGroups,
				preferences: this.state.preferences,
				participantSnapshot: this.state.scenario.participantSnapshot,
				programId: this.state.scenario.programId
			});
		}

		if (this.state.currentHistoryIndex === -1 && currentGroups.length > 0 && currentAnalytics) {
			this.addToHistory(currentGroups, currentAnalytics);
		}

		this.state.savedCurrentGroups = null;
		this.state.isTryingAnother = true;

		const existingConfig = (this.state.scenario.algorithmConfig as Record<string, unknown>) ?? {};
		const result = await this.state.env.groupingAlgorithm.generateGroups({
			programId: this.state.scenario.programId,
			studentIds: this.state.scenario.participantSnapshot,
			algorithmConfig: {
				...existingConfig,
				seed: Date.now(),
				avoidRecentGroupmates: this.state.avoidRecentGroupmates
			}
		});

		if (!result.success) {
			this.state.isTryingAnother = false;
			return err('generation_failed');
		}

		const groups: Group[] = result.groups.map((group) => ({
			id: group.id,
			name: group.name,
			capacity: group.capacity,
			memberIds: group.memberIds
		}));

		await this.state.editingStore.regenerate(groups);
		this.state.isTryingAnother = false;
		return ok(undefined);
	};

	private readonly createGroup = (): Result<string, 'create_failed'> => {
		if (!this.state.editingStore) return err('create_failed');
		const result = this.state.editingStore.createGroup();
		if (!result.success || !result.groupId) return err('create_failed');
		this.state.newGroupId = result.groupId;
		return ok(result.groupId);
	};

	private readonly clearNewGroupIdSoon = (delayMs = 100) => {
		setTimeout(() => {
			this.state.newGroupId = null;
		}, delayMs);
	};

	private readonly updateGroup = (
		groupId: string,
		changes: Partial<Pick<Group, 'name' | 'capacity'>>
	): Result<void, string> => {
		if (!this.state.editingStore) return err('update_failed');
		const result = this.state.editingStore.updateGroup(groupId, changes);
		return result.success ? ok(undefined) : err(result.reason ?? 'update_failed');
	};

	private readonly requestDeleteGroup = (
		groupId: string
	): Result<'confirm' | 'deleted', 'missing_context' | 'not_found' | 'delete_failed'> => {
		if (!this.state.editingStore || !this.state.view) return err('missing_context');
		const group = this.state.view.groups.find((item) => item.id === groupId);
		if (!group) return err('not_found');

		if (group.memberIds.length > 0) {
			this.state.groupToDelete = {
				id: groupId,
				name: group.name,
				memberCount: group.memberIds.length
			};
			this.state.showDeleteGroupConfirm = true;
			return ok('confirm');
		}

		const result = this.state.editingStore.deleteGroup(groupId);
		return result.success ? ok('deleted') : err('delete_failed');
	};

	private readonly confirmDeleteGroup = (): Result<void, 'delete_failed' | 'missing_context'> => {
		if (!this.state.editingStore || !this.state.groupToDelete) return err('missing_context');

		const result = this.state.editingStore.deleteGroup(this.state.groupToDelete.id);
		this.state.showDeleteGroupConfirm = false;
		this.state.groupToDelete = null;
		return result.success ? ok(undefined) : err('delete_failed');
	};

	private readonly cancelDeleteGroup = () => {
		this.state.showDeleteGroupConfirm = false;
		this.state.groupToDelete = null;
	};

	private readonly requestAlphabetize = (groupId: string) => {
		if (!this.state.view) return;
		const group = this.state.view.groups.find((item) => item.id === groupId);
		if (!group || group.memberIds.length < 2) return;
		this.state.groupToAlphabetize = {
			id: groupId,
			name: group.name,
			memberCount: group.memberIds.length
		};
		this.state.showAlphabetizeConfirm = true;
	};

	private readonly confirmAlphabetize = (
		studentsById: Record<string, Student>
	): Result<string, 'alphabetize_failed' | 'missing_context'> => {
		if (!this.state.editingStore || !this.state.groupToAlphabetize || !this.state.view) {
			return err('missing_context');
		}

		const group = this.state.view.groups.find(
			(item) => item.id === this.state.groupToAlphabetize?.id
		);
		if (!group) {
			this.state.showAlphabetizeConfirm = false;
			this.state.groupToAlphabetize = null;
			return err('alphabetize_failed');
		}

		const sortedMemberIds = [...group.memberIds].sort((leftId, rightId) => {
			const left = studentsById[leftId];
			const right = studentsById[rightId];
			if (!left && !right) return leftId.localeCompare(rightId);
			if (!left) return 1;
			if (!right) return -1;

			const leftLast = (left.lastName ?? '').trim();
			const rightLast = (right.lastName ?? '').trim();
			const lastCompare = leftLast.localeCompare(rightLast, undefined, { sensitivity: 'base' });
			if (lastCompare !== 0) return lastCompare;

			const leftFirst = (left.firstName ?? '').trim();
			const rightFirst = (right.firstName ?? '').trim();
			const firstCompare = leftFirst.localeCompare(rightFirst, undefined, { sensitivity: 'base' });
			if (firstCompare !== 0) return firstCompare;

			return left.id.localeCompare(right.id);
		});

		const result = this.state.editingStore.reorderGroup(group.id, sortedMemberIds);
		this.state.showAlphabetizeConfirm = false;
		this.state.groupToAlphabetize = null;
		return result.success ? ok(group.name) : err('alphabetize_failed');
	};

	private readonly cancelAlphabetize = () => {
		this.state.showAlphabetizeConfirm = false;
		this.state.groupToAlphabetize = null;
	};

	private readonly alphabetizeUnassigned = (
		studentsById: Record<string, Student>
	): Result<void, 'alphabetize_unassigned_failed' | 'missing_context'> => {
		if (
			!this.state.editingStore ||
			!this.state.view ||
			this.state.view.unassignedStudentIds.length < 2
		) {
			return err('missing_context');
		}

		const sortedIds = [...this.state.view.unassignedStudentIds].sort((leftId, rightId) => {
			const left = studentsById[leftId];
			const right = studentsById[rightId];
			if (!left && !right) return leftId.localeCompare(rightId);
			if (!left) return 1;
			if (!right) return -1;

			const leftLast = (left.lastName ?? '').trim();
			const rightLast = (right.lastName ?? '').trim();
			const lastCompare = leftLast.localeCompare(rightLast, undefined, { sensitivity: 'base' });
			if (lastCompare !== 0) return lastCompare;

			const leftFirst = (left.firstName ?? '').trim();
			const rightFirst = (right.firstName ?? '').trim();
			const firstCompare = leftFirst.localeCompare(rightFirst, undefined, { sensitivity: 'base' });
			if (firstCompare !== 0) return firstCompare;

			return left.id.localeCompare(right.id);
		});

		const result = this.state.editingStore.reorderUnassigned(sortedIds);
		return result.success ? ok(undefined) : err('alphabetize_unassigned_failed');
	};

	private readonly handleSaveStatusEffects = (
		onFailed: (message: string) => void,
		onError: (error: string) => void
	) => {
		const status = this.state.view?.saveStatus ?? null;
		const error = this.state.view?.saveError ?? null;

		if (status && status !== this.state.lastSaveStatus) {
			if (status === 'failed') {
				onFailed(error ? `Save failed: ${error}` : 'Save failed. Please retry.');
				console.error('Scenario save failed', { error });
			} else if (status === 'error' && error) {
				onError(error);
			}
		}

		this.state.lastSaveStatus = status;
	};

	private readonly detectEditsSincePublish = (): boolean => {
		const result = detectWorkspaceEditsSincePublish({
			scenarioLastModifiedAt: this.state.view?.lastModifiedAt,
			latestPublishedAt: this.state.latestPublishedSession?.publishedAt
		});

		if (result.status === 'ok') {
			return result.value.hasEditsSincePublish;
		}

		return true;
	};

	private applyUrlFlags(query: URLSearchParams) {
		const errorParam = query.get('genError');
		if (errorParam) {
			this.state.generationError = errorParam;
			const cleanUrl = typeof location !== 'undefined' ? new URL(location.href) : null;
			if (!cleanUrl) return;
			cleanUrl.searchParams.delete('genError');
			if (typeof history !== 'undefined') {
				history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}`);
			}
		}

		const bannerParam = query.get('showBanner');
		if (bannerParam === 'true') {
			this.state.showGuidanceBanner = true;
			const cleanUrl = typeof location !== 'undefined' ? new URL(location.href) : null;
			if (!cleanUrl) return;
			cleanUrl.searchParams.delete('showBanner');
			if (typeof history !== 'undefined') {
				history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}`);
			}
		}
	}

	private setupKeyboardShortcuts() {
		if (typeof document === 'undefined') return;

		const handleKeydown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return;
			}

			const isMac =
				typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
			const modKey = isMac ? event.metaKey : event.ctrlKey;

			if (modKey && event.key === 'z') {
				if (event.shiftKey) {
					event.preventDefault();
					this.state.editingStore?.redo();
				} else {
					event.preventDefault();
					this.state.editingStore?.undo();
				}
			}
		};

		document.addEventListener('keydown', handleKeydown);
		this.keyboardCleanup = () => document.removeEventListener('keydown', handleKeydown);
	}

	private async loadActivityData(programId: string | undefined) {
		if (!programId) {
			this.state.loadError = 'No activity ID provided.';
			this.state.loading = false;
			return;
		}

		const result = await getActivityData(this.state.env, { programId });

		if (isErr(result)) {
			if (result.error.type === 'PROGRAM_NOT_FOUND') {
				this.state.loadError = `Activity not found: ${programId}`;
			} else {
				this.state.loadError = result.error.message;
			}
			this.state.loading = false;
			return;
		}

		const data = result.value;
		this.state.program = data.program;
		this.state.pool = data.pool;
		this.state.students = data.students;
		this.state.preferences = data.preferences;
		this.state.scenario = data.scenario;
		this.state.sessions = data.sessions;
		this.state.latestPublishedSession = data.latestPublishedSession;

		const publishedSessions = this.state.sessions.filter(
			(session) => session.status === 'PUBLISHED' || session.status === 'ARCHIVED'
		);
		if (publishedSessions.length >= 2) {
			const statsResult = await getProgramPairingStats(this.state.env, { programId });
			if (!isErr(statsResult)) {
				this.state.pairingStats = statsResult.value.pairs;
			}
		}

		if (this.state.scenario) {
			this.initializeEditingStore(this.state.scenario);
		}
		this.state.loading = false;
	}

	private initializeEditingStore(scenario: Scenario) {
		this.unsubscribeEditingStore?.();
		this.unsubscribeEditingStore = null;
		this.state.editingStore?.destroy();

		const store = new ScenarioEditingStore({
			scenarioRepo: this.state.env.scenarioRepo,
			idGenerator: this.state.env.idGenerator
		});
		store.initialize(scenario, this.state.preferences);
		this.unsubscribeEditingStore = store.subscribe((value) => {
			this.state.view = value;
		});
		this.state.editingStore = store;
	}
}

export function createWorkspacePageVm(env: AppEnvContext): WorkspacePageVm {
	return new WorkspacePageVmStore(env);
}
