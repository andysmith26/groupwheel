import type { Observation } from '$lib/domain';
import { createObservation as createObservationEntity } from '$lib/domain';
import type { ObservationRepository, IdGenerator, Clock } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok, err } from '$lib/types/result';

/**
 * Input for creating an observation.
 */
export interface CreateObservationInput {
  programId: string;
  sessionId?: string;
  groupId: string;
  groupName: string;
  content?: string;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  tags?: string[];
  createdByStaffId?: string;
  userId?: string;
}

/**
 * Error types for observation creation.
 */
export type CreateObservationError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

/**
 * Create a new observation about a group's effectiveness.
 */
export async function createObservation(
  deps: {
    observationRepo: ObservationRepository;
    idGenerator: IdGenerator;
    clock: Clock;
  },
  input: CreateObservationInput
): Promise<Result<Observation, CreateObservationError>> {
  try {
    // Derive content from sentiment when not provided
    const SENTIMENT_LABELS: Record<string, string> = {
      POSITIVE: 'Positive',
      NEUTRAL: 'Neutral',
      NEGATIVE: 'Needs attention'
    };
    const content =
      input.content?.trim() || (input.sentiment ? SENTIMENT_LABELS[input.sentiment] : undefined);

    if (!content) {
      return err({
        type: 'VALIDATION_ERROR',
        message: 'Either content or sentiment must be provided'
      });
    }

    const observation = createObservationEntity({
      id: deps.idGenerator.generateId(),
      programId: input.programId,
      sessionId: input.sessionId,
      groupId: input.groupId,
      groupName: input.groupName,
      content,
      sentiment: input.sentiment,
      tags: input.tags,
      createdByStaffId: input.createdByStaffId,
      createdAt: deps.clock.now(),
      userId: input.userId
    });

    await deps.observationRepo.save(observation);

    return ok(observation);
  } catch (error) {
    if (error instanceof Error) {
      return err({
        type: 'VALIDATION_ERROR',
        message: error.message
      });
    }
    return err({
      type: 'INTERNAL_ERROR',
      message: 'Failed to create observation'
    });
  }
}
