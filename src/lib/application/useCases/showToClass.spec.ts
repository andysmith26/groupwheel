import { describe, it, expect, beforeEach } from 'vitest';
import { showToClass } from './showToClass';
import type { ShowToClassError } from './showToClass';
import {
	InMemoryProgramRepository,
	InMemorySessionRepository,
	InMemoryScenarioRepository,
	InMemoryPreferenceRepository,
	InMemoryPlacementRepository
} from '$lib/infrastructure/repositories/inMemory';
import type { Program, Scenario, Session, Preference } from '$lib/domain';
import type { IdGenerator, Clock } from '$lib/application/ports';

class MockIdGenerator implements IdGenerator {
	private counter = 0;
	generateId(): string {
		return `test-id-${++this.counter}`;
	}
}

class MockClock implements Clock {
	private time: Date;
	constructor(time: Date = new Date('2024-10-15T10:00:00Z')) {
		this.time = time;
	}
	now(): Date {
		return this.time;
	}
}

function expectErrType<T extends { type: string }, K extends T['type']>(
	result: { status: 'ok'; value: unknown } | { status: 'err'; error: T },
	expectedType: K
): Extract<T, { type: K }> {
	if (result.status !== 'err') {
		throw new Error(`Expected error result but received ${result.status}`);
	}
	if (result.error.type !== expectedType) {
		throw new Error(`Expected error type ${expectedType} but received ${result.error.type}`);
	}
	return result.error as Extract<T, { type: K }>;
}

const testProgram: Program = {
	id: 'program-1',
	name: 'Math Class',
	type: 'CLASS_ACTIVITY',
	timeSpan: { termLabel: 'Fall 2024' },
	poolIds: ['pool-1'],
	primaryPoolId: 'pool-1'
};

const testScenario: Scenario = {
	id: 'scenario-1',
	programId: 'program-1',
	status: 'DRAFT',
	groups: [
		{ id: 'group-1', name: 'Table A', memberIds: ['s1', 's2'], capacity: 4 },
		{ id: 'group-2', name: 'Table B', memberIds: ['s3'], capacity: 4 }
	],
	participantSnapshot: ['s1', 's2', 's3'],
	createdAt: new Date('2024-10-01'),
	lastModifiedAt: new Date('2024-10-01')
};

describe('showToClass', () => {
	let programRepo: InMemoryProgramRepository;
	let sessionRepo: InMemorySessionRepository;
	let scenarioRepo: InMemoryScenarioRepository;
	let preferenceRepo: InMemoryPreferenceRepository;
	let placementRepo: InMemoryPlacementRepository;
	let idGenerator: MockIdGenerator;
	let clock: MockClock;

	function deps() {
		return { programRepo, sessionRepo, scenarioRepo, preferenceRepo, placementRepo, idGenerator, clock };
	}

	beforeEach(async () => {
		programRepo = new InMemoryProgramRepository([testProgram]);
		sessionRepo = new InMemorySessionRepository();
		scenarioRepo = new InMemoryScenarioRepository([testScenario]);
		preferenceRepo = new InMemoryPreferenceRepository();
		placementRepo = new InMemoryPlacementRepository();
		idGenerator = new MockIdGenerator();
		clock = new MockClock();
	});

	it('should return PROGRAM_NOT_FOUND when program does not exist', async () => {
		const result = await showToClass(deps(), {
			programId: 'nonexistent',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('err');
		const error = expectErrType<ShowToClassError, 'PROGRAM_NOT_FOUND'>(result, 'PROGRAM_NOT_FOUND');
		expect(error.programId).toBe('nonexistent');
	});

	it('should return SCENARIO_NOT_FOUND when scenario does not exist', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'nonexistent'
		});

		expect(result.status).toBe('err');
		const error = expectErrType<ShowToClassError, 'SCENARIO_NOT_FOUND'>(result, 'SCENARIO_NOT_FOUND');
		expect(error.scenarioId).toBe('nonexistent');
	});

	it('should create a PUBLISHED session (not DRAFT)', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.value.status).toBe('PUBLISHED');
		}
	});

	it('should set scenarioId and publishedAt on the session', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.value.scenarioId).toBe('scenario-1');
			expect(result.value.publishedAt).toEqual(clock.now());
		}
	});

	it('should auto-generate session name with program name and date', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.value.name).toContain('Math Class');
		}
	});

	it('should auto-generate academicYear', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			const year = clock.now().getFullYear();
			expect(result.value.academicYear).toBe(`${year}-${year + 1}`);
		}
	});

	it('should archive existing PUBLISHED sessions before creating new one', async () => {
		// Create an existing published session
		const existingSession: Session = {
			id: 'old-session',
			programId: 'program-1',
			name: 'Old Session',
			academicYear: '2024-2025',
			startDate: new Date('2024-09-01'),
			endDate: new Date('2024-12-01'),
			status: 'PUBLISHED',
			scenarioId: 'scenario-old',
			publishedAt: new Date('2024-09-01'),
			createdAt: new Date('2024-09-01')
		};
		await sessionRepo.save(existingSession);

		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');

		// Check the old session is now ARCHIVED
		const oldSession = await sessionRepo.getById('old-session');
		expect(oldSession?.status).toBe('ARCHIVED');
	});

	it('should create Placements for all students in all groups', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			const sessionId = result.value.id;
			const placements = await placementRepo.listBySessionId(sessionId);

			// 3 students across 2 groups
			expect(placements).toHaveLength(3);

			const studentIds = placements.map((p) => p.studentId).sort();
			expect(studentIds).toEqual(['s1', 's2', 's3']);

			// Check group assignments
			const s1Placement = placements.find((p) => p.studentId === 's1');
			expect(s1Placement?.groupId).toBe('group-1');
			expect(s1Placement?.groupName).toBe('Table A');

			const s3Placement = placements.find((p) => p.studentId === 's3');
			expect(s3Placement?.groupId).toBe('group-2');
			expect(s3Placement?.groupName).toBe('Table B');
		}
	});

	it('should set correct preference ranks on placements', async () => {
		// Set up preferences: s1 prefers Table A (1st), Table B (2nd)
		const pref: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 's1',
			payload: {
				studentId: 's1',
				likeGroupIds: ['Table A', 'Table B'],
				avoidStudentIds: [],
				avoidGroupIds: []
			}
		};
		await preferenceRepo.save(pref);

		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			const placements = await placementRepo.listBySessionId(result.value.id);

			// s1 got Table A which is their 1st choice
			const s1Placement = placements.find((p) => p.studentId === 's1');
			expect(s1Placement?.preferenceRank).toBe(1);
			expect(s1Placement?.preferenceSnapshot).toEqual(['Table A', 'Table B']);

			// s2 has no preferences
			const s2Placement = placements.find((p) => p.studentId === 's2');
			expect(s2Placement?.preferenceRank).toBeNull();
		}
	});

	it('should persist the session to the repository', async () => {
		const result = await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			const saved = await sessionRepo.getById(result.value.id);
			expect(saved).not.toBeNull();
			expect(saved?.status).toBe('PUBLISHED');
			expect(saved?.scenarioId).toBe('scenario-1');
		}
	});

	it('should not archive DRAFT or ARCHIVED sessions', async () => {
		const draftSession: Session = {
			id: 'draft-session',
			programId: 'program-1',
			name: 'Draft',
			academicYear: '2024-2025',
			startDate: new Date('2024-09-01'),
			endDate: new Date('2024-12-01'),
			status: 'DRAFT',
			createdAt: new Date('2024-09-01')
		};
		const archivedSession: Session = {
			id: 'archived-session',
			programId: 'program-1',
			name: 'Archived',
			academicYear: '2024-2025',
			startDate: new Date('2024-09-01'),
			endDate: new Date('2024-12-01'),
			status: 'ARCHIVED',
			createdAt: new Date('2024-09-01')
		};
		await sessionRepo.save(draftSession);
		await sessionRepo.save(archivedSession);

		await showToClass(deps(), {
			programId: 'program-1',
			scenarioId: 'scenario-1'
		});

		// Draft and archived sessions should remain unchanged
		const draft = await sessionRepo.getById('draft-session');
		expect(draft?.status).toBe('DRAFT');

		const archived = await sessionRepo.getById('archived-session');
		expect(archived?.status).toBe('ARCHIVED');
	});
});
