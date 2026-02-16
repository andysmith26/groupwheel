import { ok, type Result } from '$lib/types/result';

export interface DetectWorkspaceEditsSincePublishInput {
	scenarioLastModifiedAt: Date | null | undefined;
	latestPublishedAt: Date | null | undefined;
}

export interface DetectWorkspaceEditsSincePublishOutput {
	hasEditsSincePublish: boolean;
}

export function detectWorkspaceEditsSincePublish(
	input: DetectWorkspaceEditsSincePublishInput
): Result<DetectWorkspaceEditsSincePublishOutput, never> {
	if (!input.scenarioLastModifiedAt || !input.latestPublishedAt) {
		return ok({ hasEditsSincePublish: true });
	}

	return ok({
		hasEditsSincePublish: input.scenarioLastModifiedAt > input.latestPublishedAt
	});
}
