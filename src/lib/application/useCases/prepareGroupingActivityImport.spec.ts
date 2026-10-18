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
