import { describe, expect, it } from 'vitest';

import { parseRosterFromMappedData, parseRosterFromPaste } from './rosterImport';

describe('parseRosterFromPaste', () => {
  it('parses tab-separated First, Last, ID rows without a header', () => {
    const result = parseRosterFromPaste(['Alice\tAnderson\tA-100', 'Bob\tBrown\tB-200'].join('\n'));

    expect(result.studentOrder).toEqual(['a-100', 'b-200']);
    expect(result.studentsById['a-100']).toMatchObject({
      id: 'a-100',
      firstName: 'Alice',
      lastName: 'Anderson',
      meta: { sourceStudentId: 'A-100' }
    });
    expect(result.studentsById['b-200']).toMatchObject({
      id: 'b-200',
      firstName: 'Bob',
      lastName: 'Brown',
      meta: { sourceStudentId: 'B-200' }
    });
  });

  it('uses a reviewed mapping when parsing pasted table data', () => {
    const result = parseRosterFromMappedData(
      {
        headers: ['Given', 'Family', 'School email'],
        rows: [
          { rowIndex: 2, cells: ['Alice', 'Anderson', 'alice@example.edu'] },
          { rowIndex: 3, cells: ['Bob', 'Brown', 'bob@example.edu'] }
        ]
      },
      [
        { columnIndex: 0, headerName: 'Given', mappedTo: 'firstName' },
        { columnIndex: 1, headerName: 'Family', mappedTo: 'lastName' },
        { columnIndex: 2, headerName: 'School email', mappedTo: 'studentId' }
      ]
    );

    expect(result.studentOrder).toEqual(['alice@example.edu', 'bob@example.edu']);
    expect(result.studentsById['alice@example.edu']).toMatchObject({
      firstName: 'Alice',
      lastName: 'Anderson',
      meta: { sourceStudentId: 'alice@example.edu' }
    });
  });

  it('preserves a preferred-name column selected in the reviewed mapping', () => {
    const result = parseRosterFromMappedData(
      {
        headers: ['Given', 'Preferred', 'Family', 'School email'],
        rows: [{ rowIndex: 2, cells: ['Alexander', 'Alex', 'Anderson', 'alex@example.edu'] }]
      },
      [
        { columnIndex: 0, headerName: 'Given', mappedTo: 'firstName' },
        { columnIndex: 1, headerName: 'Preferred', mappedTo: 'preferredName' },
        { columnIndex: 2, headerName: 'Family', mappedTo: 'lastName' },
        { columnIndex: 3, headerName: 'School email', mappedTo: 'studentId' }
      ]
    );

    expect(result.studentsById['alex@example.edu']).toMatchObject({
      firstName: 'Alexander',
      preferredName: 'Alex',
      lastName: 'Anderson'
    });
  });

  it('returns raw tag names separately while student records keep empty tagIds', () => {
    const result = parseRosterFromMappedData(
      {
        headers: ['Given', 'Tags', 'School email'],
        rows: [{ rowIndex: 2, cells: ['Alex', 'Honors; ELL', 'alex@example.edu'] }]
      },
      [
        { columnIndex: 0, headerName: 'Given', mappedTo: 'firstName' },
        { columnIndex: 1, headerName: 'Tags', mappedTo: 'tags' },
        { columnIndex: 2, headerName: 'School email', mappedTo: 'studentId' }
      ]
    );

    expect(result.studentsById['alex@example.edu'].tagIds).toEqual([]);
    expect(result.rawTagsByStudentId['alex@example.edu']).toEqual(['Honors', 'ELL']);
  });
});
