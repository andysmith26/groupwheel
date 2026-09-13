import type { Student } from '$lib/domain';

export const MAX_CANDIDATES = 3;
export const MIN_PLAUSIBLE_SCORE = 0.6;
const AMBIGUITY_THRESHOLD = 0.15;

export const HIGH_CONFIDENCE_BASE_SCORE_FLOOR = 0.75;
export const HIGH_CONFIDENCE_MARGIN = 0.2;
export const HIGH_CONFIDENCE_ABSOLUTE_SCORE_FLOOR = 0.9;

interface NormalizedStudentName {
  firstName: string;
  lastName: string;
  preferredName: string;
}

interface ScoredCandidate {
  studentId: string;
  baseScore: number;
}

export function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

export function getNormalizedStudentName(student: Student): NormalizedStudentName {
  const metadataPreferredName = student.meta?.preferredName;
  const preferredName =
    typeof metadataPreferredName === 'string' && !student.preferredName?.trim()
      ? metadataPreferredName
      : student.preferredName;

  return {
    firstName: normalizeName(student.firstName),
    lastName: normalizeName(student.lastName),
    preferredName: normalizeName(preferredName)
  };
}

export function jaroWinklerSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0);
  const leftMatches = new Array<boolean>(left.length).fill(false);
  const rightMatches = new Array<boolean>(right.length).fill(false);
  let matches = 0;

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const start = Math.max(0, leftIndex - matchDistance);
    const end = Math.min(leftIndex + matchDistance + 1, right.length);

    for (let rightIndex = start; rightIndex < end; rightIndex += 1) {
      if (!rightMatches[rightIndex] && left[leftIndex] === right[rightIndex]) {
        leftMatches[leftIndex] = true;
        rightMatches[rightIndex] = true;
        matches += 1;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let rightIndex = 0;
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    if (!leftMatches[leftIndex]) continue;
    while (!rightMatches[rightIndex]) rightIndex += 1;
    if (left[leftIndex] !== right[rightIndex]) transpositions += 1;
    rightIndex += 1;
  }

  const jaro =
    (matches / left.length + matches / right.length + (matches - transpositions / 2) / matches) / 3;
  if (jaro <= 0.7) return jaro;

  let prefixLength = 0;
  while (prefixLength < 4 && left[prefixLength] === right[prefixLength]) {
    prefixLength += 1;
  }

  return jaro + prefixLength * 0.1 * (1 - jaro);
}

export function buildPermutations(student: Student): string[] {
  const { firstName, lastName, preferredName } = getNormalizedStudentName(student);
  const permutations = new Set<string>();
  const add = (value: string): void => {
    if (value) permutations.add(value);
  };

  if (firstName && lastName) {
    add(`${firstName} ${lastName}`);
    add(`${lastName} ${firstName}`);
    add(`${firstName} ${lastName[0]}`);
    add(`${firstName[0]} ${lastName}`);
  }
  if (preferredName && lastName) {
    add(`${preferredName} ${lastName}`);
    add(`${lastName} ${preferredName}`);
    add(`${preferredName} ${lastName[0]}`);
  }
  add(preferredName);
  add(firstName);
  add(lastName);

  return [...permutations];
}

export function scoreCandidate(normalizedInput: string, student: Student): ScoredCandidate {
  const inputSpaceCount = (normalizedInput.match(/ /g) ?? []).length;
  const baseScore = Math.max(
    ...buildPermutations(student).map((permutation) => {
      const permutationSpaceCount = (permutation.match(/ /g) ?? []).length;
      const score = jaroWinklerSimilarity(normalizedInput, permutation);
      return Math.max(0, score - (inputSpaceCount === permutationSpaceCount ? 0 : 0.1));
    })
  );

  return {
    studentId: student.id,
    baseScore
  };
}

export function rankStudentCandidates(
  normalizedInput: string,
  students: Student[],
  excludeStudentId?: string
): Array<{ studentId: string; score: number; baseScore: number }> {
  if (!normalizedInput) {
    return [];
  }

  const ranked = students
    .filter((student) => student.id !== excludeStudentId)
    .map((student) => scoreCandidate(normalizedInput, student))
    .sort(
      (left, right) =>
        right.baseScore - left.baseScore ||
        (left.studentId < right.studentId ? -1 : left.studentId > right.studentId ? 1 : 0)
    )
    .slice(0, MAX_CANDIDATES);

  const topBaseScore = ranked[0]?.baseScore ?? 0;
  if (topBaseScore < MIN_PLAUSIBLE_SCORE) {
    return [];
  }

  return ranked.map((candidate, index) => {
    const confidence =
      index === 0
        ? candidate.baseScore *
          (1 -
            Math.max(
              0,
              (AMBIGUITY_THRESHOLD - (candidate.baseScore - (ranked[1]?.baseScore ?? 0))) /
                AMBIGUITY_THRESHOLD
            ) *
              0.5)
        : candidate.baseScore * (candidate.baseScore / topBaseScore) ** 2;

    return {
      studentId: candidate.studentId,
      score: confidence,
      baseScore: candidate.baseScore
    };
  });
}

export function isHighConfidence(candidates: { studentId: string; baseScore: number }[]): boolean {
  const [top, second] = candidates;
  if (!top) return false;

  const secondBaseScore = second?.baseScore ?? 0;

  if (
    top.baseScore >= HIGH_CONFIDENCE_ABSOLUTE_SCORE_FLOOR &&
    secondBaseScore < HIGH_CONFIDENCE_ABSOLUTE_SCORE_FLOOR
  ) {
    return true;
  }

  const margin = top.baseScore - secondBaseScore;
  return top.baseScore >= HIGH_CONFIDENCE_BASE_SCORE_FLOOR && margin >= HIGH_CONFIDENCE_MARGIN;
}

export function classifyNameMatch(
  candidates: { studentId: string; baseScore: number }[]
): 'HIGH_CONFIDENCE' | 'NEEDS_REVIEW' | 'NO_MATCH' {
  if (candidates.length === 0) return 'NO_MATCH';
  return isHighConfidence(candidates) ? 'HIGH_CONFIDENCE' : 'NEEDS_REVIEW';
}
