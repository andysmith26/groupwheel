import { describe, it, expect } from 'vitest';
import {
	createGroupTemplate,
	validateGroupTemplateInput,
	updateGroupTemplate
} from './groupTemplate';
import type { CreateGroupTemplateInput, GroupTemplate } from './groupTemplate';

function validInput(overrides?: Partial<CreateGroupTemplateInput>): CreateGroupTemplateInput {
	return {
		id: 'template-1',
		ownerStaffId: 'staff-1',
		name: 'Fall Clubs',
		groups: [
			{ id: 'g1', name: 'Art Club', capacity: 10 },
			{ id: 'g2', name: 'Chess Club', capacity: 8 }
		],
		...overrides
	};
}

describe('validateGroupTemplateInput', () => {
	it('should return no errors for valid input', () => {
		expect(validateGroupTemplateInput(validInput())).toEqual([]);
	});

	it('should return EMPTY_NAME for empty name', () => {
		const errors = validateGroupTemplateInput(validInput({ name: '' }));
		expect(errors).toContainEqual({ type: 'EMPTY_NAME' });
	});

	it('should return EMPTY_NAME for whitespace-only name', () => {
		const errors = validateGroupTemplateInput(validInput({ name: '   ' }));
		expect(errors).toContainEqual({ type: 'EMPTY_NAME' });
	});

	it('should return NO_GROUPS for empty groups array', () => {
		const errors = validateGroupTemplateInput(validInput({ groups: [] }));
		expect(errors).toContainEqual({ type: 'NO_GROUPS' });
	});

	it('should return EMPTY_GROUP_NAME for group with empty name', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [{ id: 'g1', name: '', capacity: 10 }]
			})
		);
		expect(errors).toContainEqual({ type: 'EMPTY_GROUP_NAME', groupIndex: 0 });
	});

	it('should return DUPLICATE_GROUP_NAME for duplicates (case-insensitive)', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [
					{ id: 'g1', name: 'Art Club', capacity: 10 },
					{ id: 'g2', name: 'art club', capacity: 8 }
				]
			})
		);
		expect(errors).toContainEqual({ type: 'DUPLICATE_GROUP_NAME', name: 'art club' });
	});

	it('should return INVALID_CAPACITY for zero capacity', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [{ id: 'g1', name: 'Art Club', capacity: 0 }]
			})
		);
		expect(errors).toContainEqual({ type: 'INVALID_CAPACITY', groupIndex: 0 });
	});

	it('should return INVALID_CAPACITY for negative capacity', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [{ id: 'g1', name: 'Art Club', capacity: -5 }]
			})
		);
		expect(errors).toContainEqual({ type: 'INVALID_CAPACITY', groupIndex: 0 });
	});

	it('should allow null capacity', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [{ id: 'g1', name: 'Art Club', capacity: null }]
			})
		);
		expect(errors).toEqual([]);
	});

	it('should allow undefined capacity', () => {
		const errors = validateGroupTemplateInput(
			validInput({
				groups: [{ id: 'g1', name: 'Art Club' }]
			})
		);
		expect(errors).toEqual([]);
	});
});

describe('createGroupTemplate', () => {
	it('should create a valid template', () => {
		const template = createGroupTemplate(validInput());

		expect(template.id).toBe('template-1');
		expect(template.ownerStaffId).toBe('staff-1');
		expect(template.name).toBe('Fall Clubs');
		expect(template.groups).toHaveLength(2);
		expect(template.groups[0].name).toBe('Art Club');
		expect(template.groups[0].capacity).toBe(10);
		expect(template.createdAt).toBeInstanceOf(Date);
		expect(template.updatedAt).toBeInstanceOf(Date);
	});

	it('should trim template name', () => {
		const template = createGroupTemplate(validInput({ name: '  Fall Clubs  ' }));
		expect(template.name).toBe('Fall Clubs');
	});

	it('should trim group names', () => {
		const template = createGroupTemplate(
			validInput({
				groups: [{ id: 'g1', name: '  Art Club  ', capacity: 10 }]
			})
		);
		expect(template.groups[0].name).toBe('Art Club');
	});

	it('should trim description', () => {
		const template = createGroupTemplate(validInput({ description: '  A description  ' }));
		expect(template.description).toBe('A description');
	});

	it('should set description to undefined for empty string', () => {
		const template = createGroupTemplate(validInput({ description: '   ' }));
		expect(template.description).toBeUndefined();
	});

	it('should default capacity to null', () => {
		const template = createGroupTemplate(
			validInput({
				groups: [{ id: 'g1', name: 'Art Club' }]
			})
		);
		expect(template.groups[0].capacity).toBeNull();
	});

	it('should preserve userId', () => {
		const template = createGroupTemplate(validInput({ userId: 'user-123' }));
		expect(template.userId).toBe('user-123');
	});

	it('should throw for empty name', () => {
		expect(() => createGroupTemplate(validInput({ name: '' }))).toThrow(
			'Template name cannot be empty'
		);
	});

	it('should throw for no groups', () => {
		expect(() => createGroupTemplate(validInput({ groups: [] }))).toThrow(
			'Template must have at least one group'
		);
	});

	it('should throw for empty group name', () => {
		expect(() =>
			createGroupTemplate(
				validInput({
					groups: [{ id: 'g1', name: '', capacity: 10 }]
				})
			)
		).toThrow('Group 1 has no name');
	});

	it('should throw for duplicate group names', () => {
		expect(() =>
			createGroupTemplate(
				validInput({
					groups: [
						{ id: 'g1', name: 'Art', capacity: 10 },
						{ id: 'g2', name: 'Art', capacity: 8 }
					]
				})
			)
		).toThrow('Duplicate group name: "Art"');
	});

	it('should throw for invalid capacity', () => {
		expect(() =>
			createGroupTemplate(
				validInput({
					groups: [{ id: 'g1', name: 'Art Club', capacity: -1 }]
				})
			)
		).toThrow('Group 1 has invalid capacity');
	});
});

describe('updateGroupTemplate', () => {
	function makeTemplate(): GroupTemplate {
		return createGroupTemplate(validInput());
	}

	it('should update name', () => {
		const template = makeTemplate();
		const updated = updateGroupTemplate(template, { name: 'Spring Clubs' });

		expect(updated.name).toBe('Spring Clubs');
		expect(updated.id).toBe(template.id);
	});

	it('should update description', () => {
		const template = makeTemplate();
		const updated = updateGroupTemplate(template, { description: 'New description' });

		expect(updated.description).toBe('New description');
	});

	it('should update groups', () => {
		const template = makeTemplate();
		const updated = updateGroupTemplate(template, {
			groups: [{ id: 'g3', name: 'Music Club', capacity: 12 }]
		});

		expect(updated.groups).toHaveLength(1);
		expect(updated.groups[0].name).toBe('Music Club');
	});

	it('should update updatedAt timestamp', () => {
		const template = makeTemplate();
		const updated = updateGroupTemplate(template, { name: 'Changed' });

		expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(template.updatedAt.getTime());
	});

	it('should not mutate original template', () => {
		const template = makeTemplate();
		const originalName = template.name;
		updateGroupTemplate(template, { name: 'Changed' });

		expect(template.name).toBe(originalName);
	});

	it('should throw for invalid updates', () => {
		const template = makeTemplate();
		expect(() => updateGroupTemplate(template, { name: '' })).toThrow(
			'Template name cannot be empty'
		);
	});
});
