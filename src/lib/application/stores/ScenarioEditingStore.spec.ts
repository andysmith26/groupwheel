import { get } from 'svelte/store';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import type { Preference, Scenario } from '$lib/domain';
import { ScenarioEditingStore } from './ScenarioEditingStore.svelte';
import { InMemoryScenarioRepository } from '$lib/infrastructure/repositories/inMemory';
import type { ScenarioRepository } from '$lib/application/ports';

function createScenario(): Scenario {
	return {
		id: 'scn-1',
		programId: 'prog-1',
		status: 'DRAFT',
		groups: [
			{ id: 'g1', name: 'Group 1', capacity: 2, memberIds: ['s1', 's3'] },
			{ id: 'g2', name: 'Group 2', capacity: 2, memberIds: ['s2'] }
		],
		participantSnapshot: ['s1', 's2', 's3'],
		createdAt: new Date('2024-01-01T00:00:00Z')
	};
}

const preferences: Preference[] = [
	{ id: 'p1', programId: 'prog-1', studentId: 's1', payload: { likeStudentIds: ['s2'] } },
	{ id: 'p2', programId: 'prog-1', studentId: 's2', payload: { likeStudentIds: ['s1'] } },
	{ id: 'p3', programId: 'prog-1', studentId: 's3', payload: { likeStudentIds: ['s2'] } }
];

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('ScenarioEditingStore', () => {
	it('moves students, tracks history, and supports undo/redo', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({ scenarioRepo: repo, debounceMs: 10 });
		store.initialize(createScenario(), preferences);

		const result = store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		expect(result.success).toBe(true);
		let view = get(store);
		expect(view.canUndo).toBe(true);
		expect(view.canRedo).toBe(false);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).not.toContain('s1');
		expect(view.groups.find((g) => g.id === 'g2')?.memberIds).toContain('s1');

		const undoResult = store.undo();
		expect(undoResult).toBe(true);
		view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).toContain('s1');
		expect(view.groups.find((g) => g.id === 'g2')?.memberIds).not.toContain('s1');

		const redoResult = store.redo();
		expect(redoResult).toBe(true);
		view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).not.toContain('s1');
		expect(view.groups.find((g) => g.id === 'g2')?.memberIds).toContain('s1');
	});

	it('blocks moves when target group is full', () => {
		const scenario = createScenario();
		scenario.groups[1].capacity = 1; // g2 already has one member
		const repo = new InMemoryScenarioRepository([scenario]);
		const store = new ScenarioEditingStore({ scenarioRepo: repo, debounceMs: 10 });
		store.initialize(scenario, preferences);

		const result = store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		expect(result.success).toBe(false);
		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).toContain('s1');
		expect(view.groups.find((g) => g.id === 'g2')?.memberIds).not.toContain('s1');
	});

	it('debounces saves and transitions to saved then idle', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const updateSpy = vi.spyOn(repo, 'update');
		const store = new ScenarioEditingStore({ scenarioRepo: repo, debounceMs: 10 });
		store.initialize(createScenario(), preferences);

		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});
		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's2',
			source: 'g2',
			target: 'g1'
		});

		expect(get(store).saveStatus).toBe('idle');

		await vi.advanceTimersByTimeAsync(10); // debounce
		await vi.runAllTicks();

		expect(updateSpy).toHaveBeenCalledTimes(1);
		expect(get(store).saveStatus).toBe('saved');

		await vi.advanceTimersByTimeAsync(2000);
		expect(get(store).saveStatus).toBe('idle');
	});

	it('retries saves and marks failed after max attempts', async () => {
		const failingRepo: ScenarioRepository = {
			getById: vi.fn(),
			getByProgramId: vi.fn(),
			update: vi.fn().mockRejectedValue(new Error('nope')),
			save: vi.fn().mockRejectedValue(new Error('still nope'))
		};
		const store = new ScenarioEditingStore({ scenarioRepo: failingRepo, debounceMs: 10 });
		store.initialize(createScenario(), preferences);

		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		await vi.advanceTimersByTimeAsync(10); // debounce
		await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 50);

		expect(get(store).saveStatus).toBe('failed');
		expect(get(store).retryCount).toBe(4);

		const result = store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's2',
			source: 'g2',
			target: 'g1'
		});
		expect(result.success).toBe(false);
	});

	it('recomputes analytics and delta after changes', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({ scenarioRepo: repo, debounceMs: 10 });
		store.initialize(createScenario(), preferences);

		const baseline = get(store).currentAnalytics;
		expect(baseline?.percentAssignedTopChoice).toBe(0);

		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		await vi.advanceTimersByTimeAsync(10);
		const view = get(store);
		expect(view.currentAnalytics?.percentAssignedTopChoice).toBeGreaterThan(0);
		expect(view.analyticsDelta?.topChoice).toBeGreaterThan(0);
	});

	it('regenerates groups, clears history, and resets baseline', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({ scenarioRepo: repo, debounceMs: 10 });
		store.initialize(createScenario(), preferences);

		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		await store.regenerate([
			{ id: 'g1', name: 'G1', capacity: 2, memberIds: ['s1'] },
			{ id: 'g2', name: 'G2', capacity: 2, memberIds: ['s2', 's3'] }
		]);

		const view = get(store);
		expect(view.historyIndex).toBe(-1);
		expect(view.baseline?.percentAssignedTopChoice).toBeGreaterThanOrEqual(0);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).toEqual(['s1']);
	});
});
