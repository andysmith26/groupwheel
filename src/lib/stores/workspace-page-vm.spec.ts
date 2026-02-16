import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '$lib/types/result';
import { createWorkspacePageVm } from './workspace-page-vm.svelte';

const {
	mockGetActivityData,
	mockGetProgramPairingStats,
	mockGenerateScenario,
	mockShowToClass,
	mockInitialize,
	mockDestroy,
	mockUndo,
	mockRedo,
	mockUnsubscribe
} = vi.hoisted(() => ({
	mockGetActivityData: vi.fn(),
	mockGetProgramPairingStats: vi.fn(),
	mockGenerateScenario: vi.fn(),
	mockShowToClass: vi.fn(),
	mockInitialize: vi.fn(),
	mockDestroy: vi.fn(),
	mockUndo: vi.fn(),
	mockRedo: vi.fn(),
	mockUnsubscribe: vi.fn()
}));

vi.mock('$lib/services/appEnvUseCases', () => ({
	getActivityData: mockGetActivityData,
	getProgramPairingStats: mockGetProgramPairingStats,
	generateScenario: mockGenerateScenario,
	showToClass: mockShowToClass
}));

vi.mock('$lib/stores/scenarioEditingStore', () => ({
	ScenarioEditingStore: class {
		initialize = mockInitialize;
		destroy = mockDestroy;
		undo = mockUndo;
		redo = mockRedo;

		subscribe(callback: (value: unknown) => void) {
			callback({ canUndo: false, canRedo: false, groups: [], unassignedStudentIds: [] });
			return mockUnsubscribe;
		}
	}
}));

describe('WorkspacePageVm', () => {
	const createEnv = () =>
		({
			scenarioRepo: {},
			idGenerator: {
				generateId: vi.fn(() => 'id-1')
			}
		}) as never;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetProgramPairingStats.mockResolvedValue(ok({ pairs: [] }));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sets load error when activity id is missing', async () => {
		const vm = createWorkspacePageVm(createEnv());

		await vm.actions.init(undefined, new URLSearchParams());

		expect(vm.state.loadError).toBe('No activity ID provided.');
		expect(vm.state.loading).toBe(false);
		expect(mockGetActivityData).not.toHaveBeenCalled();
	});

	it('loads activity data and pairing stats on init', async () => {
		const vm = createWorkspacePageVm(createEnv());
		const scenario = {
			id: 'scenario-1',
			programId: 'program-1',
			groups: [],
			participantSnapshot: ['student-1'],
			algorithmConfig: {}
		} as never;

		mockGetActivityData.mockResolvedValue(
			ok({
				program: { id: 'program-1', name: 'Test Activity', type: 'GROUPING' },
				pool: { id: 'pool-1', name: 'Roster', studentIds: ['student-1'] },
				students: [{ id: 'student-1', firstName: 'Ada', lastName: 'Lovelace' }],
				preferences: [],
				scenario,
				sessions: [
					{ id: 's1', status: 'PUBLISHED' },
					{ id: 's2', status: 'ARCHIVED' }
				],
				latestPublishedSession: { id: 's2', status: 'ARCHIVED' }
			}) as never
		);
		mockGetProgramPairingStats.mockResolvedValue(
			ok({
				pairs: [
					{ studentAId: 'student-1', studentBId: 'student-2', studentAName: 'Ada', studentBName: 'Grace', count: 2 }
				]
			})
		);

		await vm.actions.init('program-1', new URLSearchParams());

		expect(vm.state.program?.id).toBe('program-1');
		expect(vm.state.students).toHaveLength(1);
		expect(vm.state.pairingStats).toHaveLength(1);
		expect(mockGetActivityData).toHaveBeenCalledTimes(1);
		expect(mockGetProgramPairingStats).toHaveBeenCalledTimes(1);
		expect(mockInitialize).toHaveBeenCalledTimes(1);
		expect(vm.state.loading).toBe(false);
	});

	it('cleans up editing store on dispose', async () => {
		const vm = createWorkspacePageVm(createEnv());
		mockGetActivityData.mockResolvedValue(
			ok({
				program: { id: 'program-1', name: 'Test Activity', type: 'GROUPING' },
				pool: { id: 'pool-1', name: 'Roster', studentIds: ['student-1'] },
				students: [{ id: 'student-1', firstName: 'Ada' }],
				preferences: [],
				scenario: {
					id: 'scenario-1',
					programId: 'program-1',
					groups: [],
					participantSnapshot: ['student-1'],
					algorithmConfig: {}
				},
				sessions: [],
				latestPublishedSession: null
			}) as never
		);

		await vm.actions.init('program-1', new URLSearchParams());

		vm.actions.dispose();

		expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
		expect(mockDestroy).toHaveBeenCalled();
		expect(vm.state.editingStore).toBeNull();
	});

	it('imports preferences using environment id generator', async () => {
		const vm = createWorkspacePageVm(createEnv());
		const save = vi.fn();
		const listByProgramId = vi.fn().mockResolvedValue([{ id: 'pref-1', studentId: 's1' }]);

		vm.state.program = {
			id: 'program-1',
			name: 'Program',
			type: 'GROUPING'
		} as never;
		vm.state.env = {
			idGenerator: { generateId: vi.fn(() => 'pref-1') },
			preferenceRepo: { save, listByProgramId }
		} as never;

		const result = await vm.actions.importPreferences([
			{ studentId: 's1', likeGroupIds: ['A'], avoidStudentIds: [] }
		] as never);

		expect(result.status).toBe('ok');
		expect(save).toHaveBeenCalledTimes(1);
		expect(listByProgramId).toHaveBeenCalledWith('program-1');
		expect(vm.state.preferences).toEqual([{ id: 'pref-1', studentId: 's1' }]);
	});

	it('publishes and appends session when edits exist', async () => {
		const vm = createWorkspacePageVm(createEnv());
		vm.state.program = { id: 'program-1', name: 'Program', type: 'GROUPING' } as never;
		vm.state.scenario = { id: 'scenario-1' } as never;
		vm.state.sessions = [{ id: 'old', status: 'PUBLISHED' } as never];
		vm.state.latestPublishedSession = { id: 'old', status: 'PUBLISHED' } as never;
		mockShowToClass.mockResolvedValue(ok({ id: 'new', status: 'PUBLISHED' }));

		const result = await vm.actions.publishToClass(true);

		expect(result.status).toBe('ok');
		expect((vm.state.latestPublishedSession as { id: string } | null)?.id).toBe('new');
		expect(vm.state.sessions).toHaveLength(2);
		expect(mockShowToClass).toHaveBeenCalledTimes(1);
	});

	it('retries generation and updates scenario when successful', async () => {
		const vm = createWorkspacePageVm(createEnv());
		vm.state.program = { id: 'program-1', name: 'Program', type: 'GROUPING' } as never;
		vm.state.preferences = [];
		mockGenerateScenario.mockResolvedValue(ok({ id: 'scenario-2', programId: 'program-1' }));

		const result = await vm.actions.retryGeneration();

		expect(result.status).toBe('ok');
		expect(vm.state.scenario?.id).toBe('scenario-2');
		expect(vm.state.generationError).toBeNull();
	});

	it('updates key UI state through actions', () => {
		const vm = createWorkspacePageVm(createEnv());

		vm.actions.openPreferencesModal();
		vm.actions.advanceGuidanceStep();
		vm.actions.setAvoidRecentGroupmates(true);

		expect(vm.state.showPreferencesModal).toBe(true);
		expect(vm.state.guidedStep).toBe(2);
		expect(vm.state.avoidRecentGroupmates).toBe(true);

		vm.actions.closePreferencesModal();
		vm.actions.dismissGuidanceBanner();

		expect(vm.state.showPreferencesModal).toBe(false);
		expect(vm.state.bannerDismissed).toBe(true);
	});
});
