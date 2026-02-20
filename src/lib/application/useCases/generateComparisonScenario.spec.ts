import { describe, it, expect, beforeEach } from 'vitest';
import { generateComparisonScenario } from './generateComparisonScenario';
import {
	InMemoryProgramRepository,
	InMemoryPoolRepository,
	InMemoryPreferenceRepository
} from '$lib/infrastructure/repositories/inMemory';
import type { Program, Pool, Preference } from '$lib/domain';
import type { IdGenerator, Clock, GroupingAlgorithm } from '$lib/application/ports';

class MockIdGenerator implements IdGenerator {
	private counter = 0;
	generateId(): string {
		return `test-id-${++this.counter}`;
	}
}

class MockClock implements Clock {
	now(): Date {
		return new Date('2024-10-15T10:00:00Z');
	}
}

class SimpleGroupingAlgorithm implements GroupingAlgorithm {
	async generateGroups(params: { studentIds: string[]; algorithmConfig?: unknown }) {
		const config = params.algorithmConfig as { groups?: Array<{ name: string; capacity: number | null }> } | undefined;
		const groupDefs = config?.groups ?? [
			{ name: 'Group 1', capacity: null },
			{ name: 'Group 2', capacity: null }
		];

		const groups = groupDefs.map((def, i) => ({
			id: `group-${i + 1}`,
			name: def.name,
			capacity: def.capacity,
			memberIds: [] as string[]
		}));

		// Distribute students round-robin
		params.studentIds.forEach((id, i) => {
			groups[i % groups.length].memberIds.push(id);
		});

		return { success: true as const, groups };
	}
}

const testProgram: Program = {
	id: 'program-1',
	name: 'Test Activity',
	type: 'CLASS_ACTIVITY',
	timeSpan: { termLabel: 'Fall 2024' },
	poolIds: ['pool-1'],
	primaryPoolId: 'pool-1'
};

const testPool: Pool = {
	id: 'pool-1',
	name: 'All Students',
	type: 'CLASS',
	status: 'ACTIVE',
	memberIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
};

const testPreferences: Preference[] = [
	{
		id: 'pref-1',
		programId: 'program-1',
		studentId: 's1',
		payload: { studentId: 's1', likeGroupIds: ['group-1', 'group-2'], avoidStudentIds: [], avoidGroupIds: [] }
	},
	{
		id: 'pref-2',
		programId: 'program-1',
		studentId: 's2',
		payload: { studentId: 's2', likeGroupIds: ['group-2', 'group-1'], avoidStudentIds: [], avoidGroupIds: [] }
	},
	{
		id: 'pref-3',
		programId: 'program-1',
		studentId: 's3',
		payload: { studentId: 's3', likeGroupIds: ['group-1'], avoidStudentIds: [], avoidGroupIds: [] }
	}
];

describe('generateComparisonScenario', () => {
	let programRepo: InMemoryProgramRepository;
	let poolRepo: InMemoryPoolRepository;
	let preferenceRepo: InMemoryPreferenceRepository;
	let idGenerator: MockIdGenerator;
	let clock: MockClock;
	let algorithm: SimpleGroupingAlgorithm;

	beforeEach(async () => {
		programRepo = new InMemoryProgramRepository();
		poolRepo = new InMemoryPoolRepository();
		preferenceRepo = new InMemoryPreferenceRepository();
		idGenerator = new MockIdGenerator();
		clock = new MockClock();
		algorithm = new SimpleGroupingAlgorithm();

		await programRepo.save(testProgram);
		await poolRepo.save(testPool);
		for (const pref of testPreferences) {
			await preferenceRepo.save(pref);
		}
	});

	function deps() {
		return {
			programRepo,
			poolRepo,
			preferenceRepo,
			idGenerator,
			clock,
			groupingAlgorithm: algorithm
		};
	}

	it('generates a comparison scenario with groups and analytics', async () => {
		const result = await generateComparisonScenario(deps(), {
			programId: 'program-1',
			groups: [
				{ name: 'Group 1', capacity: null },
				{ name: 'Group 2', capacity: null }
			]
		});

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.value.groups).toHaveLength(2);
		expect(result.value.analytics).toBeDefined();
		expect(result.value.participantSnapshot).toHaveLength(8);

		// All students assigned
		const totalAssigned = result.value.groups.reduce((sum, g) => sum + g.memberIds.length, 0);
		expect(totalAssigned).toBe(8);
	});

	it('returns analytics alongside scenario', async () => {
		const result = await generateComparisonScenario(deps(), {
			programId: 'program-1',
			groups: [
				{ name: 'Group 1', capacity: null },
				{ name: 'Group 2', capacity: null }
			]
		});

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(typeof result.value.analytics.percentAssignedTopChoice).toBe('number');
		expect(result.value.analytics.percentAssignedTopChoice).toBeGreaterThanOrEqual(0);
		expect(result.value.analytics.percentAssignedTopChoice).toBeLessThanOrEqual(100);
	});

	it('returns PROGRAM_NOT_FOUND for invalid program', async () => {
		const result = await generateComparisonScenario(deps(), {
			programId: 'nonexistent',
			groups: [{ name: 'Group 1', capacity: null }]
		});

		expect(result.status).toBe('err');
		if (result.status !== 'err') return;
		expect(result.error.type).toBe('PROGRAM_NOT_FOUND');
	});

	it('generates groups using groupSize when no explicit groups provided', async () => {
		const result = await generateComparisonScenario(deps(), {
			programId: 'program-1',
			groupSize: 4
		});

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		// 8 students / 4 per group = 2 groups
		expect(result.value.groups).toHaveLength(2);
	});
});
