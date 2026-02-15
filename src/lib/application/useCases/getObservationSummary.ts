import type { Observation } from '$lib/domain';
import type { ObservationRepository } from '$lib/application/ports';
import type { Result } from '$lib/types/result';
import { ok } from '$lib/types/result';

/**
 * Tag with its usage count.
 */
export interface TagCount {
	tag: string;
	count: number;
}

/**
 * Input for getting observation summary for a program.
 */
export interface GetObservationSummaryInput {
	programId: string;
	/** Maximum number of recent observations to include. Default: 5 */
	recentLimit?: number;
	/** Maximum number of top tags to include. Default: 10 */
	topTagsLimit?: number;
}

/**
 * Aggregated summary of observations for a program.
 */
export interface ObservationSummaryResult {
	programId: string;
	/** Total number of observations. */
	totalObservations: number;
	/** Counts by sentiment. */
	sentimentCounts: {
		positive: number;
		neutral: number;
		negative: number;
		unspecified: number;
	};
	/** Most frequently used tags, sorted by count. */
	topTags: TagCount[];
	/** Most recent observations, sorted by date descending. */
	recentObservations: Observation[];
}

/**
 * Get an aggregated summary of observations for a program.
 *
 * This provides a high-level overview useful for analytics dashboards:
 * - Sentiment breakdown
 * - Most common tags
 * - Recent activity
 */
export async function getObservationSummary(
	deps: {
		observationRepo: ObservationRepository;
	},
	input: GetObservationSummaryInput
): Promise<Result<ObservationSummaryResult, never>> {
	const recentLimit = input.recentLimit ?? 5;
	const topTagsLimit = input.topTagsLimit ?? 10;

	// Load all observations for the program
	const observations = await deps.observationRepo.listByProgramId(input.programId);

	if (observations.length === 0) {
		return ok({
			programId: input.programId,
			totalObservations: 0,
			sentimentCounts: {
				positive: 0,
				neutral: 0,
				negative: 0,
				unspecified: 0
			},
			topTags: [],
			recentObservations: []
		});
	}

	// Count sentiments
	const sentimentCounts = {
		positive: 0,
		neutral: 0,
		negative: 0,
		unspecified: 0
	};

	for (const obs of observations) {
		switch (obs.sentiment) {
			case 'POSITIVE':
				sentimentCounts.positive++;
				break;
			case 'NEUTRAL':
				sentimentCounts.neutral++;
				break;
			case 'NEGATIVE':
				sentimentCounts.negative++;
				break;
			default:
				sentimentCounts.unspecified++;
		}
	}

	// Count tags
	const tagCounts = new Map<string, number>();
	for (const obs of observations) {
		if (obs.tags) {
			for (const tag of obs.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}
	}

	// Sort tags by count and take top N
	const topTags: TagCount[] = [...tagCounts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, topTagsLimit);

	// Sort observations by date and take most recent
	const sortedObservations = [...observations].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
	);
	const recentObservations = sortedObservations.slice(0, recentLimit);

	return ok({
		programId: input.programId,
		totalObservations: observations.length,
		sentimentCounts,
		topTags,
		recentObservations
	});
}
