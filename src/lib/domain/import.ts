/**
 * Domain types for roster import with column mapping.
 *
 * These types support importing student data from external sources
 * (like Google Sheets) where column structure is not predefined.
 * The user maps columns to domain fields through a preview UI.
 *
 * @module domain/import
 */

import type { PeerRequestRank } from './peerRequest';

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
 * - studentId: Existing roster identifier for import reconciliation.
 * - displayName or firstName: One is required to identify each student.
 * - preferredName: Optional. Name the student uses in class.
 * - lastName: Optional. Student's last name.
 * - tags: Optional. Comma, semicolon, or pipe-separated student labels.
 * - choice1-5: Optional. Ranked group preferences (Shape B format).
 * - ignore: Explicitly skip this column.
 */
export type MappedField =
  | 'studentId'
  | 'displayName'
  | 'firstName'
  | 'preferredName'
  | 'lastName'
  | 'tags'
  | 'choice1'
  | 'choice2'
  | 'choice3'
  | 'choice4'
  | 'choice5'
  | 'peerRequest1'
  | 'peerRequest2'
  | 'peerRequest3'
  | 'peerRequest4'
  | 'peerRequest5'
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

export function isPeerRequestField(
  field: string
): field is 'peerRequest1' | 'peerRequest2' | 'peerRequest3' | 'peerRequest4' | 'peerRequest5' {
  return /^peerRequest[1-5]$/i.test(field);
}

export function isStudentIdField(field: string): field is 'studentId' {
  return field === 'studentId';
}

export function getPeerRequestRank(field: MappedField): PeerRequestRank | null {
  if (!isPeerRequestField(field)) return null;
  const rank = parseInt(field.replace('peerRequest', ''), 10);
  return rank >= 1 && rank <= 5 ? (rank as PeerRequestRank) : null;
}

/**
 * Default required field shown by the mapping UI. A displayName mapping is
 * also accepted by hasRequiredMappings for single-name-column rosters.
 */
export const REQUIRED_FIELDS: MappedField[] = ['firstName'];

/**
 * All optional fields that can be mapped.
 */
export const OPTIONAL_FIELDS: MappedField[] = [
  'studentId',
  'displayName',
  'preferredName',
  'lastName',
  'tags',
  'choice1',
  'choice2',
  'choice3',
  'choice4',
  'choice5',
  'peerRequest1',
  'peerRequest2',
  'peerRequest3',
  'peerRequest4',
  'peerRequest5'
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
    preferredName?: string;
    lastName?: string;
    tags?: string[];
    sourceStudentId?: string;
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

export interface StudentIdRowLink {
  rowIndex: number;
  studentId: string;
}

export interface UnmatchedStudentIdRow {
  rowIndex: number;
  sourceStudentId: string;
  cells: string[];
}

export interface StudentIdReconciliationResult {
  matched: StudentIdRowLink[];
  unmatched: UnmatchedStudentIdRow[];
}

export interface ValidStudentIdReference {
  studentId: string;
  sourceStudentId?: string;
}

function normalizeStudentIdForMatching(studentId: string): string {
  return studentId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if all required fields are mapped.
 */
export function hasRequiredMappings(mappings: ColumnMapping[]): boolean {
  const mappedFields = new Set(mappings.map((m) => m.mappedTo).filter((f) => f !== null));
  return mappedFields.has('firstName') || mappedFields.has('displayName');
}

/**
 * Get the list of missing required field mappings.
 */
export function getMissingRequiredFields(mappings: ColumnMapping[]): MappedField[] {
  const mappedFields = new Set(mappings.map((m) => m.mappedTo).filter((f) => f !== null));
  return mappedFields.has('firstName') || mappedFields.has('displayName') ? [] : REQUIRED_FIELDS;
}

/**
 * Validate that single-value fields are not mapped to multiple columns.
 * Tags are multi-value and can intentionally be sourced from several columns.
 */
export function hasDuplicateMappings(mappings: ColumnMapping[]): MappedField[] {
  const fieldCounts = new Map<MappedField, number>();

  for (const mapping of mappings) {
    if (mapping.mappedTo && mapping.mappedTo !== 'ignore' && mapping.mappedTo !== 'tags') {
      const count = fieldCounts.get(mapping.mappedTo) || 0;
      fieldCounts.set(mapping.mappedTo, count + 1);
    }
  }

  return Array.from(fieldCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([field]) => field);
}

export function hasMappedField(mappings: ColumnMapping[], field: MappedField): boolean {
  return mappings.some((mapping) => mapping.mappedTo === field);
}

export function hasAnyChoiceMappings(mappings: ColumnMapping[]): boolean {
  return mappings.some((mapping) => mapping.mappedTo !== null && isChoiceField(mapping.mappedTo));
}

export function hasAnyPeerRequestMappings(mappings: ColumnMapping[]): boolean {
  return mappings.some(
    (mapping) => mapping.mappedTo !== null && isPeerRequestField(mapping.mappedTo)
  );
}

export function getMappedColumnIndex(mappings: ColumnMapping[], field: MappedField): number | null {
  const mapping = mappings.find((entry) => entry.mappedTo === field);
  return mapping ? mapping.columnIndex : null;
}

export function reconcileRowsByStudentId(
  data: RawSheetData,
  mappings: ColumnMapping[],
  validStudentIds: Array<string | ValidStudentIdReference>
): StudentIdReconciliationResult {
  const studentIdColumnIndex = getMappedColumnIndex(mappings, 'studentId');
  if (studentIdColumnIndex === null) {
    return {
      matched: [],
      unmatched: []
    };
  }

  const validIdsByLowercase = new Map<string, string>();
  const validIdsByNormalizedFormat = new Map<string, string | null>();

  const addNormalizedId = (sourceStudentId: string, studentId: string): void => {
    const normalizedId = normalizeStudentIdForMatching(sourceStudentId);
    if (!normalizedId) return;

    if (!validIdsByNormalizedFormat.has(normalizedId)) {
      validIdsByNormalizedFormat.set(normalizedId, studentId);
      return;
    }

    const existingStudentId = validIdsByNormalizedFormat.get(normalizedId);
    if (existingStudentId !== studentId) {
      validIdsByNormalizedFormat.set(normalizedId, null);
    }
  };

  for (const validStudent of validStudentIds) {
    if (typeof validStudent === 'string') {
      const normalizedStudentId = validStudent.trim().toLowerCase();
      validIdsByLowercase.set(normalizedStudentId, validStudent);
      addNormalizedId(validStudent, validStudent);
      continue;
    }

    const normalizedStudentId = validStudent.studentId.trim().toLowerCase();
    if (normalizedStudentId) {
      validIdsByLowercase.set(normalizedStudentId, validStudent.studentId);
      addNormalizedId(validStudent.studentId, validStudent.studentId);
    }

    const normalizedSourceStudentId = validStudent.sourceStudentId?.trim().toLowerCase();
    if (normalizedSourceStudentId) {
      validIdsByLowercase.set(normalizedSourceStudentId, validStudent.studentId);
      addNormalizedId(validStudent.sourceStudentId ?? '', validStudent.studentId);
    }
  }

  const matched: StudentIdRowLink[] = [];
  const unmatched: UnmatchedStudentIdRow[] = [];

  for (const row of data.rows) {
    const sourceStudentId = (row.cells[studentIdColumnIndex] ?? '').trim();
    if (!sourceStudentId) {
      unmatched.push({
        rowIndex: row.rowIndex,
        sourceStudentId: '',
        cells: [...row.cells]
      });
      continue;
    }

    const matchedStudentId =
      validIdsByLowercase.get(sourceStudentId.toLowerCase()) ??
      validIdsByNormalizedFormat.get(normalizeStudentIdForMatching(sourceStudentId));
    if (!matchedStudentId) {
      unmatched.push({
        rowIndex: row.rowIndex,
        sourceStudentId,
        cells: [...row.cells]
      });
      continue;
    }

    matched.push({
      rowIndex: row.rowIndex,
      studentId: matchedStudentId
    });
  }

  return {
    matched,
    unmatched
  };
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
    const displayNameIdx = fieldToColumn.get('displayName');
    const displayName =
      displayNameIdx !== undefined ? (row.cells[displayNameIdx] ?? '').trim() : '';
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName =
      firstNameIdx !== undefined ? (row.cells[firstNameIdx] ?? '').trim() : (nameParts[0] ?? '');

    if (!firstName) {
      errors.push('First name is empty');
    } else {
      // Extract lastName (optional)
      const preferredNameIdx = fieldToColumn.get('preferredName');
      const preferredName =
        preferredNameIdx !== undefined ? (row.cells[preferredNameIdx] ?? '').trim() : '';
      const lastNameIdx = fieldToColumn.get('lastName');
      const lastName =
        lastNameIdx !== undefined
          ? (row.cells[lastNameIdx] ?? '').trim()
          : firstNameIdx === undefined
            ? nameParts.slice(1).join(' ')
            : '';
      const tags = Array.from(
        new Set(
          mappings
            .filter((mapping) => mapping.mappedTo === 'tags')
            .flatMap((mapping) =>
              (row.cells[mapping.columnIndex] ?? '')
                .split(/[,;|]/)
                .map((tag) => tag.trim())
                .filter(Boolean)
            )
        )
      );
      const studentIdIdx = fieldToColumn.get('studentId');
      const sourceStudentId =
        studentIdIdx !== undefined ? (row.cells[studentIdIdx] ?? '').trim() : '';

      student = {
        firstName,
        lastName: lastName || undefined,
        sourceStudentId: sourceStudentId || undefined,
        ...(preferredName ? { preferredName } : {}),
        ...(tags.length > 0 ? { tags } : {})
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
