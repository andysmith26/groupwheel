import { describe, expect, it } from 'vitest';
import { prepareChoices, prepareRoster } from './prepareGroupingActivityImport';

describe('prepareGroupingActivityImport', () => {
  it('parses a simple pasted name list', () => {
    const result = prepareRoster('Alice Smith\nBob Jones');
    expect(result.students.map((s) => s.displayName)).toEqual(['Alice Smith', 'Bob Jones']);
  });

  it('uses the mapped student ID for imported roster rows', () => {
    const result = prepareRoster('First Name,Last Name,Student ID\nAlice,Smith,ALICE-15');

    expect(result.students[0].id).toBe('alice-15');
    expect(result.rowStudentLinks).toEqual([{ rowIndex: 2, studentId: 'alice-15' }]);
  });

  it('preserves values from multiple mapped tag columns', () => {
    const result = prepareRoster(
      'First Name,Student Grade Level,Preferred Name,Last Name,Gender\nAgnes,7th Grade,Aggie,Abbott,Female',
      [
        { columnIndex: 0, headerName: 'First Name', mappedTo: 'firstName' },
        { columnIndex: 1, headerName: 'Student Grade Level', mappedTo: 'tags' },
        { columnIndex: 2, headerName: 'Preferred Name', mappedTo: 'preferredName' },
        { columnIndex: 3, headerName: 'Last Name', mappedTo: 'lastName' },
        { columnIndex: 4, headerName: 'Gender', mappedTo: 'tags' }
      ]
    );

    expect(result.students[0]).toMatchObject({
      firstName: 'Agnes',
      preferredName: 'Aggie',
      lastName: 'Abbott',
      rawTags: ['7th Grade', 'Female']
    });
  });

  it('matches partial choices to the roster and derives group names', () => {
    const roster = prepareRoster('First Name,Last Name\nAlice,Smith\nBob,Jones\nCy,Lee');
    const choices = prepareChoices(
      'First Name,Last Name,1st Choice,2nd Choice\nAlice,Smith,Chess,Art\nZed,Nobody,Art,',
      roster.students
    );
    expect(choices.error).toBeUndefined();
    expect(choices.coveredCount).toBe(1);
    expect(choices.groupNames).toEqual(['Art', 'Chess']);
    expect(choices.unmatchedNames).toEqual(['Zed Nobody']);
  });
});
