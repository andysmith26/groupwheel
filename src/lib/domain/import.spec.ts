import { describe, it, expect } from 'vitest';
import {
  hasRequiredMappings,
  getMissingRequiredFields,
  hasDuplicateMappings,
  validateMappedData,
  isChoiceField,
  getChoiceRank,
  isPeerRequestField,
  isStudentIdField,
  getPeerRequestRank,
  hasMappedField,
  hasAnyChoiceMappings,
  hasAnyPeerRequestMappings,
  getMappedColumnIndex,
  reconcileRowsByStudentId,
  generateStudentId,
  type ColumnMapping,
  type RawSheetData
} from './import';

describe('isChoiceField', () => {
  it('returns true for choice fields', () => {
    expect(isChoiceField('choice1')).toBe(true);
    expect(isChoiceField('choice5')).toBe(true);
  });

  it('returns false for non-choice fields', () => {
    expect(isChoiceField('firstName')).toBe(false);
    expect(isChoiceField('lastName')).toBe(false);
    expect(isChoiceField('ignore')).toBe(false);
  });
});

describe('getChoiceRank', () => {
  it('returns rank for choice fields', () => {
    expect(getChoiceRank('choice1')).toBe(1);
    expect(getChoiceRank('choice3')).toBe(3);
    expect(getChoiceRank('choice5')).toBe(5);
  });

  it('returns null for non-choice fields', () => {
    expect(getChoiceRank('firstName')).toBeNull();
    expect(getChoiceRank('ignore')).toBeNull();
  });
});

describe('isPeerRequestField', () => {
  it('returns true for peer request fields', () => {
    expect(isPeerRequestField('peerRequest1')).toBe(true);
    expect(isPeerRequestField('peerRequest5')).toBe(true);
  });

  it('returns false for non-peer request fields', () => {
    expect(isPeerRequestField('choice1')).toBe(false);
    expect(isPeerRequestField('firstName')).toBe(false);
  });
});

describe('isStudentIdField', () => {
  it('returns true for the student ID field', () => {
    expect(isStudentIdField('studentId')).toBe(true);
  });

  it('returns false for other fields', () => {
    expect(isStudentIdField('firstName')).toBe(false);
    expect(isStudentIdField('peerRequest1')).toBe(false);
  });
});

describe('getPeerRequestRank', () => {
  it('returns rank for peer request fields', () => {
    expect(getPeerRequestRank('peerRequest1')).toBe(1);
    expect(getPeerRequestRank('peerRequest4')).toBe(4);
    expect(getPeerRequestRank('peerRequest5')).toBe(5);
  });

  it('returns null for non-peer request fields', () => {
    expect(getPeerRequestRank('choice1')).toBeNull();
    expect(getPeerRequestRank('ignore')).toBeNull();
  });
});

describe('hasRequiredMappings', () => {
  it('returns true when firstName is mapped', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Name', mappedTo: 'firstName' }
    ];

    expect(hasRequiredMappings(mappings)).toBe(true);
  });

  it('returns true when displayName is mapped', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Name', mappedTo: 'displayName' }
    ];

    expect(hasRequiredMappings(mappings)).toBe(true);
  });

  it('returns false when firstName is not mapped', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Name', mappedTo: 'lastName' },
      { columnIndex: 1, headerName: 'ID', mappedTo: null }
    ];

    expect(hasRequiredMappings(mappings)).toBe(false);
  });

  it('returns false for empty mappings', () => {
    expect(hasRequiredMappings([])).toBe(false);
  });
});

describe('getMissingRequiredFields', () => {
  it('returns empty array when all required fields mapped', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Name', mappedTo: 'firstName' }
    ];

    expect(getMissingRequiredFields(mappings)).toEqual([]);
  });

  it('returns missing fields', () => {
    const mappings: ColumnMapping[] = [{ columnIndex: 0, headerName: 'ID', mappedTo: 'ignore' }];

    expect(getMissingRequiredFields(mappings)).toEqual(['firstName']);
  });
});

describe('hasDuplicateMappings', () => {
  it('returns empty array when no duplicates', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Last', mappedTo: 'lastName' }
    ];

    expect(hasDuplicateMappings(mappings)).toEqual([]);
  });

  it('returns duplicate fields', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Name', mappedTo: 'firstName' }
    ];

    expect(hasDuplicateMappings(mappings)).toEqual(['firstName']);
  });

  it('ignores duplicate ignore mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'A', mappedTo: 'ignore' },
      { columnIndex: 1, headerName: 'B', mappedTo: 'ignore' }
    ];

    expect(hasDuplicateMappings(mappings)).toEqual([]);
  });

  it('ignores null mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'A', mappedTo: null },
      { columnIndex: 1, headerName: 'B', mappedTo: null }
    ];

    expect(hasDuplicateMappings(mappings)).toEqual([]);
  });
});

describe('mapping helpers', () => {
  const mappings: ColumnMapping[] = [
    { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
    { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' },
    { columnIndex: 2, headerName: 'Ignored', mappedTo: 'ignore' }
  ];

  it('detects mapped fields', () => {
    expect(hasMappedField(mappings, 'studentId')).toBe(true);
    expect(hasMappedField(mappings, 'firstName')).toBe(false);
  });

  it('detects peer request mappings', () => {
    expect(hasAnyPeerRequestMappings(mappings)).toBe(true);
    expect(hasAnyChoiceMappings(mappings)).toBe(false);
  });

  it('returns the mapped column index', () => {
    expect(getMappedColumnIndex(mappings, 'studentId')).toBe(0);
    expect(getMappedColumnIndex(mappings, 'choice1')).toBeNull();
  });
});

describe('reconcileRowsByStudentId', () => {
  const data: RawSheetData = {
    headers: ['Student ID', 'Peer Request 1'],
    rows: [
      { rowIndex: 2, cells: ['stu-1', 'Bob Jones'] },
      { rowIndex: 3, cells: ['STU-2', 'Ava Smith'] },
      { rowIndex: 4, cells: ['missing-student', 'No Match'] },
      { rowIndex: 5, cells: ['', 'Blank ID'] }
    ]
  };

  const mappings: ColumnMapping[] = [
    { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
    { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
  ];

  it('matches rows case-insensitively against valid student IDs', () => {
    const result = reconcileRowsByStudentId(data, mappings, ['stu-1', 'stu-2']);

    expect(result.matched).toEqual([
      { rowIndex: 2, studentId: 'stu-1' },
      { rowIndex: 3, studentId: 'stu-2' }
    ]);
  });

  it('matches rows against stored source student IDs and returns internal student ids', () => {
    const result = reconcileRowsByStudentId(data, mappings, [
      { studentId: 'internal-1', sourceStudentId: 'stu-1' },
      { studentId: 'internal-2', sourceStudentId: 'stu-2' }
    ]);

    expect(result.matched).toEqual([
      { rowIndex: 2, studentId: 'internal-1' },
      { rowIndex: 3, studentId: 'internal-2' }
    ]);
  });

  it('matches harmless Student ID formatting differences when unambiguous', () => {
    const result = reconcileRowsByStudentId(
      {
        headers: ['Student ID'],
        rows: [{ rowIndex: 2, cells: ['STU 1'] }]
      },
      [{ columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' }],
      [{ studentId: 'internal-1', sourceStudentId: 'stu-1' }]
    );

    expect(result.matched).toEqual([{ rowIndex: 2, studentId: 'internal-1' }]);
  });

  it('does not use a relaxed Student ID match when it is ambiguous', () => {
    const result = reconcileRowsByStudentId(
      {
        headers: ['Student ID'],
        rows: [{ rowIndex: 2, cells: ['STU 1'] }]
      },
      [{ columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' }],
      ['stu-1', 'stu_1']
    );

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toHaveLength(1);
  });

  it('returns unmatched rows with source context', () => {
    const result = reconcileRowsByStudentId(data, mappings, ['stu-1', 'stu-2']);

    expect(result.unmatched).toEqual([
      {
        rowIndex: 4,
        sourceStudentId: 'missing-student',
        cells: ['missing-student', 'No Match']
      },
      {
        rowIndex: 5,
        sourceStudentId: '',
        cells: ['', 'Blank ID']
      }
    ]);
  });

  it('returns no links when studentId is not mapped', () => {
    const result = reconcileRowsByStudentId(data, [], ['stu-1']);
    expect(result).toEqual({ matched: [], unmatched: [] });
  });
});

describe('validateMappedData', () => {
  const sampleData: RawSheetData = {
    headers: ['First Name', 'Last Name', 'Choice 1'],
    rows: [
      { rowIndex: 2, cells: ['Alice', 'Smith', 'Art Club'] },
      { rowIndex: 3, cells: ['Bob', 'Jones', 'Chess Club'] },
      { rowIndex: 4, cells: ['', 'Incomplete', ''] }
    ]
  };

  const basicMappings: ColumnMapping[] = [
    { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
    { columnIndex: 1, headerName: 'Last Name', mappedTo: 'lastName' },
    { columnIndex: 2, headerName: 'Choice 1', mappedTo: 'choice1' }
  ];

  it('validates rows correctly', () => {
    const result = validateMappedData(sampleData, basicMappings);

    expect(result.validRows).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.summary).toEqual({
      totalRows: 3,
      validCount: 2,
      invalidCount: 1
    });
  });

  it('extracts student data from valid rows', () => {
    const result = validateMappedData(sampleData, basicMappings);

    expect(result.validRows[0].student).toEqual({
      firstName: 'Alice',
      lastName: 'Smith'
    });
    expect(result.validRows[0].choices).toEqual(['Art Club']);
  });

  it('extracts an optional preferred name', () => {
    const data: RawSheetData = {
      headers: ['First Name', 'Preferred Name', 'Last Name'],
      rows: [{ rowIndex: 2, cells: ['Alexander', 'Alex', 'Smith'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Preferred Name', mappedTo: 'preferredName' },
      { columnIndex: 2, headerName: 'Last Name', mappedTo: 'lastName' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].student).toEqual({
      firstName: 'Alexander',
      preferredName: 'Alex',
      lastName: 'Smith'
    });
  });

  it('extracts multiple tags from a mapped tags column', () => {
    const data: RawSheetData = {
      headers: ['First Name', 'Tags'],
      rows: [{ rowIndex: 2, cells: ['Alex', 'Honors; ELL | Student Leader'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Tags', mappedTo: 'tags' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].student).toMatchObject({
      firstName: 'Alex',
      tags: ['Honors', 'ELL', 'Student Leader']
    });
  });

  it('allows multiple tag columns and combines their values', () => {
    const data: RawSheetData = {
      headers: ['First Name', 'Support', 'Program'],
      rows: [{ rowIndex: 2, cells: ['Alex', 'ELL', 'Math; Science'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Support', mappedTo: 'tags' },
      { columnIndex: 2, headerName: 'Program', mappedTo: 'tags' }
    ];

    expect(hasDuplicateMappings(mappings)).toEqual([]);
    expect(validateMappedData(data, mappings).validRows[0].student?.tags).toEqual([
      'ELL',
      'Math',
      'Science'
    ]);
  });

  it('handles rows with missing lastName', () => {
    const data: RawSheetData = {
      headers: ['First', 'Choice'],
      rows: [{ rowIndex: 2, cells: ['Alice', 'Art'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Choice', mappedTo: 'choice1' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].student).toEqual({
      firstName: 'Alice',
      lastName: undefined
    });
  });

  it('reports errors for empty firstName', () => {
    const result = validateMappedData(sampleData, basicMappings);

    expect(result.invalidRows[0].rowIndex).toBe(4);
    expect(result.invalidRows[0].errors).toContain('First name is empty');
  });

  it('collects multiple choice columns in order', () => {
    const data: RawSheetData = {
      headers: ['First', 'C1', 'C2', 'C3'],
      rows: [{ rowIndex: 2, cells: ['Alice', 'Art', 'Music', 'Drama'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'C1', mappedTo: 'choice1' },
      { columnIndex: 2, headerName: 'C2', mappedTo: 'choice2' },
      { columnIndex: 3, headerName: 'C3', mappedTo: 'choice3' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].choices).toEqual(['Art', 'Music', 'Drama']);
  });

  it('skips empty choice cells', () => {
    const data: RawSheetData = {
      headers: ['First', 'C1', 'C2'],
      rows: [{ rowIndex: 2, cells: ['Alice', 'Art', ''] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'C1', mappedTo: 'choice1' },
      { columnIndex: 2, headerName: 'C2', mappedTo: 'choice2' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].choices).toEqual(['Art']);
  });

  it('handles unmapped columns', () => {
    const data: RawSheetData = {
      headers: ['First', 'Extra', 'Choice'],
      rows: [{ rowIndex: 2, cells: ['Alice', 'Ignored', 'Art'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'First', mappedTo: 'firstName' },
      { columnIndex: 1, headerName: 'Extra', mappedTo: 'ignore' },
      { columnIndex: 2, headerName: 'Choice', mappedTo: 'choice1' }
    ];

    const result = validateMappedData(data, mappings);

    expect(result.validRows[0].student?.firstName).toBe('Alice');
    expect(result.validRows[0].choices).toEqual(['Art']);
  });
});

describe('generateStudentId', () => {
  it('generates ID from name and row index', () => {
    const id = generateStudentId('Alice', 'Smith', 5);
    expect(id).toBe('alicesmith-5');
  });

  it('handles missing last name', () => {
    const id = generateStudentId('Alice', undefined, 3);
    expect(id).toBe('alice-3');
  });

  it('handles names with spaces', () => {
    const id = generateStudentId('Mary Jane', 'Watson Smith', 7);
    // The function converts to lowercase and replaces spaces with dashes
    expect(id).toBe('mary-janewatson-smith-7');
  });
});
