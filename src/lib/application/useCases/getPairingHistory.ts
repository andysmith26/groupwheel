import type { PlacementRepository, SessionRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * A record of when two students were grouped together.
 */
export interface PairingInstance {
  sessionId: string;
  sessionName: string;
  groupId: string;
  groupName: string;
  date: Date;
}

/**
 * Input for getting pairing history between two students.
 */
export interface GetPairingHistoryInput {
  studentAId: string;
  studentBId: string;
  /** Optional: limit to placements within a specific program's sessions. */
  programId?: string;
}

/**
 * Result of getting pairing history.
 */
export interface PairingHistoryResult {
  studentAId: string;
  studentBId: string;
  /** Total number of times the students were grouped together. */
  totalPairings: number;
  /** Details of each time they were grouped together. */
  pairings: PairingInstance[];
}

/**
 * Get the history of how many times two students have been grouped together.
 *
 * This is useful for:
 * - Showing teachers pairing frequency before generating groups
 * - Implementing "balance pairing frequency" constraints
 * - Auditing past groupings
 */
export async function getPairingHistory(
  deps: {
    placementRepo: PlacementRepository;
    sessionRepo: SessionRepository;
  },
  input: GetPairingHistoryInput
): Promise<Result<PairingHistoryResult, never>> {
  // Get all placements for both students
  const [placementsA, placementsB] = await Promise.all([
    deps.placementRepo.listByStudentId(input.studentAId),
    deps.placementRepo.listByStudentId(input.studentBId)
  ]);

  // Build a map of studentB's placements by (sessionId, groupId) for fast lookup
  const studentBGroups = new Map<string, (typeof placementsB)[0]>();
  for (const placement of placementsB) {
    const key = `${placement.sessionId}:${placement.groupId}`;
    studentBGroups.set(key, placement);
  }

  // Find sessions where both students were in the same group
  const pairingPlacements: Array<{
    placementA: (typeof placementsA)[0];
    placementB: (typeof placementsB)[0];
  }> = [];
  for (const placementA of placementsA) {
    const key = `${placementA.sessionId}:${placementA.groupId}`;
    const placementB = studentBGroups.get(key);
    if (placementB) {
      pairingPlacements.push({ placementA, placementB });
    }
  }

  // If filtering by program, we need to load sessions and filter
  let filteredPairings = pairingPlacements;
  if (input.programId) {
    const sessionIds = [...new Set(pairingPlacements.map((p) => p.placementA.sessionId))];
    const sessions = await Promise.all(sessionIds.map((id) => deps.sessionRepo.getById(id)));
    const sessionMap = new Map(sessions.filter(Boolean).map((s) => [s!.id, s!]));

    filteredPairings = pairingPlacements.filter((p) => {
      const session = sessionMap.get(p.placementA.sessionId);
      return session?.programId === input.programId;
    });
  }

  // Load session details for the remaining pairings
  const sessionIds = [...new Set(filteredPairings.map((p) => p.placementA.sessionId))];
  const sessions = await Promise.all(sessionIds.map((id) => deps.sessionRepo.getById(id)));
  const sessionMap = new Map(sessions.filter(Boolean).map((s) => [s!.id, s!]));

  // Build the result
  const pairings: PairingInstance[] = filteredPairings
    .map((p) => {
      const session = sessionMap.get(p.placementA.sessionId);
      return {
        sessionId: p.placementA.sessionId,
        sessionName: session?.name ?? 'Unknown Session',
        groupId: p.placementA.groupId,
        groupName: p.placementA.groupName,
        date: session?.startDate ?? p.placementA.assignedAt
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

  return ok({
    studentAId: input.studentAId,
    studentBId: input.studentBId,
    totalPairings: pairings.length,
    pairings
  });
}
