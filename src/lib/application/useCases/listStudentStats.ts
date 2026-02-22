import type { Placement } from '$lib/domain';
import type {
  PlacementRepository,
  SessionRepository,
  StudentRepository,
  PoolRepository,
  ProgramRepository
} from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Aggregated statistics for a single student.
 */
export interface StudentStat {
  studentId: string;
  studentName: string;
  /** Total number of sessions this student has been placed in. */
  totalPlacements: number;
  /** Number of times placed in their first choice. */
  firstChoiceCount: number;
  /** Percentage of placements that were first choice. */
  firstChoicePercent: number;
  /** Average preference rank (1 = best). Null if never had preferences. */
  avgRank: number | null;
}

/**
 * Input for listing student statistics for a program.
 */
export interface ListStudentStatsInput {
  programId: string;
}

/**
 * Result of listing student statistics.
 */
export interface ListStudentStatsResult {
  programId: string;
  /** Number of published sessions analyzed. */
  totalSessions: number;
  /** Statistics for each student, sorted by name. */
  students: StudentStat[];
}

/**
 * Get aggregated placement statistics for all students in a program.
 *
 * Analyzes all published sessions to compute per-student satisfaction metrics.
 * Useful for identifying students who consistently get (or don't get) their preferences.
 */
export async function listStudentStats(
  deps: {
    placementRepo: PlacementRepository;
    sessionRepo: SessionRepository;
    studentRepo: StudentRepository;
    poolRepo: PoolRepository;
    programRepo: ProgramRepository;
  },
  input: ListStudentStatsInput
): Promise<Result<ListStudentStatsResult, never>> {
  // Get the program to find its pools
  const program = await deps.programRepo.getById(input.programId);
  if (!program) {
    return ok({
      programId: input.programId,
      totalSessions: 0,
      students: []
    });
  }

  // Get all sessions for this program
  const sessions = await deps.sessionRepo.listByProgramId(input.programId);
  const publishedSessions = sessions.filter(
    (s) => s.status === 'PUBLISHED' || s.status === 'ARCHIVED'
  );

  if (publishedSessions.length === 0) {
    return ok({
      programId: input.programId,
      totalSessions: 0,
      students: []
    });
  }

  // Load all placements for all published sessions
  const allPlacements: Placement[] = [];
  for (const session of publishedSessions) {
    const sessionPlacements = await deps.placementRepo.listBySessionId(session.id);
    allPlacements.push(...sessionPlacements);
  }

  // Group placements by student
  const placementsByStudent = new Map<string, Placement[]>();
  for (const placement of allPlacements) {
    const existing = placementsByStudent.get(placement.studentId) ?? [];
    existing.push(placement);
    placementsByStudent.set(placement.studentId, existing);
  }

  // Get all student IDs
  const studentIds = [...placementsByStudent.keys()];

  // Load student data
  const students = await deps.studentRepo.getByIds(studentIds);
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Calculate stats for each student
  const studentStats: StudentStat[] = [];

  for (const [studentId, placements] of placementsByStudent) {
    const student = studentMap.get(studentId);
    const studentName = student
      ? `${student.firstName}${student.lastName ? ' ' + student.lastName : ''}`
      : studentId;

    let firstChoiceCount = 0;
    let totalRank = 0;
    let rankedCount = 0;

    for (const placement of placements) {
      if (placement.preferenceRank !== null) {
        rankedCount++;
        totalRank += placement.preferenceRank;
        if (placement.preferenceRank === 1) {
          firstChoiceCount++;
        }
      }
    }

    const totalPlacements = placements.length;

    studentStats.push({
      studentId,
      studentName,
      totalPlacements,
      firstChoiceCount,
      firstChoicePercent:
        totalPlacements > 0 ? Math.round((firstChoiceCount / totalPlacements) * 100) : 0,
      avgRank: rankedCount > 0 ? Math.round((totalRank / rankedCount) * 10) / 10 : null
    });
  }

  // Sort by student name
  studentStats.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return ok({
    programId: input.programId,
    totalSessions: publishedSessions.length,
    students: studentStats
  });
}
