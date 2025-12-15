/**
 * Update an existing group template.
 */

import type { GroupTemplate } from '$lib/domain/groupTemplate';
import { updateGroupTemplate as updateGroupTemplateFactory } from '$lib/domain/groupTemplate';
import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import { ok, err, type Result } from '$lib/types/result';

export interface UpdateGroupTemplateInput {
	templateId: string;
	name?: string;
	description?: string;
	groups?: Array<{ id?: string; name: string; capacity?: number | null }>;
}

export type UpdateGroupTemplateError =
	| { type: 'NOT_FOUND'; templateId: string }
	| { type: 'VALIDATION_ERROR'; message: string };

export async function updateGroupTemplate(
	deps: {
		groupTemplateRepo: GroupTemplateRepository;
		idGenerator: IdGenerator;
	},
	input: UpdateGroupTemplateInput
): Promise<Result<GroupTemplate, UpdateGroupTemplateError>> {
	const existing = await deps.groupTemplateRepo.getById(input.templateId);
	if (!existing) {
		return err({ type: 'NOT_FOUND', templateId: input.templateId });
	}

	try {
		// If groups are being updated, ensure each has an ID
		const updatedGroups = input.groups?.map((g) => ({
			id: g.id ?? deps.idGenerator.generateId(),
			name: g.name,
			capacity: g.capacity ?? null
		}));

		const updated = updateGroupTemplateFactory(existing, {
			name: input.name,
			description: input.description,
			groups: updatedGroups
		});

		await deps.groupTemplateRepo.update(updated);
		return ok(updated);
	} catch (e) {
		return err({
			type: 'VALIDATION_ERROR',
			message: e instanceof Error ? e.message : 'Unknown error'
		});
	}
}
