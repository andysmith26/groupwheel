/**
 * Lightweight demo data generator for onboarding.
 *
 * Creates a single demo activity with 24 students in 6 groups of 4.
 * Uses hardcoded names and pre-assigned groups (no algorithm execution).
 * This is intentionally separate from the full demoData.ts generator,
 * which creates 8 programs with complex data for developer use.
 *
 * @module infrastructure/demo/demoOnboarding
 */

import type { Student, Pool, Program, Scenario, Session, Placement } from '$lib/domain';
import type { Group } from '$lib/domain/group';
import type { IdGenerator } from '$lib/application/ports';
import { buildQuickStartPlaceholderName } from '$lib/utils/quickStartPlaceholderNames';

const ONBOARDING_DEMO_STUDENT_COUNT = 24;

export interface OnboardingDemoData {
  students: Student[];
  pool: Pool;
  program: Program;
  scenario: Scenario;
  session: Session;
  placements: Placement[];
}

/**
 * Generate a complete onboarding demo dataset.
 *
 * Creates 24 students, 1 pool, 1 program (named "Demo: Ms. Johnson's Math Class"),
 * 1 scenario with 6 groups of 4, 1 published session, and 24 placements.
 *
 * All IDs are generated via the provided IdGenerator for testability.
 */
export function generateOnboardingDemoData(
  idGenerator: IdGenerator,
  staffId: string
): OnboardingDemoData {
  const now = new Date();

  // Generate students using the same placeholder naming style as quick-start.
  const students: Student[] = Array.from({ length: ONBOARDING_DEMO_STUDENT_COUNT }, (_, i) => {
    const { firstName, lastName } = buildQuickStartPlaceholderName(i);
    return {
      id: idGenerator.generateId(),
      firstName,
      lastName
    };
  });

  // Create pool
  const poolId = idGenerator.generateId();
  const pool: Pool = {
    id: poolId,
    name: "Demo: Ms. Johnson's Math Class Roster",
    type: 'CLASS',
    memberIds: students.map((s) => s.id),
    status: 'ACTIVE',
    primaryStaffOwnerId: staffId,
    source: 'MANUAL'
  };

  // Create program
  const programId = idGenerator.generateId();
  const program: Program = {
    id: programId,
    name: "Demo: Ms. Johnson's Math Class",
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: now.toISOString() },
    poolIds: [poolId],
    primaryPoolId: poolId,
    ownerStaffIds: [staffId]
  };

  // Create 6 groups of 4 with pre-assigned students
  const groupCount = 6;
  const groupSize = 4;
  const groups: Group[] = [];

  for (let i = 0; i < groupCount; i++) {
    const groupStudents = students.slice(i * groupSize, (i + 1) * groupSize);
    groups.push({
      id: idGenerator.generateId(),
      name: `Group ${i + 1}`,
      capacity: null,
      memberIds: groupStudents.map((s) => s.id)
    });
  }

  // Create scenario with pre-assigned groups
  const scenarioId = idGenerator.generateId();
  const scenario: Scenario = {
    id: scenarioId,
    programId,
    status: 'ADOPTED',
    groups,
    participantSnapshot: students.map((s) => s.id),
    createdAt: now,
    lastModifiedAt: now,
    createdByStaffId: staffId
  };

  // Create published session
  const sessionId = idGenerator.generateId();
  const session: Session = {
    id: sessionId,
    programId,
    name: 'Session 1',
    academicYear: `${now.getFullYear()}`,
    startDate: now,
    endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    status: 'DRAFT',
    scenarioId,
    createdAt: now,
    createdByStaffId: staffId
  };

  // Create placements — one per student
  const placements: Placement[] = [];
  for (const group of groups) {
    for (const studentId of group.memberIds) {
      placements.push({
        id: idGenerator.generateId(),
        sessionId,
        studentId,
        groupId: group.id,
        groupName: group.name,
        preferenceRank: null,
        assignedAt: now,
        assignedByStaffId: staffId,
        startDate: now,
        type: 'INITIAL'
      });
    }
  }

  return { students, pool, program, scenario, session, placements };
}
