/**
 * Get a group template by ID.
 */

import type { GroupTemplate } from '$lib/domain/groupTemplate';
import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import { ok, err, type Result } from '$lib/types/result';

export interface GetGroupTemplateInput {
	templateId: string;
}

export type GetGroupTemplateError = { type: 'NOT_FOUND'; templateId: string };

export async function getGroupTemplate(
	deps: {
		groupTemplateRepo: GroupTemplateRepository;
	},
	input: GetGroupTemplateInput
): Promise<Result<GroupTemplate, GetGroupTemplateError>> {
	const template = await deps.groupTemplateRepo.getById(input.templateId);

	if (!template) {
		return err({ type: 'NOT_FOUND', templateId: input.templateId });
	}

	return ok(template);
}
