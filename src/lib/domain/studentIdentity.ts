/**
 * StudentIdentity entity for cross-activity student tracking.
 *
 * Represents a canonical student identity that persists across multiple
 * imports and activities. Students imported in different activities can
 * be linked to the same identity for unified history tracking.
 *
 * @module domain/studentIdentity
 */

/**
 * A variant of a student's name as seen in different imports.
 */
export interface NameVariant {
	/** First name as imported */
	firstName: string;
	/** Last name as imported (optional) */
	lastName?: string;
	/** Source activity/import where this variant was seen */
	source: string;
}

/**
 * Represents a canonical student identity across activities.
 *
 * StudentIdentity is the master record that links multiple Student
 * import records across different activities. All history queries
 * (placements, preferences, observations) aggregate data using
 * the canonical ID.
 */
export interface StudentIdentity {
	/**
	 * Unique identifier for this identity.
	 * This is the canonical ID that Student.canonicalId references.
	 */
	id: string;

	/**
	 * Preferred display name for this student.
	 * Teachers can update this to their preferred variant.
	 */
	displayName: string;

	/**
	 * All name variants seen across imports.
	 * Useful for matching and auditing.
	 */
	knownVariants: NameVariant[];

	/**
	 * When this identity was first created.
	 */
	createdAt: Date;

	/**
	 * User ID for multi-tenant isolation.
	 * Matches the userId on Programs/Pools.
	 */
	userId?: string;

	/**
	 * Grade level if known (may be updated across imports).
	 */
	gradeLevel?: string;

	/**
	 * Gender marker if known.
	 */
	gender?: string;
}

/**
 * Factory function to create a StudentIdentity with validation.
 *
 * @throws Error if required fields are missing or invalid.
 */
export function createStudentIdentity(input: {
	id: string;
	displayName: string;
	knownVariants?: NameVariant[];
	createdAt: Date;
	userId?: string;
	gradeLevel?: string;
	gender?: string;
}): StudentIdentity {
	if (!input.id || typeof input.id !== 'string') {
		throw new Error('StudentIdentity id is required and must be a string');
	}
	if (!input.displayName || typeof input.displayName !== 'string') {
		throw new Error('StudentIdentity displayName is required and must be a string');
	}

	return {
		id: input.id.trim(),
		displayName: input.displayName.trim(),
		knownVariants: input.knownVariants ?? [],
		createdAt: input.createdAt,
		userId: input.userId,
		gradeLevel: input.gradeLevel?.trim(),
		gender: input.gender?.trim()
	};
}

/**
 * Add a new name variant to an identity.
 * Returns a new StudentIdentity with the variant added (if not already present).
 */
export function addNameVariant(
	identity: StudentIdentity,
	variant: NameVariant
): StudentIdentity {
	// Check if this exact variant already exists
	const exists = identity.knownVariants.some(
		(v) =>
			v.firstName.toLowerCase() === variant.firstName.toLowerCase() &&
			(v.lastName?.toLowerCase() ?? '') === (variant.lastName?.toLowerCase() ?? '')
	);

	if (exists) {
		return identity;
	}

	return {
		...identity,
		knownVariants: [...identity.knownVariants, variant]
	};
}

/**
 * Compute a display name from first and last name.
 */
export function computeDisplayName(firstName: string, lastName?: string): string {
	const first = firstName.trim();
	const last = lastName?.trim() ?? '';
	return last ? `${first} ${last}` : first;
}
