import { describe, it, expect } from 'vitest';
import { quickStartActivity, type QuickStartActivityDeps } from './quickStartActivity';
import { isOk, isErr } from '$lib/types/result';
import { isQuickStartPlaceholderName } from '$lib/utils/quickStartPlaceholderNames';
import {
  InMemoryStudentRepository,
  InMemoryPoolRepository,
  InMemoryProgramRepository
} from '$lib/infrastructure/repositories/inMemory';

function createCountingIdGenerator() {
  let counter = 0;
  return {
    generateId: () => `id-${++counter}`,
    getCount: () => counter
  };
}

function createDeps(idGenerator = createCountingIdGenerator()): QuickStartActivityDeps & {
  idGenerator: ReturnType<typeof createCountingIdGenerator>;
} {
  return {
    idGenerator,
    studentRepository: new InMemoryStudentRepository(),
    poolRepository: new InMemoryPoolRepository(),
    programRepository: new InMemoryProgramRepository()
  };
}

describe('quickStartActivity', () => {
  it('creates activity with correct number of placeholder students', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 28,
      groupSize: 4,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.studentCount).toBe(28);
    expect(result.value.groupCount).toBe(7);

    // Verify students were persisted
    const students = await deps.studentRepository.listAll();
    expect(students).toHaveLength(28);

    // Verify naming: goofy nature placeholders with no numeric last names
    const names = students.map((s) => `${s.firstName} ${s.lastName}`);
    expect(new Set(names).size).toBe(28);
    expect(students.every((s) => isQuickStartPlaceholderName(s.firstName, s.lastName ?? ''))).toBe(
      true
    );
    expect(students.some((s) => /^\d+$/.test(s.lastName ?? ''))).toBe(false);
  });

  it('handles uneven division (remainder students)', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 30,
      groupSize: 4,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    // ceil(30/4) = 8 groups
    expect(result.value.groupCount).toBe(8);
  });

  it('rejects studentCount < 2', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 1,
      groupSize: 2,
      staffId: 'owner-1'
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.type).toBe('INVALID_STUDENT_COUNT');
  });

  it('rejects groupSize > studentCount', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 5,
      groupSize: 10,
      staffId: 'owner-1'
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.type).toBe('INVALID_GROUP_SIZE');
  });

  it('rejects groupSize < 2', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 10,
      groupSize: 1,
      staffId: 'owner-1'
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.type).toBe('INVALID_GROUP_SIZE');
  });

  it('uses default activity name when none provided', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 10,
      groupSize: 5,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const programs = await deps.programRepository.listAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('My Activity');
  });

  it('uses provided activity name', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 10,
      groupSize: 5,
      activityName: 'Period 3 Math',
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const programs = await deps.programRepository.listAll();
    expect(programs[0].name).toBe('Period 3 Math');
  });

  it('uses IdGenerator for all IDs (no crypto.randomUUID)', async () => {
    const idGen = createCountingIdGenerator();
    const deps = createDeps(idGen);

    const result = await quickStartActivity(deps, {
      studentCount: 5,
      groupSize: 3,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    // 1 pool ID + 5 student IDs + 1 program ID = 7 IDs generated
    expect(idGen.getCount()).toBe(7);

    // Verify all IDs follow the counting pattern
    const pool = await deps.poolRepository.listAll();
    expect(pool[0].id).toMatch(/^id-/);

    const students = await deps.studentRepository.listAll();
    for (const s of students) {
      expect(s.id).toMatch(/^id-/);
    }
  });

  it('creates pool with correct member IDs', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 4,
      groupSize: 2,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const pools = await deps.poolRepository.listAll();
    expect(pools).toHaveLength(1);
    expect(pools[0].memberIds).toHaveLength(4);
    expect(pools[0].type).toBe('CLASS');
    expect(pools[0].status).toBe('ACTIVE');
  });

  it('creates program linked to pool', async () => {
    const deps = createDeps();
    const result = await quickStartActivity(deps, {
      studentCount: 10,
      groupSize: 5,
      staffId: 'owner-1'
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const programs = await deps.programRepository.listAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].poolIds).toContain(result.value.poolId);
    expect(programs[0].primaryPoolId).toBe(result.value.poolId);
    expect(programs[0].type).toBe('CLASS_ACTIVITY');
  });
});
