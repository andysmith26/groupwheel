/**
 * User-friendly error messages for generation failures.
 *
 * Maps internal error types from generateScenario to human-readable messages.
 */

/**
 * Map of error types to user-friendly messages.
 */
export const errorMessages: Record<string, string> = {
	POOL_HAS_NO_MEMBERS: 'No students in roster. Go back and add students.',
	POOL_NOT_FOUND: 'Roster not found. Please create a new activity.',
	PROGRAM_NOT_FOUND: 'Activity not found. Please create a new activity.',
	GROUPING_ALGORITHM_FAILED: "Couldn't create balanced groups. Try adjusting group sizes.",
	DOMAIN_VALIDATION_FAILED: 'Invalid configuration. Please check your settings.',
	SCENARIO_ALREADY_EXISTS_FOR_PROGRAM: 'Groups already exist for this activity.',
	INTERNAL_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Get a user-friendly error message for a generation error type.
 *
 * @param errorType - The error type from GenerateScenarioError
 * @returns A user-friendly error message
 */
export function getGenerationErrorMessage(errorType: string | null): string {
	if (!errorType) return '';
	return errorMessages[errorType] ?? 'Something went wrong. Please try again.';
}
