import { describe, it, expect } from 'vitest';
import { createPlacement } from './placement';
import type { CreatePlacementParams } from './placement';

function validParams(overrides?: Partial<CreatePlacementParams>): CreatePlacementParams {
	return {
		id: 'placement-1',
		sessionId: 'session-1',
		studentId: 'student-1',
		groupId: 'group-1',
		groupName: 'Art Club',
		preferenceRank: 1,
		assignedAt: new Date('2024-09-01'),
		...overrides
	};
}

describe('createPlacement', () => {
	it('should create a valid placement', () => {
		const placement = createPlacement(validParams());

		expect(placement.id).toBe('placement-1');
		expect(placement.sessionId).toBe('session-1');
		expect(placement.studentId).toBe('student-1');
		expect(placement.groupId).toBe('group-1');
		expect(placement.groupName).toBe('Art Club');
		expect(placement.preferenceRank).toBe(1);
		expect(placement.type).toBe('INITIAL');
	});

	it('should trim groupName', () => {
		const placement = createPlacement(validParams({ groupName: '  Art Club  ' }));
		expect(placement.groupName).toBe('Art Club');
	});

	it('should throw for missing sessionId', () => {
		expect(() => createPlacement(validParams({ sessionId: '' }))).toThrow(
			'Placement requires sessionId, studentId, and groupId'
		);
	});

	it('should throw for missing studentId', () => {
		expect(() => createPlacement(validParams({ studentId: '' }))).toThrow(
			'Placement requires sessionId, studentId, and groupId'
		);
	});

	it('should throw for missing groupId', () => {
		expect(() => createPlacement(validParams({ groupId: '' }))).toThrow(
			'Placement requires sessionId, studentId, and groupId'
		);
	});

	it('should throw for preferenceRank less than 1', () => {
		expect(() => createPlacement(validParams({ preferenceRank: 0 }))).toThrow(
			'preferenceRank must be >= 1 or null'
		);
	});

	it('should throw for negative preferenceRank', () => {
		expect(() => createPlacement(validParams({ preferenceRank: -1 }))).toThrow(
			'preferenceRank must be >= 1 or null'
		);
	});

	it('should allow null preferenceRank', () => {
		const placement = createPlacement(validParams({ preferenceRank: null }));
		expect(placement.preferenceRank).toBeNull();
	});

	it('should throw for empty groupName', () => {
		expect(() => createPlacement(validParams({ groupName: '' }))).toThrow(
			'Placement requires groupName'
		);
	});

	it('should throw for whitespace-only groupName', () => {
		expect(() => createPlacement(validParams({ groupName: '   ' }))).toThrow(
			'Placement requires groupName'
		);
	});

	it('should default startDate to assignedAt', () => {
		const assignedAt = new Date('2024-09-01');
		const placement = createPlacement(validParams({ assignedAt, startDate: undefined }));
		expect(placement.startDate).toEqual(assignedAt);
	});

	it('should use explicit startDate when provided', () => {
		const startDate = new Date('2024-09-15');
		const placement = createPlacement(validParams({ startDate }));
		expect(placement.startDate).toEqual(startDate);
	});

	it('should default type to INITIAL', () => {
		const placement = createPlacement(validParams());
		expect(placement.type).toBe('INITIAL');
	});

	it('should allow TRANSFER type', () => {
		const placement = createPlacement(validParams({ type: 'TRANSFER' }));
		expect(placement.type).toBe('TRANSFER');
	});

	it('should allow CORRECTION type with correctsPlacementId', () => {
		const placement = createPlacement(
			validParams({
				type: 'CORRECTION',
				correctsPlacementId: 'placement-old',
				reason: 'Wrong group'
			})
		);
		expect(placement.type).toBe('CORRECTION');
		expect(placement.correctsPlacementId).toBe('placement-old');
		expect(placement.reason).toBe('Wrong group');
	});

	it('should include preferenceSnapshot when provided', () => {
		const snapshot = ['group-1', 'group-2', 'group-3'];
		const placement = createPlacement(validParams({ preferenceSnapshot: snapshot }));
		expect(placement.preferenceSnapshot).toEqual(snapshot);
	});
});
