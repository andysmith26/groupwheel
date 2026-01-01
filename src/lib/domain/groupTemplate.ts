/**
 * GroupTemplate domain entity.
 *
 * A GroupTemplate is a reusable set of group definitions that teachers can
 * create ahead of time and share with students for preference collection.
 *
 * Example: A teacher creates "Fall Clubs" with groups: Art Club, Chess Club,
 * Drama Club, Music Club. Students then submit preferences ranking these
 * groups. Later, the teacher uses this template in the grouping wizard.
 *
 * @module domain/groupTemplate
 */

/**
 * A single group definition within a template.
 * Unlike a full Group, this doesn't have memberIds - it's just the definition.
 */
export interface TemplateGroup {
	/** Unique identifier within the template */
	id: string;
	/** Display name (e.g., "Art Club") */
	name: string;
	/** Optional capacity limit */
	capacity: number | null;
}

/**
 * A reusable template containing a set of group definitions.
 */
export interface GroupTemplate {
	/** Unique identifier */
	id: string;
	/** Staff member who owns this template */
	ownerStaffId: string;
	/** Template name (e.g., "Fall Clubs", "Science Fair Teams") */
	name: string;
	/** Optional description */
	description?: string;
	/** The group definitions in this template */
	groups: TemplateGroup[];
	/** When the template was created */
	createdAt: Date;
	/** When the template was last modified */
	updatedAt: Date;
	/**
	 * ID of the authenticated user who owns this template.
	 * Used for multi-tenant data isolation.
	 * Undefined for anonymous/local-only data.
	 */
	userId?: string;
}

/**
 * Input for creating a new GroupTemplate.
 */
export interface CreateGroupTemplateInput {
	id: string;
	ownerStaffId: string;
	name: string;
	description?: string;
	groups: Array<{
		id: string;
		name: string;
		capacity?: number | null;
	}>;
	userId?: string;
}

/**
 * Validation error types for GroupTemplate creation.
 */
export type GroupTemplateValidationError =
	| { type: 'EMPTY_NAME' }
	| { type: 'NO_GROUPS' }
	| { type: 'EMPTY_GROUP_NAME'; groupIndex: number }
	| { type: 'DUPLICATE_GROUP_NAME'; name: string }
	| { type: 'INVALID_CAPACITY'; groupIndex: number };

/**
 * Create a new GroupTemplate with validation.
 *
 * @param input - The template data
 * @returns The created GroupTemplate
 * @throws Error if validation fails
 */
export function createGroupTemplate(input: CreateGroupTemplateInput): GroupTemplate {
	const errors = validateGroupTemplateInput(input);
	if (errors.length > 0) {
		const error = errors[0];
		switch (error.type) {
			case 'EMPTY_NAME':
				throw new Error('Template name cannot be empty');
			case 'NO_GROUPS':
				throw new Error('Template must have at least one group');
			case 'EMPTY_GROUP_NAME':
				throw new Error(`Group ${error.groupIndex + 1} has no name`);
			case 'DUPLICATE_GROUP_NAME':
				throw new Error(`Duplicate group name: "${error.name}"`);
			case 'INVALID_CAPACITY':
				throw new Error(`Group ${error.groupIndex + 1} has invalid capacity`);
		}
	}

	const now = new Date();

	return {
		id: input.id,
		ownerStaffId: input.ownerStaffId,
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		groups: input.groups.map((g) => ({
			id: g.id,
			name: g.name.trim(),
			capacity: g.capacity ?? null
		})),
		createdAt: now,
		updatedAt: now,
		userId: input.userId
	};
}

/**
 * Validate GroupTemplate input and return any errors.
 */
export function validateGroupTemplateInput(
	input: CreateGroupTemplateInput
): GroupTemplateValidationError[] {
	const errors: GroupTemplateValidationError[] = [];

	// Check template name
	if (!input.name?.trim()) {
		errors.push({ type: 'EMPTY_NAME' });
	}

	// Check we have groups
	if (!input.groups || input.groups.length === 0) {
		errors.push({ type: 'NO_GROUPS' });
		return errors; // Can't validate further without groups
	}

	// Check each group
	const seenNames = new Set<string>();
	for (let i = 0; i < input.groups.length; i++) {
		const group = input.groups[i];

		// Check group name
		const trimmedName = group.name?.trim();
		if (!trimmedName) {
			errors.push({ type: 'EMPTY_GROUP_NAME', groupIndex: i });
			continue;
		}

		// Check for duplicates (case-insensitive)
		const lowerName = trimmedName.toLowerCase();
		if (seenNames.has(lowerName)) {
			errors.push({ type: 'DUPLICATE_GROUP_NAME', name: trimmedName });
		}
		seenNames.add(lowerName);

		// Check capacity if provided
		if (group.capacity !== undefined && group.capacity !== null) {
			if (!Number.isFinite(group.capacity) || group.capacity < 1) {
				errors.push({ type: 'INVALID_CAPACITY', groupIndex: i });
			}
		}
	}

	return errors;
}

/**
 * Update a GroupTemplate with new values.
 * Returns a new object; does not mutate the original.
 */
export function updateGroupTemplate(
	template: GroupTemplate,
	updates: Partial<Pick<GroupTemplate, 'name' | 'description' | 'groups'>>
): GroupTemplate {
	const input: CreateGroupTemplateInput = {
		id: template.id,
		ownerStaffId: template.ownerStaffId,
		name: updates.name ?? template.name,
		description: updates.description ?? template.description,
		groups: updates.groups ?? template.groups
	};

	const errors = validateGroupTemplateInput(input);
	if (errors.length > 0) {
		const error = errors[0];
		switch (error.type) {
			case 'EMPTY_NAME':
				throw new Error('Template name cannot be empty');
			case 'NO_GROUPS':
				throw new Error('Template must have at least one group');
			case 'EMPTY_GROUP_NAME':
				throw new Error(`Group ${error.groupIndex + 1} has no name`);
			case 'DUPLICATE_GROUP_NAME':
				throw new Error(`Duplicate group name: "${error.name}"`);
			case 'INVALID_CAPACITY':
				throw new Error(`Group ${error.groupIndex + 1} has invalid capacity`);
		}
	}

	return {
		...template,
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		groups: input.groups.map((g) => ({
			id: g.id,
			name: g.name.trim(),
			capacity: g.capacity ?? null
		})),
		updatedAt: new Date()
	};
}
