import { describe, expect, it } from 'vitest';
import type { ColumnMapping, RawSheetData, UnmatchedStudentIdRow } from '$lib/domain/import';
import {
  extractMatchNameFromCells,
  extractPeerRequestTextsFromCells,
  prepareUnmatchedPeerRequestRows,
  validatePeerRequestImportMappings
} from './preparePeerRequestImportForExistingActivity';

describe('validatePeerRequestImportMappings', () => {
  it('requires a student ID mapping', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'Map the source Student ID column before continuing.'
    );
  });

  it('requires at least one peer request mapping', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'Map at least one Peer Request column before continuing.'
    );
  });

  it('rejects mixed choice and peer request mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Choice 1', mappedTo: 'choice1' },
      { columnIndex: 2, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBe(
      'This importer only supports peer requests. Remove any Choice mappings and try again.'
    );
  });

  it('accepts peer request only mappings', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' },
      { columnIndex: 2, headerName: 'Peer Request 2', mappedTo: 'peerRequest2' }
    ];

    expect(validatePeerRequestImportMappings(mappings)).toBeNull();
  });
});

describe('extractPeerRequestTextsFromCells', () => {
  it('extracts peer request values in mapped column order and skips blanks', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Peer Request 2', mappedTo: 'peerRequest2' },
      { columnIndex: 2, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];

    expect(extractPeerRequestTextsFromCells(['stu-1', '', 'Alex'], mappings)).toEqual(['Alex']);
    expect(extractPeerRequestTextsFromCells(['stu-1', 'Jordan', 'Alex'], mappings)).toEqual([
      'Jordan',
      'Alex'
    ]);
  });
});

describe('prepareUnmatchedPeerRequestRows', () => {
  it('adds parsed peer request texts and a matching-only name to unmatched rows', () => {
    const data: RawSheetData = {
      headers: ['Student ID', 'First Name', 'Last Name', 'Peer Request 1'],
      rows: [{ rowIndex: 2, cells: ['missing', 'Alice', 'Smith', 'Alex'] }]
    };
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 2, headerName: 'Last Name', mappedTo: 'lastName' },
      { columnIndex: 3, headerName: 'Peer Request 1', mappedTo: 'peerRequest1' }
    ];
    const unmatchedRows: UnmatchedStudentIdRow[] = [
      { rowIndex: 2, sourceStudentId: 'missing', cells: ['missing', 'Alice', 'Smith', 'Alex'] }
    ];

    expect(prepareUnmatchedPeerRequestRows(data, mappings, unmatchedRows)).toEqual([
      {
        rowIndex: 2,
        sourceStudentId: 'missing',
        cells: ['missing', 'Alice', 'Smith', 'Alex'],
        matchName: 'Alice Smith',
        peerRequestTexts: ['Alex']
      }
    ]);
  });
});

describe('extractMatchNameFromCells', () => {
  it('prefers display name when available', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Name', mappedTo: 'displayName' },
      { columnIndex: 2, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 3, headerName: 'Last Name', mappedTo: 'lastName' }
    ];

    expect(extractMatchNameFromCells(['stu-1', 'Alice Smith', 'Alice', 'Jones'], mappings)).toBe(
      'Alice Smith'
    );
  });

  it('falls back to first and last names when the display name cell is blank', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'Name', mappedTo: 'displayName' },
      { columnIndex: 2, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 3, headerName: 'Last Name', mappedTo: 'lastName' }
    ];

    expect(extractMatchNameFromCells(['stu-1', '   ', 'Alice', 'Smith'], mappings)).toBe(
      'Alice Smith'
    );
  });

  it('combines first and last names when no display name is mapped', () => {
    const mappings: ColumnMapping[] = [
      { columnIndex: 0, headerName: 'Student ID', mappedTo: 'studentId' },
      { columnIndex: 1, headerName: 'First Name', mappedTo: 'firstName' },
      { columnIndex: 2, headerName: 'Last Name', mappedTo: 'lastName' }
    ];

    expect(extractMatchNameFromCells(['stu-1', 'Alice', 'Smith'], mappings)).toBe('Alice Smith');
    expect(extractMatchNameFromCells(['stu-1', 'Alice', ''], mappings)).toBe('Alice');
  });
});
