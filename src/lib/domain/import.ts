/**
 * Domain types for roster import with column mapping.
 *
 * These types support importing student data from external sources
 * (like Google Sheets) where column structure is not predefined.
 * The user maps columns to domain fields through a preview UI.
 *
 * @module domain/import
 */

// =============================================================================
// Raw Sheet Data Types
// =============================================================================

/**
 * A single row of raw data from a sheet.
 * Cells are strings exactly as they appear in the source.
 */
export interface RawSheetRow {
	/** 1-based row index (for error messages) */
	rowIndex: number;
	/** Cell values in column order */
	cells: string[];
}

/**
 * Raw sheet data before any mapping is applied.
 * Represents the source data exactly as fetched.
 */
export interface RawSheetData {
	/** Column headers (first row of the sheet) */
	headers: string[];
	/** Data rows (excluding header row) */
	rows: RawSheetRow[];
}

// =============================================================================
// Column Mapping Types
// =============================================================================

/**
 * Domain fields that a sheet column can be mapped to.
 *
 * - firstName: Required. Student's first name.
 * - lastName: Optional. Student's last name.
 * - choice1-5: Optional. Ranked group preferences (Shape B format).
 * - ignore: Explicitly skip this column.
 */
export type MappedField =
	| 'firstName'
	| 'lastName'
	| 'choice1'
	| 'choice2'
	| 'choice3'
	| 'choice4'
	| 'choice5'
	| 'ignore';

/**
 * Mapping configuration for a single column.
 */
export interface ColumnMapping {
	/** 0-based column index */
	columnIndex: number;
	/** Original header name from the sheet */
	headerName: string;
	/** What domain field this column maps to (null = not yet mapped) */
	mappedTo: MappedField | null;
}

/**
 * Check if a field is a choice field (choice1, choice2, etc.)
 */
export function isChoiceField(field: MappedField): boolean {
	return field.startsWith('choice');
}

/**
 * Get the choice rank from a choice field (1-5).
 * Returns null for non-choice fields.
 */
export function getChoiceRank(field: MappedField): number | null {
	if (!isChoiceField(field)) return null;
	const rank = parseInt(field.replace('choice', ''), 10);
	return isNaN(rank) ? null : rank;
}

/**
 * All required fields that must be mapped for a valid import.
 */
export const REQUIRED_FIELDS: MappedField[] = ['firstName'];

/**
 * All optional fields that can be mapped.
 */
export const OPTIONAL_FIELDS: MappedField[] = [
	'lastName',
	'choice1',
	'choice2',
	'choice3',
	'choice4',
	'choice5'
];

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation result for a single row.
 */
export interface RowValidationResult {
	/** 1-based row index (matches RawSheetRow.rowIndex) */
	rowIndex: number;
	/** Whether this row can be imported */
	isValid: boolean;
	/** Specific validation errors for this row */
	errors: string[];
	/** Extracted student data (if valid) */
	student?: {
		firstName: string;
		lastName?: string;
	};
	/** Extracted group choices in rank order (if any) */
	choices?: string[];
}

/**
 * Complete validation result for an import operation.
 */
export interface ImportValidationResult {
	/** Whether the overall import can proceed */
	isValid: boolean;
	/** Rows that passed validation */
	validRows: RowValidationResult[];
	/** Rows that failed validation */
	invalidRows: RowValidationResult[];
	/** Summary statistics */
	summary: {
		totalRows: number;
		validCount: number;
		invalidCount: number;
	};
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if all required fields are mapped.
 */
export function hasRequiredMappings(mappings: ColumnMapping[]): boolean {
	const mappedFields = new Set(mappings.map((m) => m.mappedTo).filter((f) => f !== null));
	return REQUIRED_FIELDS.every((field) => mappedFields.has(field));
}

/**
 * Get the list of missing required field mappings.
 */
export function getMissingRequiredFields(mappings: ColumnMapping[]): MappedField[] {
	const mappedFields = new Set(mappings.map((m) => m.mappedTo).filter((f) => f !== null));
	return REQUIRED_FIELDS.filter((field) => !mappedFields.has(field));
}

/**
 * Validate that no field is mapped to multiple columns.
 */
export function hasDuplicateMappings(mappings: ColumnMapping[]): MappedField[] {
	const fieldCounts = new Map<MappedField, number>();

	for (const mapping of mappings) {
		if (mapping.mappedTo && mapping.mappedTo !== 'ignore') {
			const count = fieldCounts.get(mapping.mappedTo) || 0;
			fieldCounts.set(mapping.mappedTo, count + 1);
		}
	}

	return Array.from(fieldCounts.entries())
		.filter(([, count]) => count > 1)
		.map(([field]) => field);
}

/**
 * Apply column mappings to raw sheet data and validate each row.
 */
export function validateMappedData(
	data: RawSheetData,
	mappings: ColumnMapping[]
): ImportValidationResult {
	const validRows: RowValidationResult[] = [];
	const invalidRows: RowValidationResult[] = [];

	// Build a lookup from field to column index
	const fieldToColumn = new Map<MappedField, number>();
	for (const mapping of mappings) {
		if (mapping.mappedTo && mapping.mappedTo !== 'ignore') {
			fieldToColumn.set(mapping.mappedTo, mapping.columnIndex);
		}
	}

	// Validate each row
	for (const row of data.rows) {
		const errors: string[] = [];
		let student: RowValidationResult['student'] = undefined;
		const choices: string[] = [];

		// Extract firstName (required)
		const firstNameIdx = fieldToColumn.get('firstName');
		const firstName = firstNameIdx !== undefined ? (row.cells[firstNameIdx] ?? '').trim() : '';

		if (!firstName) {
			errors.push('First name is empty');
		} else {
			// Extract lastName (optional)
			const lastNameIdx = fieldToColumn.get('lastName');
			const lastName = lastNameIdx !== undefined ? (row.cells[lastNameIdx] ?? '').trim() : '';

			student = {
				firstName,
				lastName: lastName || undefined
			};
		}

		// Extract choices in order
		for (let i = 1; i <= 5; i++) {
			const choiceField = `choice${i}` as MappedField;
			const choiceIdx = fieldToColumn.get(choiceField);
			if (choiceIdx !== undefined) {
				const choiceValue = (row.cells[choiceIdx] ?? '').trim();
				if (choiceValue) {
					choices.push(choiceValue);
				}
			}
		}

		const result: RowValidationResult = {
			rowIndex: row.rowIndex,
			isValid: errors.length === 0,
			errors,
			student,
			choices: choices.length > 0 ? choices : undefined
		};

		if (result.isValid) {
			validRows.push(result);
		} else {
			invalidRows.push(result);
		}
	}

	return {
		isValid: invalidRows.length === 0 && validRows.length > 0,
		validRows,
		invalidRows,
		summary: {
			totalRows: data.rows.length,
			validCount: validRows.length,
			invalidCount: invalidRows.length
		}
	};
}

/**
 * Generate a unique student ID from a row.
 * Uses firstName + lastName + row index to create a deterministic ID.
 */
export function generateStudentId(
	firstName: string,
	lastName: string | undefined,
	rowIndex: number
): string {
	const namePart = `${firstName}${lastName || ''}`.toLowerCase().replace(/\s+/g, '-');
	return `${namePart}-${rowIndex}`;
}
