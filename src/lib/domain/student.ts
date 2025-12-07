/**
 * Student entity for the Friend Hat domain.
 *
 * Represents a student in a class roster. Students are identified by a
 * unique ID and have display information (name). Preferences about who
 * they want to work with are modeled separately via StudentPreference.
 *
 * @module domain/student
 */

/**
 * Represents a student in the class roster.
 *
 * Students are the primary participants in grouping activities. They are
 * imported from CSV/TSV files or entered manually by teachers.
 */
export interface Student {
	/**
	 * Unique identifier for this student.
	 * Often an email address, but can be any unique string.
	 * This is what StudentPreference.likeStudentIds references.
	 */
	id: string;

	/**
	 * Student's first name. Required for display purposes.
	 */
	firstName: string;

	/**
	 * Student's last name. Optional (some contexts use single names).
	 */
	lastName?: string;

	/**
	 * Grade level (e.g., "5", "10th", "Senior").
	 * Optional; used for display and potential filtering.
	 */
	gradeLevel?: string;

	/**
	 * Gender marker. In the MVP this was 'F', 'M', 'X' or empty string.
	 * Optional; used for display and potential balancing algorithms.
	 */
	gender?: string;

	/**
	 * Arbitrary metadata collected from roster import.
	 * Examples: email (if not used as id), homeroom, advisor, etc.
	 */
	meta?: Record<string, unknown>;
}

/**
 * Factory function to create a Student with validation.
 *
 * @throws Error if required fields are missing or invalid.
 */
export function createStudent(input: {
	id: string;
	firstName: string;
	lastName?: string;
	gradeLevel?: string;
	gender?: string;
	meta?: Record<string, unknown>;
}): Student {
	if (!input.id || typeof input.id !== 'string') {
		throw new Error('Student id is required and must be a string');
	}
	if (!input.firstName || typeof input.firstName !== 'string') {
		throw new Error('Student firstName is required and must be a string');
	}

	return {
		id: input.id.trim(),
		firstName: input.firstName.trim(),
		lastName: input.lastName?.trim(),
		gradeLevel: input.gradeLevel?.trim(),
		gender: input.gender?.trim(),
		meta: input.meta
	};
}

/**
 * Get a display-friendly name for a student.
 * Returns "FirstName LastName" or just "FirstName" if no last name.
 */
export function getStudentDisplayName(student: Student): string {
	const firstRaw = student.firstName ?? '';
	const lastRaw = student.lastName ?? '';
	const combined = `${firstRaw} ${lastRaw}`.trim();
	const baseName = combined || firstRaw.trim() || lastRaw.trim() || '';
	const grade = (student.gradeLevel ?? '').toString().trim();
	return grade ? `${baseName} (Grade ${grade})` : baseName;
}
