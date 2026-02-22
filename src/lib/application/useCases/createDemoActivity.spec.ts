import { describe, it, expect } from 'vitest';
import { createDemoActivity, type CreateDemoActivityDeps } from './createDemoActivity';
import { isOk } from '$lib/types/result';
import {
  InMemoryStudentRepository,
  InMemoryPoolRepository,
  InMemoryProgramRepository,
  InMemoryScenarioRepository,
  InMemorySessionRepository,
  InMemoryPlacementRepository
} from '$lib/infrastructure/repositories/inMemory';

function createCountingIdGenerator() {
  let counter = 0;
  return {
    generateId: () => `id-${++counter}`,
    getCount: () => counter
  };
}

function createDeps(): CreateDemoActivityDeps & {
  studentRepository: InMemoryStudentRepository;
  poolRepository: InMemoryPoolRepository;
  programRepository: InMemoryProgramRepository;
  scenarioRepository: InMemoryScenarioRepository;
  sessionRepository: InMemorySessionRepository;
  placementRepository: InMemoryPlacementRepository;
} {
  return {
    idGenerator: createCountingIdGenerator(),
    studentRepository: new InMemoryStudentRepository(),
    poolRepository: new InMemoryPoolRepository(),
    programRepository: new InMemoryProgramRepository(),
    scenarioRepository: new InMemoryScenarioRepository(),
    sessionRepository: new InMemorySessionRepository(),
    placementRepository: new InMemoryPlacementRepository()
  };
}

describe('createDemoActivity', () => {
  it('creates demo activity with 24 students and 6 groups', async () => {
    const deps = createDeps();
    const result = await createDemoActivity(deps, { staffId: 'owner-1' });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    // 24 students
    const students = await deps.studentRepository.listAll();
    expect(students).toHaveLength(24);

    // Students have realistic names (not "Student N" placeholders)
    const firstNames = students.map((s) => s.firstName);
    expect(firstNames).toContain('Aisha');
    expect(firstNames).toContain('Xavier');

    // Program name starts with "Demo: "
    const programs = await deps.programRepository.listAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toMatch(/^Demo: /);

    // 6 groups in the scenario
    const scenario = await deps.scenarioRepository.getById(result.value.scenarioId);
    expect(scenario).not.toBeNull();
    expect(scenario!.groups).toHaveLength(6);

    // Each group has 4 students
    for (const group of scenario!.groups) {
      expect(group.memberIds).toHaveLength(4);
    }

    // Session is published
    const sessions = await deps.sessionRepository.listByProgramId(programs[0].id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe('PUBLISHED');
  });

  it('placements link all students to groups', async () => {
    const deps = createDeps();
    const result = await createDemoActivity(deps, { staffId: 'owner-1' });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const placements = await deps.placementRepository.listBySessionId(result.value.sessionId);
    expect(placements).toHaveLength(24);

    // Every student assigned to exactly one group
    const studentIds = placements.map((p) => p.studentId);
    const uniqueStudentIds = new Set(studentIds);
    expect(uniqueStudentIds.size).toBe(24);

    // Every placement has a valid group
    const scenario = await deps.scenarioRepository.getById(result.value.scenarioId);
    const groupIds = new Set(scenario!.groups.map((g) => g.id));
    for (const placement of placements) {
      expect(groupIds.has(placement.groupId)).toBe(true);
    }
  });

  it('returns programId, scenarioId, sessionId', async () => {
    const deps = createDeps();
    const result = await createDemoActivity(deps, { staffId: 'owner-1' });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.programId).toBeTruthy();
    expect(result.value.scenarioId).toBeTruthy();
    expect(result.value.sessionId).toBeTruthy();
  });
});
