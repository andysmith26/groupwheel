import { get } from 'svelte/store';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import type { Preference, Scenario } from '$lib/domain';
import { ScenarioEditingStore } from './scenarioEditingStore';
import { InMemoryScenarioRepository } from '$lib/infrastructure/repositories/inMemory';
import type { ScenarioRepository, IdGenerator } from '$lib/application/ports';

class MockIdGenerator implements IdGenerator {
	private counter = 0;
	generateId(): string {
		return `test-id-${++this.counter}`;
	}
}

function createScenario(): Scenario {
	const createdAt = new Date('2024-01-01T00:00:00Z');
	return {
		id: 'scn-1',
		programId: 'prog-1',
		status: 'DRAFT',
		groups: [
			{ id: 'g1', name: 'Group 1', capacity: 2, memberIds: ['s1', 's3'] },
			{ id: 'g2', name: 'Group 2', capacity: 2, memberIds: ['s2'] }
		],
		participantSnapshot: ['s1', 's2', 's3'],
		createdAt,
		lastModifiedAt: createdAt
	};
}

const preferences: Preference[] = [
	{ id: 'p1', programId: 'prog-1', studentId: 's1', payload: { likeGroupIds: ['g1'] } },
	{ id: 'p2', programId: 'prog-1', studentId: 's2', payload: { likeGroupIds: ['g2'] } },
	{ id: 'p3', programId: 'prog-1', studentId: 's3', payload: { likeGroupIds: ['g1'] } }
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
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
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

	it('allows moves to groups at capacity (over-enrollment is allowed)', () => {
		const scenario = createScenario();
		scenario.groups[1].capacity = 1; // g2 already has one member
		const repo = new InMemoryScenarioRepository([scenario]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(scenario, preferences);

		const result = store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		// Move should succeed - over-enrollment is allowed (visual warning in UI)
		expect(result.success).toBe(true);
		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.memberIds).not.toContain('s1');
		expect(view.groups.find((g) => g.id === 'g2')?.memberIds).toContain('s1');
	});

	it('debounces saves and transitions to saved then idle', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const updateSpy = vi.spyOn(repo, 'update');
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
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
			save: vi.fn().mockRejectedValue(new Error('still nope')),
			delete: vi.fn()
		};
		const store = new ScenarioEditingStore({
			scenarioRepo: failingRepo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
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
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		// Preferences with students wanting specific groups
		const prefsWithGroupChoices: Preference[] = [
			{ id: 'p1', programId: 'prog-1', studentId: 's1', payload: { likeGroupIds: ['g2'] } }, // s1 wants g2
			{ id: 'p2', programId: 'prog-1', studentId: 's2', payload: { likeGroupIds: ['g2'] } }, // s2 wants g2
			{ id: 'p3', programId: 'prog-1', studentId: 's3', payload: { likeGroupIds: ['g1'] } } // s3 wants g1
		];
		store.initialize(createScenario(), prefsWithGroupChoices);

		// s1 is in g1 but wants g2, so baseline satisfaction is not 100%
		const baseline = get(store).currentAnalytics;
		expect(baseline?.percentAssignedTopChoice).toBeLessThan(100);

		// Move s1 from g1 to g2 (where they want to be)
		store.dispatch({
			type: 'MOVE_STUDENT',
			studentId: 's1',
			source: 'g1',
			target: 'g2'
		});

		await vi.advanceTimersByTimeAsync(10);
		const view = get(store);
		// After moving s1 to g2, satisfaction should improve
		expect(view.currentAnalytics?.percentAssignedTopChoice).toBeGreaterThan(
			baseline?.percentAssignedTopChoice ?? 0
		);
	});

	it('regenerates groups, clears history, and resets baseline', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
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

describe('Group shell operations', () => {
	it('creates a new group with unique name', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.createGroup();

		expect(result.success).toBe(true);
		expect(result.groupId).toBeDefined();

		const view = get(store);
		expect(view.groups.length).toBe(3);
		const newGroup = view.groups.find((g) => g.id === result.groupId);
		expect(newGroup).toBeDefined();
		// Default base name is "Group", which is unique since existing groups are "Group 1" and "Group 2"
		expect(newGroup?.name).toBe('Group');
		expect(newGroup?.capacity).toBeNull();
		expect(newGroup?.memberIds).toEqual([]);
		expect(view.canUndo).toBe(true);
	});

	it('auto-increments name when creating group with duplicate name', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.createGroup('Group 1');

		expect(result.success).toBe(true);
		const view = get(store);
		const newGroup = view.groups.find((g) => g.id === result.groupId);
		// Should auto-increment since "Group 1" already exists
		expect(newGroup?.name).not.toBe('Group 1');
		expect(newGroup?.name).toMatch(/^Group 1 \d+$/);
	});

	it('deletes empty group immediately', () => {
		const scenario = createScenario();
		scenario.groups.push({ id: 'g3', name: 'Empty Group', capacity: 5, memberIds: [] });
		const repo = new InMemoryScenarioRepository([scenario]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(scenario, preferences);

		const result = store.deleteGroup('g3');

		expect(result.success).toBe(true);
		const view = get(store);
		expect(view.groups.length).toBe(2);
		expect(view.groups.find((g) => g.id === 'g3')).toBeUndefined();
		expect(view.canUndo).toBe(true);
	});

	it('deletes group with students, displacing them to unassigned', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		// g1 has students s1 and s3
		const result = store.deleteGroup('g1');

		expect(result.success).toBe(true);
		const view = get(store);
		expect(view.groups.length).toBe(1);
		expect(view.groups.find((g) => g.id === 'g1')).toBeUndefined();
		// s1 and s3 should now be unassigned
		expect(view.unassignedStudentIds).toContain('s1');
		expect(view.unassignedStudentIds).toContain('s3');
	});

	it('undoes deleted group restoring students', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		store.deleteGroup('g1');
		const undoResult = store.undo();

		expect(undoResult).toBe(true);
		const view = get(store);
		expect(view.groups.length).toBe(2);
		const restoredGroup = view.groups.find((g) => g.id === 'g1');
		expect(restoredGroup).toBeDefined();
		expect(restoredGroup?.memberIds).toContain('s1');
		expect(restoredGroup?.memberIds).toContain('s3');
	});

	it('updates group name', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.updateGroup('g1', { name: 'Alpha Team' });

		expect(result.success).toBe(true);
		let view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Alpha Team');

		// Wait for coalesce timeout to commit to history
		await vi.advanceTimersByTimeAsync(500);

		view = get(store);
		expect(view.canUndo).toBe(true);
	});

	it('updates group capacity', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.updateGroup('g1', { capacity: 10 });

		expect(result.success).toBe(true);
		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.capacity).toBe(10);
	});

	it('undoes group name update', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		store.updateGroup('g1', { name: 'New Name' });

		// Wait for coalesce timeout
		await vi.advanceTimersByTimeAsync(500);

		const undoResult = store.undo();
		expect(undoResult).toBe(true);

		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Group 1');
	});

	it('flushes pending updates before undo', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		store.updateGroup('g1', { name: 'New Name' });
		// Don't wait for coalesce - undo immediately
		const undoResult = store.undo();

		expect(undoResult).toBe(true);
		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Group 1');
	});

	it('rejects duplicate group name on update', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.updateGroup('g1', { name: 'Group 2' });

		expect(result.success).toBe(false);
		expect(result.reason).toBe('duplicate_name');
		// Name should remain unchanged
		const view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Group 1');
	});

	it('rejects empty group name on update', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.updateGroup('g1', { name: '   ' });

		expect(result.success).toBe(false);
		expect(result.reason).toBe('empty_name');
	});

	it('coalesces rapid name updates into single history entry', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		// Simulate typing character by character
		store.updateGroup('g1', { name: 'A' });
		await vi.advanceTimersByTimeAsync(100);
		store.updateGroup('g1', { name: 'Al' });
		await vi.advanceTimersByTimeAsync(100);
		store.updateGroup('g1', { name: 'Alp' });
		await vi.advanceTimersByTimeAsync(100);
		store.updateGroup('g1', { name: 'Alph' });
		await vi.advanceTimersByTimeAsync(100);
		store.updateGroup('g1', { name: 'Alpha' });

		// Before coalesce timeout, no history entry yet
		let view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Alpha');

		// Wait for full coalesce timeout
		await vi.advanceTimersByTimeAsync(500);

		view = get(store);
		// Should only have one command in history
		expect(view.historyLength).toBe(1);
		expect(view.canUndo).toBe(true);

		// Undo should revert to original name, not intermediate
		store.undo();
		view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Group 1');
	});

	it('returns group_not_found when deleting non-existent group', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const result = store.deleteGroup('non-existent');

		expect(result.success).toBe(false);
		expect(result.reason).toBe('group_not_found');
	});

	it('redoes create group operation', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		const createResult = store.createGroup('New Group');
		const groupId = createResult.groupId;

		store.undo();
		let view = get(store);
		expect(view.groups.find((g) => g.id === groupId)).toBeUndefined();

		store.redo();
		view = get(store);
		expect(view.groups.find((g) => g.id === groupId)).toBeDefined();
	});

	it('redoes delete group operation', () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		store.deleteGroup('g1');
		store.undo();
		let view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')).toBeDefined();

		store.redo();
		view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')).toBeUndefined();
	});

	it('redoes update group operation', async () => {
		const repo = new InMemoryScenarioRepository([createScenario()]);
		const store = new ScenarioEditingStore({
			scenarioRepo: repo,
			idGenerator: new MockIdGenerator(),
			debounceMs: 10
		});
		store.initialize(createScenario(), preferences);

		store.updateGroup('g1', { name: 'Updated Name' });
		await vi.advanceTimersByTimeAsync(500);

		store.undo();
		let view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Group 1');

		store.redo();
		view = get(store);
		expect(view.groups.find((g) => g.id === 'g1')?.name).toBe('Updated Name');
	});
});
