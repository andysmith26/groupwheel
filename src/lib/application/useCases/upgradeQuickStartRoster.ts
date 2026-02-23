/**
 * upgradeQuickStartRoster use case.
 *
 * Replaces placeholder students in a quick-start activity with real student names.
 * Preserves the group structure: if the imported count matches, groups keep the same
 * size. If counts differ, groups are invalidated and need regeneration.
 *
 * The experience should feel like "upgrading" not "starting over" (Decision 5, Banked Note #2).
 *
 * @module application/useCases/upgradeQuickStartRoster
 */

import type {
  PoolRepository,
  StudentRepository,
  IdGenerator
} from '$lib/application/ports';
import type { Student } from '$lib/domain';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

// =============================================================================
// Input / Output / Error Types
// =============================================================================

export interface UpgradeQuickStartRosterInput {
  poolId: string;
  /** New student names to replace placeholders */
  students: Array<{ firstName: string; lastName: string }>;
}

export interface UpgradeQuickStartRosterResult {
  newStudents: Student[];
  previousCount: number;
  newCount: number;
  /** True when counts match — group structure can be preserved via ID remapping */
  countsMatch: boolean;
  /** When countsMatch is true, maps old placeholder student ID → new student ID (positional) */
  idMapping: Map<string, string>;
}

export type UpgradeQuickStartRosterError =
  | { type: 'POOL_NOT_FOUND'; message: string }
  | { type: 'EMPTY_ROSTER'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

// =============================================================================
// Dependencies
// =============================================================================

export interface UpgradeQuickStartRosterDeps {
  idGenerator: IdGenerator;
  studentRepository: StudentRepository;
  poolRepository: PoolRepository;
}

// =============================================================================
// Use Case Implementation
// =============================================================================

export async function upgradeQuickStartRoster(
  deps: UpgradeQuickStartRosterDeps,
  input: UpgradeQuickStartRosterInput
): Promise<Result<UpgradeQuickStartRosterResult, UpgradeQuickStartRosterError>> {
  if (input.students.length === 0) {
    return err({
      type: 'EMPTY_ROSTER',
      message: 'At least one student is required'
    });
  }

  try {
    const pool = await deps.poolRepository.getById(input.poolId);
    if (!pool) {
      return err({
        type: 'POOL_NOT_FOUND',
        message: `Pool ${input.poolId} not found`
      });
    }

    const previousMemberIds = pool.memberIds;
    const previousCount = previousMemberIds.length;
    const newCount = input.students.length;
    const countsMatch = previousCount === newCount;

    // Create new student entities
    const newStudents: Student[] = input.students.map((s) => ({
      id: deps.idGenerator.generateId(),
      firstName: s.firstName,
      lastName: s.lastName
    }));

    // Persist new students
    await deps.studentRepository.saveMany(newStudents);

    // Build ID mapping (positional) for group structure preservation
    const idMapping = new Map<string, string>();
    if (countsMatch) {
      for (let i = 0; i < previousCount; i++) {
        idMapping.set(previousMemberIds[i], newStudents[i].id);
      }
    }

    // Update pool to reference new students instead of placeholders
    const updatedPool = {
      ...pool,
      memberIds: newStudents.map((s) => s.id),
      source: 'IMPORT' as const
    };
    await deps.poolRepository.update(updatedPool);

    return ok({
      newStudents,
      previousCount,
      newCount,
      countsMatch,
      idMapping
    });
  } catch (e) {
    return err({
      type: 'PERSISTENCE_ERROR',
      message: e instanceof Error ? e.message : 'Failed to upgrade roster'
    });
  }
}
