/**
 * Delete a group template.
 */

import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import { ok, type Result } from '$lib/types/result';

export interface DeleteGroupTemplateInput {
	templateId: string;
}

export type DeleteGroupTemplateError = never; // Can never fail currently (idempotent delete)

export async function deleteGroupTemplate(
	deps: {
		groupTemplateRepo: GroupTemplateRepository;
	},
	input: DeleteGroupTemplateInput
): Promise<Result<void, DeleteGroupTemplateError>> {
	await deps.groupTemplateRepo.delete(input.templateId);
	return ok(undefined);
}
