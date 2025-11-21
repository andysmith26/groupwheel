export interface Student {
	id: string;
	firstName: string;
	lastName: string;
	gradeLevel?: string;
}

/**
 * Convenience helper for display names in UI and logs.
 */
export function getStudentDisplayName(student: Student): string {
	const base = `${student.firstName} ${student.lastName}`.trim();
	return student.gradeLevel ? `${base} (Grade ${student.gradeLevel})` : base;
}