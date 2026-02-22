/**
 * Use case for finding matching student identities during import.
 *
 * Implements fuzzy name matching with scoring to identify potential
 * matches between imported students and existing identities.
 *
 * @module application/useCases/findMatchingStudents
 */

import type { StudentIdentity } from '$lib/domain';
import type { StudentIdentityRepository } from '$lib/application/ports/StudentIdentityRepository';
import { ok, type Result } from '$lib/types/result';

// ============================================================================
// Nickname Database
// ============================================================================

/**
 * Common nickname mappings (extensible).
 * Keys are canonical names (lowercase), values are arrays of nicknames.
 */
const NICKNAMES: Record<string, string[]> = {
  alexander: ['alex', 'xander', 'lex', 'sasha'],
  alexandra: ['alex', 'lexi', 'lexie', 'sasha', 'sandy'],
  elizabeth: ['liz', 'lizzy', 'beth', 'eliza', 'betty', 'libby'],
  william: ['will', 'bill', 'billy', 'liam', 'willy'],
  katherine: ['kate', 'katie', 'kathy', 'kat', 'kay', 'kitty'],
  catherine: ['kate', 'katie', 'cathy', 'cat', 'kay'],
  michael: ['mike', 'mikey', 'mick'],
  jennifer: ['jen', 'jenny', 'jenn'],
  christopher: ['chris', 'kit', 'topher'],
  nicholas: ['nick', 'nicky', 'nico'],
  benjamin: ['ben', 'benji', 'benny'],
  jonathan: ['jon', 'johnny', 'nathan'],
  nathaniel: ['nate', 'nathan', 'nat'],
  theodore: ['ted', 'teddy', 'theo'],
  margaret: ['maggie', 'meg', 'peggy', 'marge', 'margie'],
  patricia: ['pat', 'patty', 'trish', 'tricia'],
  rebecca: ['becky', 'becca', 'beck'],
  samantha: ['sam', 'sammy'],
  samuel: ['sam', 'sammy'],
  stephanie: ['steph', 'stephie'],
  victoria: ['vicky', 'vicki', 'tori'],
  josephine: ['jo', 'josie', 'joey'],
  joseph: ['joe', 'joey', 'jo'],
  matthew: ['matt', 'matty'],
  anthony: ['tony', 'ant'],
  andrew: ['andy', 'drew'],
  daniel: ['dan', 'danny'],
  david: ['dave', 'davey'],
  edward: ['ed', 'eddie', 'ted', 'ned'],
  jacob: ['jake', 'jack'],
  james: ['jim', 'jimmy', 'jamie'],
  robert: ['rob', 'robby', 'bob', 'bobby'],
  richard: ['rick', 'ricky', 'rich', 'dick'],
  timothy: ['tim', 'timmy'],
  thomas: ['tom', 'tommy'],
  abigail: ['abby', 'gail'],
  allison: ['ally', 'ali'],
  amanda: ['mandy', 'mandi'],
  emily: ['em', 'emmy'],
  isabella: ['bella', 'izzy', 'izzie'],
  jessica: ['jess', 'jessie'],
  kimberly: ['kim', 'kimmy'],
  madeline: ['maddy', 'maddie'],
  madeleine: ['maddy', 'maddie'],
  natalie: ['nat', 'nattie'],
  nicole: ['nicky', 'nikki', 'cole'],
  olivia: ['liv', 'livvy'],
  sophia: ['sophie', 'soph'],
  zachary: ['zach', 'zack']
};

/**
 * Build a reverse lookup map: nickname -> canonical names
 */
function buildNicknameReverseLookup(): Map<string, string[]> {
  const reverse = new Map<string, string[]>();

  for (const [canonical, nicknames] of Object.entries(NICKNAMES)) {
    // The canonical name can also be looked up
    if (!reverse.has(canonical)) {
      reverse.set(canonical, []);
    }

    for (const nickname of nicknames) {
      if (!reverse.has(nickname)) {
        reverse.set(nickname, []);
      }
      reverse.get(nickname)!.push(canonical);
    }
  }

  return reverse;
}

const NICKNAME_REVERSE = buildNicknameReverseLookup();

/**
 * Check if two names are nickname variants of each other.
 */
function areNicknameVariants(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  if (n1 === n2) return true;

  // Check if n1 is a nickname for a canonical name that n2 matches
  const canonicals1 = NICKNAME_REVERSE.get(n1) ?? [];
  const canonicals2 = NICKNAME_REVERSE.get(n2) ?? [];

  // If they share a canonical name
  for (const c1 of canonicals1) {
    if (canonicals2.includes(c1)) return true;
    if (c1 === n2) return true;
  }

  for (const c2 of canonicals2) {
    if (c2 === n1) return true;
  }

  // Check if n2 is in the nickname list of n1's canonical
  if (NICKNAMES[n1]?.includes(n2)) return true;
  if (NICKNAMES[n2]?.includes(n1)) return true;

  return false;
}

// ============================================================================
// Levenshtein Distance
// ============================================================================

/**
 * Calculate the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

// ============================================================================
// Types
// ============================================================================

export interface MatchCandidate {
  /** The matched student identity */
  identity: StudentIdentity;
  /** Match score from 0-100 */
  score: number;
  /** Human-readable reasons for the match */
  reasons: string[];
}

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface MatchResult {
  /** The imported student's data */
  importedStudent: {
    firstName: string;
    lastName?: string;
    rowIndex: number;
  };
  /** Best matching identity, if any */
  bestMatch: StudentIdentity | null;
  /** All candidates considered */
  allCandidates: MatchCandidate[];
  /** Confidence level based on score thresholds */
  confidence: MatchConfidence;
}

export interface FindMatchingStudentsInput {
  /** First name of the imported student */
  firstName: string;
  /** Last name of the imported student (optional) */
  lastName?: string;
  /** User ID for multi-tenant filtering */
  userId?: string;
  /** Maximum number of candidates to return (default: 5) */
  limit?: number;
}

export interface FindMatchingStudentsDeps {
  studentIdentityRepo: StudentIdentityRepository;
}

// ============================================================================
// Scoring Logic
// ============================================================================

/**
 * Calculate match score between imported name and an identity.
 */
function calculateMatchScore(
  firstName: string,
  lastName: string | undefined,
  identity: StudentIdentity
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const importFirstLower = firstName.toLowerCase();
  const importLastLower = lastName?.toLowerCase();

  // Check against display name
  const displayParts = identity.displayName.toLowerCase().split(/\s+/);
  const identityFirstName = displayParts[0] ?? '';
  const identityLastName = displayParts.slice(1).join(' ') || undefined;

  // Also check against all known variants
  const allFirstNames = [identityFirstName];
  const allLastNames = identityLastName ? [identityLastName] : [];

  for (const variant of identity.knownVariants) {
    allFirstNames.push(variant.firstName.toLowerCase());
    if (variant.lastName) {
      allLastNames.push(variant.lastName.toLowerCase());
    }
  }

  // ---- First Name Matching ----
  let firstNameScore = 0;
  let firstNameReason = '';

  for (const idFirst of allFirstNames) {
    // Exact match
    if (importFirstLower === idFirst) {
      if (firstNameScore < 50) {
        firstNameScore = 50;
        firstNameReason = 'Exact first name match';
      }
      break;
    }

    // Nickname match
    if (areNicknameVariants(importFirstLower, idFirst)) {
      if (firstNameScore < 40) {
        firstNameScore = 40;
        firstNameReason = `Nickname match (${firstName} ↔ ${idFirst})`;
      }
    }

    // Similar first name (Levenshtein ≤ 2)
    const distance = levenshteinDistance(importFirstLower, idFirst);
    if (distance <= 2 && distance > 0) {
      if (firstNameScore < 30) {
        firstNameScore = 30;
        firstNameReason = `Similar first name (${firstName} ≈ ${idFirst})`;
      }
    }
  }

  if (firstNameScore > 0) {
    score += firstNameScore;
    reasons.push(firstNameReason);
  }

  // ---- Last Name Matching ----
  if (importLastLower && allLastNames.length > 0) {
    let lastNameScore = 0;
    let lastNameReason = '';

    for (const idLast of allLastNames) {
      // Exact match
      if (importLastLower === idLast) {
        if (lastNameScore < 30) {
          lastNameScore = 30;
          lastNameReason = 'Exact last name match';
        }
        break;
      }

      // Similar last name (Levenshtein ≤ 2)
      const distance = levenshteinDistance(importLastLower, idLast);
      if (distance <= 2 && distance > 0) {
        if (lastNameScore < 20) {
          lastNameScore = 20;
          lastNameReason = `Similar last name (${lastName} ≈ ${idLast})`;
        }
      }

      // Hyphen variation: "Smith-Jones" matches "Smith" or "Jones"
      const importParts = importLastLower.split('-');
      const idParts = idLast.split('-');
      const allImportParts = importParts.flatMap((p) => p.split(/\s+/));
      const allIdParts = idParts.flatMap((p) => p.split(/\s+/));

      for (const ip of allImportParts) {
        for (const idp of allIdParts) {
          if (ip === idp && ip.length > 2) {
            if (lastNameScore < 25) {
              lastNameScore = 25;
              lastNameReason = `Hyphen/compound name match (${ip})`;
            }
          }
        }
      }
    }

    if (lastNameScore > 0) {
      score += lastNameScore;
      reasons.push(lastNameReason);
    }
  }

  // ---- Bonus: Grade Level Match ----
  // (Would need grade level in input; skipping for now)

  // ---- Full name exact match bonus ----
  if (importFirstLower && importLastLower) {
    const fullImport = `${importFirstLower} ${importLastLower}`;
    if (identity.displayName.toLowerCase() === fullImport) {
      score = 100;
      reasons.length = 0;
      reasons.push('Exact full name match');
    }
  }

  return { score, reasons };
}

/**
 * Determine confidence level from score.
 */
function getConfidence(score: number): MatchConfidence {
  if (score >= 90) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'NONE';
}

// ============================================================================
// Use Case
// ============================================================================

/**
 * Find matching student identities for an imported student name.
 *
 * Returns a sorted list of candidates with match scores and reasons.
 */
export async function findMatchingStudents(
  deps: FindMatchingStudentsDeps,
  input: FindMatchingStudentsInput
): Promise<Result<MatchCandidate[], never>> {
  const { studentIdentityRepo } = deps;
  const { firstName, lastName, userId, limit = 5 } = input;

  // Get all identities for this user
  const allIdentities = await studentIdentityRepo.listAll(userId);

  // Score each identity
  const candidates: MatchCandidate[] = [];

  for (const identity of allIdentities) {
    const { score, reasons } = calculateMatchScore(firstName, lastName, identity);

    if (score > 0) {
      candidates.push({ identity, score, reasons });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Limit results
  const topCandidates = candidates.slice(0, limit);

  return ok(topCandidates);
}

/**
 * Match a batch of imported students against existing identities.
 *
 * Groups results by confidence for efficient UI presentation.
 */
export interface MatchImportedStudentsInput {
  /** Students being imported */
  importedStudents: Array<{
    firstName: string;
    lastName?: string;
    rowIndex: number;
  }>;
  /** User ID for multi-tenant filtering */
  userId?: string;
}

export interface MatchImportedStudentsResult {
  /** High confidence matches (≥90 score) - can be bulk confirmed */
  highConfidence: MatchResult[];
  /** Medium confidence matches (60-89 score) - need individual review */
  needsReview: MatchResult[];
  /** Low confidence matches (30-59 score) - suggestions only */
  lowConfidence: MatchResult[];
  /** No matches found (<30 score) - assume new student */
  newStudents: MatchResult[];
}

/**
 * Match all imported students against existing identities.
 *
 * Categorizes results by confidence level for efficient review.
 */
export async function matchImportedStudents(
  deps: FindMatchingStudentsDeps,
  input: MatchImportedStudentsInput
): Promise<Result<MatchImportedStudentsResult, never>> {
  const { studentIdentityRepo } = deps;
  const { importedStudents, userId } = input;

  // Get all identities once
  const allIdentities = await studentIdentityRepo.listAll(userId);

  const highConfidence: MatchResult[] = [];
  const needsReview: MatchResult[] = [];
  const lowConfidence: MatchResult[] = [];
  const newStudents: MatchResult[] = [];

  for (const imported of importedStudents) {
    const candidates: MatchCandidate[] = [];

    for (const identity of allIdentities) {
      const { score, reasons } = calculateMatchScore(
        imported.firstName,
        imported.lastName,
        identity
      );

      if (score > 0) {
        candidates.push({ identity, score, reasons });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    const bestMatch = candidates[0] ?? null;
    const bestScore = bestMatch?.score ?? 0;
    const confidence = getConfidence(bestScore);

    const result: MatchResult = {
      importedStudent: imported,
      bestMatch: bestMatch?.identity ?? null,
      allCandidates: candidates.slice(0, 5),
      confidence
    };

    switch (confidence) {
      case 'HIGH':
        highConfidence.push(result);
        break;
      case 'MEDIUM':
        needsReview.push(result);
        break;
      case 'LOW':
        lowConfidence.push(result);
        break;
      case 'NONE':
        newStudents.push(result);
        break;
    }
  }

  return ok({
    highConfidence,
    needsReview,
    lowConfidence,
    newStudents
  });
}
