import { describe, expect, it } from 'vitest';
import { getGenerationErrorMessage, errorMessages } from './generationErrorMessages';

describe('getGenerationErrorMessage', () => {
	it('returns empty string for null input', () => {
		expect(getGenerationErrorMessage(null)).toBe('');
	});

	it('returns user-friendly message for POOL_HAS_NO_MEMBERS', () => {
		expect(getGenerationErrorMessage('POOL_HAS_NO_MEMBERS')).toBe(
			'No students in roster. Go back and add students.'
		);
	});

	it('returns user-friendly message for POOL_NOT_FOUND', () => {
		expect(getGenerationErrorMessage('POOL_NOT_FOUND')).toBe(
			'Roster not found. Please create a new activity.'
		);
	});

	it('returns user-friendly message for PROGRAM_NOT_FOUND', () => {
		expect(getGenerationErrorMessage('PROGRAM_NOT_FOUND')).toBe(
			'Activity not found. Please create a new activity.'
		);
	});

	it('returns user-friendly message for GROUPING_ALGORITHM_FAILED', () => {
		expect(getGenerationErrorMessage('GROUPING_ALGORITHM_FAILED')).toBe(
			"Couldn't create balanced groups. Try adjusting group sizes."
		);
	});

	it('returns user-friendly message for DOMAIN_VALIDATION_FAILED', () => {
		expect(getGenerationErrorMessage('DOMAIN_VALIDATION_FAILED')).toBe(
			'Invalid configuration. Please check your settings.'
		);
	});

	it('returns user-friendly message for SCENARIO_ALREADY_EXISTS_FOR_PROGRAM', () => {
		expect(getGenerationErrorMessage('SCENARIO_ALREADY_EXISTS_FOR_PROGRAM')).toBe(
			'Groups already exist for this activity.'
		);
	});

	it('returns user-friendly message for INTERNAL_ERROR', () => {
		expect(getGenerationErrorMessage('INTERNAL_ERROR')).toBe(
			'An unexpected error occurred. Please try again.'
		);
	});

	it('returns fallback message for unknown error type', () => {
		expect(getGenerationErrorMessage('UNKNOWN_ERROR_TYPE')).toBe(
			'Something went wrong. Please try again.'
		);
	});

	it('returns empty string for empty string input', () => {
		// Empty string is falsy, so treated like null
		expect(getGenerationErrorMessage('')).toBe('');
	});
});

describe('errorMessages', () => {
	it('contains all expected error types', () => {
		const expectedTypes = [
			'POOL_HAS_NO_MEMBERS',
			'POOL_NOT_FOUND',
			'PROGRAM_NOT_FOUND',
			'GROUPING_ALGORITHM_FAILED',
			'DOMAIN_VALIDATION_FAILED',
			'SCENARIO_ALREADY_EXISTS_FOR_PROGRAM',
			'INTERNAL_ERROR'
		];

		for (const type of expectedTypes) {
			expect(errorMessages[type]).toBeDefined();
			expect(typeof errorMessages[type]).toBe('string');
			expect(errorMessages[type].length).toBeGreaterThan(0);
		}
	});
});
