import type { ObservationRepository } from '$lib/application/ports/ObservationRepository';
import type { SessionRepository } from '$lib/application/ports/SessionRepository';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

export interface GetObservationTrendsInput {
  programId: string;
  /** Max sessions to include. Default: 10 */
  sessionLimit?: number;
}

export interface SessionSentimentSummary {
  sessionId: string;
  sessionDate: Date;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  /** Ratio of positive to total (0-1), for trend line */
  positiveRatio: number;
}

export interface ObservationTrendsResult {
  programId: string;
  /** Per-session summaries, sorted chronologically (oldest first) */
  sessionSummaries: SessionSentimentSummary[];
  /** Overall totals across all sessions */
  totals: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  /** Sessions with observations / total sessions */
  coverageRatio: {
    sessionsWithObservations: number;
    totalSessions: number;
  };
}

export async function getObservationTrends(
  deps: {
    observationRepo: ObservationRepository;
    sessionRepo: SessionRepository;
  },
  input: GetObservationTrendsInput
): Promise<Result<ObservationTrendsResult, never>> {
  const sessionLimit = input.sessionLimit ?? 10;

  // Load all sessions for the program (most recent first)
  const sessions = await deps.sessionRepo.listByProgramId(input.programId);
  sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const recentSessions = sessions.slice(0, sessionLimit);

  // Load all observations for the program
  const observations = await deps.observationRepo.listByProgramId(input.programId);

  // Group observations by sessionId
  const obsBySession = new Map<string, typeof observations>();
  for (const obs of observations) {
    if (!obs.sessionId) continue;
    const existing = obsBySession.get(obs.sessionId) ?? [];
    existing.push(obs);
    obsBySession.set(obs.sessionId, existing);
  }

  // Build per-session summaries
  const sessionSummaries: SessionSentimentSummary[] = [];
  let totalPositive = 0,
    totalNeutral = 0,
    totalNegative = 0;
  let sessionsWithObs = 0;

  for (const session of recentSessions) {
    const sessionObs = obsBySession.get(session.id) ?? [];
    if (sessionObs.length === 0) continue;

    sessionsWithObs++;
    let pos = 0,
      neu = 0,
      neg = 0;
    for (const obs of sessionObs) {
      switch (obs.sentiment) {
        case 'POSITIVE':
          pos++;
          break;
        case 'NEUTRAL':
          neu++;
          break;
        case 'NEGATIVE':
          neg++;
          break;
      }
    }

    const total = pos + neu + neg;
    totalPositive += pos;
    totalNeutral += neu;
    totalNegative += neg;

    sessionSummaries.push({
      sessionId: session.id,
      sessionDate: session.createdAt,
      positive: pos,
      neutral: neu,
      negative: neg,
      total,
      positiveRatio: total > 0 ? pos / total : 0
    });
  }

  // Sort chronologically for trend display (oldest first)
  sessionSummaries.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());

  return ok({
    programId: input.programId,
    sessionSummaries,
    totals: {
      positive: totalPositive,
      neutral: totalNeutral,
      negative: totalNegative,
      total: totalPositive + totalNeutral + totalNegative
    },
    coverageRatio: {
      sessionsWithObservations: sessionsWithObs,
      totalSessions: sessions.length
    }
  });
}
