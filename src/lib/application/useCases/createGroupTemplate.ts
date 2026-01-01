/**
 * Create a new group template.
 *
 * Group templates allow teachers to save and reuse common group
 * configurations (e.g., "6 tables of 4").
 */

import type { GroupTemplate } from '$lib/domain/groupTemplate';
import { createGroupTemplate as createGroupTemplateFactory } from '$lib/domain/groupTemplate';
import type { GroupTemplateRepository } from '$lib/application/ports/GroupTemplateRepository';
import type { IdGenerator } from '$lib/application/ports/IdGenerator';
import { ok, err, type Result } from '$lib/types/result';

export interface CreateGroupTemplateInput {
	name: string;
	description?: string;
	groups: Array<{ name: string; capacity?: number | null }>;
	ownerStaffId?: string;
	/** ID of the authenticated user (for multi-tenant data isolation) */
	userId?: string;
}

export type CreateGroupTemplateError = { type: 'VALIDATION_ERROR'; message: string };

export async function createGroupTemplate(
	deps: {
		groupTemplateRepo: GroupTemplateRepository;
		idGenerator: IdGenerator;
	},
	input: CreateGroupTemplateInput
): Promise<Result<GroupTemplate, CreateGroupTemplateError>> {
	try {
		const template = createGroupTemplateFactory({
			id: deps.idGenerator.generateId(),
			ownerStaffId: input.ownerStaffId ?? 'owner-1',
			name: input.name,
			description: input.description,
			groups: input.groups.map((g) => ({
				id: deps.idGenerator.generateId(),
				name: g.name,
				capacity: g.capacity ?? null
			})),
			userId: input.userId
		});

		await deps.groupTemplateRepo.save(template);
		return ok(template);
	} catch (e) {
		return err({
			type: 'VALIDATION_ERROR',
			message: e instanceof Error ? e.message : 'Unknown error'
		});
	}
}
