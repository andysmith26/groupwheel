import { describe, it, expect } from 'vitest';
import { createStudent, getCanonicalId, getStudentDisplayName } from './student';
import type { Student } from './student';

describe('getStudentDisplayName', () => {
	it('should return firstName + lastName when both are present', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe'
		};

		expect(getStudentDisplayName(student)).toBe('John Doe');
	});

	it('should include grade level when present', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe',
			gradeLevel: '10'
		};

		expect(getStudentDisplayName(student)).toBe('John Doe (Grade 10)');
	});

	it('should handle missing firstName', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			lastName: 'Doe'
		};

		expect(getStudentDisplayName(student)).toBe('Doe');
	});

	it('should handle missing lastName', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: ''
		};

		expect(getStudentDisplayName(student)).toBe('John');
	});

	it('should handle both names missing', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			lastName: ''
		};

		expect(getStudentDisplayName(student)).toBe('');
	});

	it('should trim whitespace from combined name', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '  John  ',
			lastName: '  Doe  '
		};

		expect(getStudentDisplayName(student)).toBe('John     Doe');
	});

	it('should handle grade level with just first name', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: '',
			gradeLevel: '9'
		};

		expect(getStudentDisplayName(student)).toBe('John (Grade 9)');
	});

	it('should handle grade level with just last name', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '',
			lastName: 'Doe',
			gradeLevel: '11'
		};

		expect(getStudentDisplayName(student)).toBe('Doe (Grade 11)');
	});

	it('should handle special characters in names', () => {
		const student: Student = {
			id: 'student-1',
			firstName: "O'Brien",
			lastName: 'Smith-Jones',
			gradeLevel: '12'
		};

		expect(getStudentDisplayName(student)).toBe("O'Brien Smith-Jones (Grade 12)");
	});

	it('should handle unicode characters in names', () => {
		const student: Student = {
			id: 'student-1',
			firstName: '山田',
			lastName: '太郎',
			gradeLevel: '10'
		};

		expect(getStudentDisplayName(student)).toBe('山田 太郎 (Grade 10)');
	});

	it('should handle numeric grade levels', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe',
			gradeLevel: '12'
		};

		expect(getStudentDisplayName(student)).toBe('John Doe (Grade 12)');
	});

	it('should handle text grade levels', () => {
		const student: Student = {
			id: 'student-1',
			firstName: 'John',
			lastName: 'Doe',
			gradeLevel: 'Senior'
		};

		expect(getStudentDisplayName(student)).toBe('John Doe (Grade Senior)');
	});
});

describe('createStudent', () => {
	it('should create a valid student', () => {
		const student = createStudent({ id: 'student-1', firstName: 'John', lastName: 'Doe' });

		expect(student.id).toBe('student-1');
		expect(student.firstName).toBe('John');
		expect(student.lastName).toBe('Doe');
	});

	it('should trim id and names', () => {
		const student = createStudent({
			id: '  student-1  ',
			firstName: '  John  ',
			lastName: '  Doe  '
		});

		expect(student.id).toBe('student-1');
		expect(student.firstName).toBe('John');
		expect(student.lastName).toBe('Doe');
	});

	it('should trim optional fields', () => {
		const student = createStudent({
			id: 'student-1',
			firstName: 'John',
			gradeLevel: '  10  ',
			gender: '  F  ',
			canonicalId: '  canon-1  '
		});

		expect(student.gradeLevel).toBe('10');
		expect(student.gender).toBe('F');
		expect(student.canonicalId).toBe('canon-1');
	});

	it('should throw for missing id', () => {
		expect(() => createStudent({ id: '', firstName: 'John' })).toThrow(
			'Student id is required and must be a string'
		);
	});

	it('should throw for missing firstName', () => {
		expect(() => createStudent({ id: 'student-1', firstName: '' })).toThrow(
			'Student firstName is required and must be a string'
		);
	});

	it('should preserve meta field', () => {
		const meta = { email: 'john@example.com', homeroom: '101' };
		const student = createStudent({ id: 'student-1', firstName: 'John', meta });

		expect(student.meta).toEqual(meta);
	});
});

describe('getCanonicalId', () => {
	it('should return canonicalId when set', () => {
		const student: Student = { id: 'student-1', firstName: 'John', canonicalId: 'canon-1' };
		expect(getCanonicalId(student)).toBe('canon-1');
	});

	it('should return id when canonicalId is not set', () => {
		const student: Student = { id: 'student-1', firstName: 'John' };
		expect(getCanonicalId(student)).toBe('student-1');
	});
});
