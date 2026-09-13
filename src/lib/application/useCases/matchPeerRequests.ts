import type { Student } from '$lib/domain';
import {
  createPeerRequestEntry,
  normalizePeerRequestText,
  type PeerRequestCandidate,
  type PeerRequestEntry
} from '$lib/domain/peerRequest';
import {
  buildPermutations,
  getNormalizedStudentName,
  isHighConfidence,
  normalizeName,
  rankStudentCandidates
} from '$lib/domain/nameMatching';

export type PeerRequestMatchBucket = 'READY_TO_CONFIRM' | 'NEEDS_REVIEW' | 'NO_MATCH' | 'INVALID';

export interface MatchedPeerRequest {
  request: PeerRequestEntry;
  bucket: PeerRequestMatchBucket;
  bestCandidate?: PeerRequestCandidate;
  candidates: PeerRequestCandidate[];
  warning?: string;
}

export interface MatchPeerRequestsInput {
  requests: PeerRequestEntry[];
  students: Student[];
}

export interface MatchPeerRequestsOutput {
  readyToConfirm: MatchedPeerRequest[];
  needsReview: MatchedPeerRequest[];
  noMatch: MatchedPeerRequest[];
  invalid: MatchedPeerRequest[];
  updatedRequests: PeerRequestEntry[];
}

function isSelfMatch(request: PeerRequestEntry, requester: Student | undefined): boolean {
  if (!requester) {
    return false;
  }

  const normalizedRequest = normalizeName(request.rawText);
  const requesterName = getNormalizedStudentName(requester);

  return (
    buildPermutations(requester).includes(normalizedRequest) ||
    (requesterName.preferredName !== '' && normalizedRequest === requesterName.preferredName)
  );
}

function toUpdatedRequest(
  request: PeerRequestEntry,
  candidates: PeerRequestCandidate[],
  bucket: PeerRequestMatchBucket
): PeerRequestEntry {
  return createPeerRequestEntry({
    ...request,
    normalizedText: request.normalizedText || normalizePeerRequestText(request.rawText),
    status: bucket === 'READY_TO_CONFIRM' ? 'AUTO_MATCHED_PENDING_CONFIRMATION' : 'UNRESOLVED',
    resolutionSource: 'NONE',
    resolvedStudentId: undefined,
    candidates
  });
}

export function matchPeerRequests(input: MatchPeerRequestsInput): MatchPeerRequestsOutput {
  const studentById = new Map(input.students.map((student) => [student.id, student]));
  const readyToConfirm: MatchedPeerRequest[] = [];
  const needsReview: MatchedPeerRequest[] = [];
  const noMatch: MatchedPeerRequest[] = [];
  const invalid: MatchedPeerRequest[] = [];
  const updatedRequests: PeerRequestEntry[] = [];

  for (const request of input.requests) {
    const requester = studentById.get(request.requesterStudentId);
    const normalizedRequest = normalizeName(request.rawText);

    if (isSelfMatch(request, requester)) {
      const updatedRequest = toUpdatedRequest(request, [], 'INVALID');
      const matched: MatchedPeerRequest = {
        request: updatedRequest,
        bucket: 'INVALID',
        candidates: [],
        warning: 'Request appears to reference the requester and must be reviewed manually.'
      };
      invalid.push(matched);
      updatedRequests.push(updatedRequest);
      continue;
    }

    const rankedCandidates = rankStudentCandidates(
      normalizedRequest,
      input.students,
      request.requesterStudentId
    );
    const candidates: PeerRequestCandidate[] = rankedCandidates.map((candidate) => ({
      studentId: candidate.studentId,
      score: candidate.score,
      confidence: candidate.score,
      baseScore: candidate.baseScore,
      reasons: ['Jaro-Winkler name similarity']
    }));

    const bestCandidate = candidates[0];

    let bucket: PeerRequestMatchBucket;
    let warning: string | undefined;

    if (!bestCandidate) {
      bucket = 'NO_MATCH';
    } else if (
      isHighConfidence(
        rankedCandidates.map((candidate) => ({
          studentId: candidate.studentId,
          baseScore: candidate.baseScore
        }))
      )
    ) {
      bucket = 'READY_TO_CONFIRM';
    } else {
      bucket = 'NEEDS_REVIEW';
      if (bestCandidate.baseScore === 1 && bestCandidate.score === 0.5) {
        warning = 'Multiple equally strong matches found.';
      }
    }

    const updatedRequest = toUpdatedRequest(request, candidates, bucket);
    const matched: MatchedPeerRequest = {
      request: updatedRequest,
      bucket,
      bestCandidate,
      candidates,
      warning
    };

    if (bucket === 'READY_TO_CONFIRM') {
      readyToConfirm.push(matched);
    } else if (bucket === 'NEEDS_REVIEW') {
      needsReview.push(matched);
    } else {
      noMatch.push(matched);
    }

    updatedRequests.push(updatedRequest);
  }

  return {
    readyToConfirm,
    needsReview,
    noMatch,
    invalid,
    updatedRequests
  };
}
