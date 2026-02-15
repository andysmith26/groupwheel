import { describe, it, expect } from 'vitest';
import {
	createEmptyStudentPreference,
	isStudentPreference,
	extractStudentPreference
} from './preference';
import type { Preference, StudentPreference } from './preference';

describe('createEmptyStudentPreference', () => {
	it('should create preference with empty arrays', () => {
		const pref = createEmptyStudentPreference('student-1');

		expect(pref.studentId).toBe('student-1');
		expect(pref.avoidStudentIds).toEqual([]);
		expect(pref.likeGroupIds).toEqual([]);
		expect(pref.avoidGroupIds).toEqual([]);
	});

	it('should not include meta field', () => {
		const pref = createEmptyStudentPreference('student-1');
		expect(pref.meta).toBeUndefined();
	});
});

describe('isStudentPreference', () => {
	it('should return true for valid StudentPreference', () => {
		const pref: StudentPreference = {
			studentId: 'student-1',
			avoidStudentIds: ['student-2'],
			likeGroupIds: ['group-1'],
			avoidGroupIds: ['group-3']
		};
		expect(isStudentPreference(pref)).toBe(true);
	});

	it('should return true for empty arrays', () => {
		const pref: StudentPreference = {
			studentId: 'student-1',
			avoidStudentIds: [],
			likeGroupIds: [],
			avoidGroupIds: []
		};
		expect(isStudentPreference(pref)).toBe(true);
	});

	it('should return false for null', () => {
		expect(isStudentPreference(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isStudentPreference(undefined)).toBe(false);
	});

	it('should return false for a string', () => {
		expect(isStudentPreference('hello')).toBe(false);
	});

	it('should return false for a number', () => {
		expect(isStudentPreference(42)).toBe(false);
	});

	it('should return false for missing studentId', () => {
		expect(
			isStudentPreference({
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			})
		).toBe(false);
	});

	it('should return false for non-string studentId', () => {
		expect(
			isStudentPreference({
				studentId: 123,
				avoidStudentIds: [],
				likeGroupIds: [],
				avoidGroupIds: []
			})
		).toBe(false);
	});

	it('should return false for missing avoidStudentIds', () => {
		expect(
			isStudentPreference({
				studentId: 'student-1',
				likeGroupIds: [],
				avoidGroupIds: []
			})
		).toBe(false);
	});

	it('should return false for non-array likeGroupIds', () => {
		expect(
			isStudentPreference({
				studentId: 'student-1',
				avoidStudentIds: [],
				likeGroupIds: 'not-an-array',
				avoidGroupIds: []
			})
		).toBe(false);
	});

	it('should return false for missing avoidGroupIds', () => {
		expect(
			isStudentPreference({
				studentId: 'student-1',
				avoidStudentIds: [],
				likeGroupIds: []
			})
		).toBe(false);
	});
});

describe('extractStudentPreference', () => {
	it('should extract valid payload', () => {
		const studentPref: StudentPreference = {
			studentId: 'student-1',
			avoidStudentIds: ['student-2'],
			likeGroupIds: ['group-1'],
			avoidGroupIds: ['group-3']
		};
		const preference: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 'student-1',
			payload: studentPref
		};

		const result = extractStudentPreference(preference);
		expect(result).toEqual(studentPref);
	});

	it('should return empty preference for invalid payload', () => {
		const preference: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 'student-1',
			payload: { invalid: 'data' }
		};

		const result = extractStudentPreference(preference);
		expect(result.studentId).toBe('student-1');
		expect(result.avoidStudentIds).toEqual([]);
		expect(result.likeGroupIds).toEqual([]);
		expect(result.avoidGroupIds).toEqual([]);
	});

	it('should return empty preference for null payload', () => {
		const preference: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 'student-1',
			payload: null
		};

		const result = extractStudentPreference(preference);
		expect(result.studentId).toBe('student-1');
		expect(result.avoidStudentIds).toEqual([]);
	});

	it('should return empty preference for string payload', () => {
		const preference: Preference = {
			id: 'pref-1',
			programId: 'program-1',
			studentId: 'student-1',
			payload: 'not a valid preference'
		};

		const result = extractStudentPreference(preference);
		expect(result.studentId).toBe('student-1');
	});
});
