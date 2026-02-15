import { describe, it, expect } from 'vitest';
import { createObservation } from './observation';
import type { CreateObservationParams } from './observation';

function validParams(overrides?: Partial<CreateObservationParams>): CreateObservationParams {
	return {
		id: 'obs-1',
		programId: 'program-1',
		groupId: 'group-1',
		groupName: 'Art Club',
		content: 'Great collaboration today!',
		createdAt: new Date('2024-09-15'),
		...overrides
	};
}

describe('createObservation', () => {
	it('should create a valid observation', () => {
		const obs = createObservation(validParams());

		expect(obs.id).toBe('obs-1');
		expect(obs.programId).toBe('program-1');
		expect(obs.groupId).toBe('group-1');
		expect(obs.groupName).toBe('Art Club');
		expect(obs.content).toBe('Great collaboration today!');
		expect(obs.createdAt).toEqual(new Date('2024-09-15'));
	});

	it('should throw for missing programId', () => {
		expect(() => createObservation(validParams({ programId: '' }))).toThrow(
			'Observation requires programId'
		);
	});

	it('should throw for missing groupId', () => {
		expect(() => createObservation(validParams({ groupId: '' }))).toThrow(
			'Observation requires groupId'
		);
	});

	it('should throw for missing groupName', () => {
		expect(() => createObservation(validParams({ groupName: '' }))).toThrow(
			'Observation requires groupName'
		);
	});

	it('should throw for whitespace-only groupName', () => {
		expect(() => createObservation(validParams({ groupName: '   ' }))).toThrow(
			'Observation requires groupName'
		);
	});

	it('should throw for missing content', () => {
		expect(() => createObservation(validParams({ content: '' }))).toThrow(
			'Observation requires content'
		);
	});

	it('should throw for whitespace-only content', () => {
		expect(() => createObservation(validParams({ content: '   ' }))).toThrow(
			'Observation requires content'
		);
	});

	it('should trim groupName', () => {
		const obs = createObservation(validParams({ groupName: '  Art Club  ' }));
		expect(obs.groupName).toBe('Art Club');
	});

	it('should trim content', () => {
		const obs = createObservation(validParams({ content: '  Great work!  ' }));
		expect(obs.content).toBe('Great work!');
	});

	it('should include optional sentiment', () => {
		const obs = createObservation(validParams({ sentiment: 'POSITIVE' }));
		expect(obs.sentiment).toBe('POSITIVE');
	});

	it('should filter and normalize tags', () => {
		const obs = createObservation(
			validParams({ tags: ['Collaboration', '  teamwork  ', '', '  '] })
		);
		expect(obs.tags).toEqual(['collaboration', 'teamwork']);
	});

	it('should set tags to undefined when all tags are empty', () => {
		const obs = createObservation(validParams({ tags: ['', '  '] }));
		expect(obs.tags).toBeUndefined();
	});

	it('should set tags to undefined when not provided', () => {
		const obs = createObservation(validParams());
		expect(obs.tags).toBeUndefined();
	});

	it('should include optional sessionId', () => {
		const obs = createObservation(validParams({ sessionId: 'session-1' }));
		expect(obs.sessionId).toBe('session-1');
	});

	it('should include optional userId', () => {
		const obs = createObservation(validParams({ userId: 'user-123' }));
		expect(obs.userId).toBe('user-123');
	});

	it('should include optional createdByStaffId', () => {
		const obs = createObservation(validParams({ createdByStaffId: 'staff-1' }));
		expect(obs.createdByStaffId).toBe('staff-1');
	});
});
