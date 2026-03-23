/**
 * CSV/TSV roster parser with fuzzy header matching.
 *
 * Parses a CSV or TSV file into students + group preferences by
 * fuzzy-matching column headers to: first name, last name, and
 * 1st through 4th choice columns.
 *
 * @module utils/csvRosterParser
 */

// =============================================================================
// Types
// =============================================================================

export interface ParsedRosterStudent {
  firstName: string;
  lastName: string;
  /** Ranked group choices (1st, 2nd, 3rd, 4th) as raw strings from the file */
  choices: string[];
}

export interface CsvRosterParseResult {
  students: ParsedRosterStudent[];
  /** Unique group names found across all choices */
  groupNames: string[];
  /** Which columns were matched and to what */
  columnMatches: ColumnMatch[];
  warnings: string[];
}

export interface ColumnMatch {
  columnIndex: number;
  headerText: string;
  matchedTo: MatchedField;
}

export type MatchedField =
  | 'firstName'
  | 'lastName'
  | 'choice1'
  | 'choice2'
  | 'choice3'
  | 'choice4';

// =============================================================================
// Fuzzy Header Matching
// =============================================================================

interface HeaderPattern {
  field: MatchedField;
  patterns: RegExp[];
}

const HEADER_PATTERNS: HeaderPattern[] = [
  {
    field: 'firstName',
    patterns: [
      /^first\s*name$/i,
      /^first$/i,
      /^fname$/i,
      /^given\s*name$/i,
      /^student\s*first$/i
    ]
  },
  {
    field: 'lastName',
    patterns: [
      /^last\s*name$/i,
      /^last$/i,
      /^lname$/i,
      /^surname$/i,
      /^family\s*name$/i,
      /^student\s*last$/i
    ]
  },
  {
    field: 'choice1',
    patterns: [
      /^1st\s*choice$/i,
      /^first\s*choice$/i,
      /^choice\s*1$/i,
      /^1st$/i,
      /^preference\s*1$/i,
      /^pref\s*1$/i,
      /^1st\s*pref(erence)?$/i,
      /^option\s*1$/i,
      /^pick\s*1$/i
    ]
  },
  {
    field: 'choice2',
    patterns: [
      /^2nd\s*choice$/i,
      /^second\s*choice$/i,
      /^choice\s*2$/i,
      /^2nd$/i,
      /^preference\s*2$/i,
      /^pref\s*2$/i,
      /^2nd\s*pref(erence)?$/i,
      /^option\s*2$/i,
      /^pick\s*2$/i
    ]
  },
  {
    field: 'choice3',
    patterns: [
      /^3rd\s*choice$/i,
      /^third\s*choice$/i,
      /^choice\s*3$/i,
      /^3rd$/i,
      /^preference\s*3$/i,
      /^pref\s*3$/i,
      /^3rd\s*pref(erence)?$/i,
      /^option\s*3$/i,
      /^pick\s*3$/i
    ]
  },
  {
    field: 'choice4',
    patterns: [
      /^4th\s*choice$/i,
      /^fourth\s*choice$/i,
      /^choice\s*4$/i,
      /^4th$/i,
      /^preference\s*4$/i,
      /^pref\s*4$/i,
      /^4th\s*pref(erence)?$/i,
      /^option\s*4$/i,
      /^pick\s*4$/i
    ]
  }
];

/**
 * Fuzzy-match a header string to a known field.
 * Returns null if no match found.
 */
function matchHeader(header: string): MatchedField | null {
  const trimmed = header.trim();
  for (const { field, patterns } of HEADER_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return field;
      }
    }
  }
  return null;
}

// =============================================================================
// CSV/TSV Parsing
// =============================================================================

/**
 * Split a CSV row, handling quoted fields.
 */
function splitCsvRow(row: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"' && row[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cells.push(current);
  return cells;
}

/**
 * Detect whether the file uses tabs or commas as delimiter.
 */
function detectDelimiter(firstLine: string): string {
  return firstLine.includes('\t') ? '\t' : ',';
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse a CSV or TSV string into students with group preferences.
 *
 * Expects a header row. Fuzzy-matches headers to detect:
 * - First name (required)
 * - Last name (optional)
 * - 1st, 2nd, 3rd, 4th choice (optional)
 *
 * @throws Error if the file has no usable header row or no first name column.
 */
export function parseCsvRoster(text: string): CsvRosterParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('File must have a header row and at least one data row.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvRow(lines[0], delimiter);

  // Match headers to fields
  const columnMatches: ColumnMatch[] = [];
  const usedFields = new Set<MatchedField>();

  for (let i = 0; i < headers.length; i++) {
    const field = matchHeader(headers[i]);
    if (field && !usedFields.has(field)) {
      columnMatches.push({ columnIndex: i, headerText: headers[i].trim(), matchedTo: field });
      usedFields.add(field);
    }
  }

  // Must have at least firstName
  if (!usedFields.has('firstName')) {
    throw new Error(
      'Could not find a "First Name" column. Expected headers like "First Name", "First", or "fname".'
    );
  }

  // Build lookup
  const fieldToCol = new Map<MatchedField, number>();
  for (const match of columnMatches) {
    fieldToCol.set(match.matchedTo, match.columnIndex);
  }

  const warnings: string[] = [];
  const students: ParsedRosterStudent[] = [];
  const groupNameSet = new Set<string>();

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r].trim();
    if (!line) continue;

    const cells = splitCsvRow(line, delimiter);

    const firstNameIdx = fieldToCol.get('firstName')!;
    const firstName = (cells[firstNameIdx] ?? '').trim();
    if (!firstName) {
      warnings.push(`Row ${r + 1}: empty first name, skipped.`);
      continue;
    }

    const lastNameIdx = fieldToCol.get('lastName');
    const lastName = lastNameIdx !== undefined ? (cells[lastNameIdx] ?? '').trim() : '';

    const choices: string[] = [];
    for (const choiceField of ['choice1', 'choice2', 'choice3', 'choice4'] as MatchedField[]) {
      const idx = fieldToCol.get(choiceField);
      if (idx !== undefined) {
        const val = (cells[idx] ?? '').trim();
        if (val) {
          choices.push(val);
          groupNameSet.add(val);
        }
      }
    }

    students.push({ firstName, lastName, choices });
  }

  if (students.length === 0) {
    throw new Error('No valid student rows found in the file.');
  }

  return {
    students,
    groupNames: Array.from(groupNameSet).sort(),
    columnMatches,
    warnings
  };
}

/**
 * Check if a text string looks like a CSV/TSV with headers.
 * Used to distinguish from JSON activity exports.
 */
export function looksLikeCsv(text: string): boolean {
  const firstLine = text.trim().split(/\r?\n/)[0] ?? '';
  // Has delimiter and at least one header that looks like a name field
  const hasDelimiter = firstLine.includes(',') || firstLine.includes('\t');
  const hasNameHeader = /first|last|name|fname|lname/i.test(firstLine);
  return hasDelimiter && hasNameHeader;
}
