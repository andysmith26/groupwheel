/**
 * List group templates.
 *
 * Optionally filter by owner, or list all templates.
 */

import type { GroupTemplate } from '$lib/domain/groupTemplate';
import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import { ok, type Result } from '$lib/types/result';

export interface ListGroupTemplatesInput {
	ownerStaffId?: string;
}

export type ListGroupTemplatesError = never; // Can never fail currently

export async function listGroupTemplates(
	deps: {
		groupTemplateRepo: GroupTemplateRepository;
	},
	input: ListGroupTemplatesInput = {}
): Promise<Result<GroupTemplate[], ListGroupTemplatesError>> {
	let templates: GroupTemplate[];

	if (input.ownerStaffId) {
		templates = await deps.groupTemplateRepo.listByOwnerId(input.ownerStaffId);
	} else {
		templates = await deps.groupTemplateRepo.listAll();
	}

	return ok(templates);
}
