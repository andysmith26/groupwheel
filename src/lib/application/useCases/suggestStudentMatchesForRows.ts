import type { Student } from '$lib/domain';
import {
  classifyNameMatch,
  normalizeName,
  rankStudentCandidates
} from '$lib/domain/nameMatching';

export interface RowMatchSuggestion {
  rowIndex: number;
  bucket: 'HIGH_CONFIDENCE' | 'NEEDS_REVIEW' | 'NO_MATCH';
  candidates: Array<{ studentId: string; score: number; baseScore: number }>;
  bestCandidate?: { studentId: string; score: number; baseScore: number };
}

export function suggestStudentMatchesForRows(input: {
  rows: Array<{ rowIndex: number; name: string }>;
  students: Student[];
}): RowMatchSuggestion[] {
  return input.rows.map((row) => {
    const candidates = rankStudentCandidates(normalizeName(row.name), input.students);

    return {
      rowIndex: row.rowIndex,
      bucket: classifyNameMatch(candidates),
      candidates,
      bestCandidate: candidates[0]
    };
  });
}
